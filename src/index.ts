/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type, no-useless-escape */

/** Base shape of an element-building result; h() also infers named references. */
export type ElementResult<T extends HTMLElement = HTMLElement> = { root: T }

export type Child =
  Element | CharacterData | DocumentFragment | string | number | ElementResult | null | undefined

type DatasetValue = string | number | boolean | null | undefined

type DatasetAttributes = {
  [key: string]: DatasetValue
}

type PartialElementAttributes<T> = Partial<{
  [K in keyof T]: K extends 'dataset'
    ? DatasetAttributes
    : T[K] extends Function
      ? never
      : T[K] extends object
        ? PartialElementAttributes<T[K]>
        : T[K]
}>

// Arrays must match the children overload, not fall back to attributes.
type ElementAttributes<T> = PartialElementAttributes<T> &
  Record<string, any> & { [Symbol.iterator]?: never }

type Simplify<T> = { [K in keyof T]: T[K] }

type EmptyRefs = Record<never, never>

type UnionKeys<T> = T extends unknown ? keyof T : never

type UnionValue<T, K extends PropertyKey> = T extends unknown
  ? K extends keyof T
    ? T[K]
    : never
  : never

type RequiredKeys<T> = {
  [K in keyof T]-?: T extends Record<K, unknown> ? K : never
}[keyof T]

type ElementTagMap = HTMLElementTagNameMap & { '': HTMLDivElement }

type TagToElement<T> = T extends `${infer Tag}@${string}`
  ? TagToElement<Tag>
  : T extends `${infer Tag}#${string}`
    ? TagToElement<Tag>
    : T extends `${infer Tag}.${string}`
      ? TagToElement<Tag>
      : T extends keyof ElementTagMap
        ? ElementTagMap[T]
        : HTMLElement

// Extract only named references. The current element's root is added by HResult.
type TagRefs<TTag> = Record<
  TTag extends `${string}@${infer TRef}` ? Exclude<TRef, 'root'> : never,
  TagToElement<TTag>
>

// References absent from some branches are optional.
type NormalizeRefs<T> = Simplify<
  { [K in UnionKeys<T> as [T] extends [Record<K, unknown>] ? K : never]: UnionValue<T, K> } & {
    [K in UnionKeys<T> as [T] extends [Record<K, unknown>] ? never : K]?: UnionValue<T, K>
  }
>

type ChildRefs<T> = T extends ElementResult
  ? string extends keyof T
    ? EmptyRefs
    : Omit<T, 'root'>
  : EmptyRefs

type MergedRefValue<A, B, K extends PropertyKey> =
  K extends RequiredKeys<B> ? UnionValue<B, K> : UnionValue<A, K> | UnionValue<B, K>

// Match Object.assign without expanding every combination of optional children.
type MergeRefs<A, B> = keyof B extends never
  ? A
  : keyof A extends never
    ? B
    : Simplify<
        {
          [K in RequiredKeys<A> | RequiredKeys<B>]: Exclude<MergedRefValue<A, B, K>, undefined>
        } & {
          [K in Exclude<keyof A | keyof B, RequiredKeys<A> | RequiredKeys<B>>]?: MergedRefValue<
            A,
            B,
            K
          >
        }
      >

type CollectChildRefs<
  TChildren extends readonly Child[],
  TRefs = EmptyRefs
> = TChildren extends readonly [infer Head extends Child, ...infer Tail extends readonly Child[]]
  ? CollectChildRefs<Tail, MergeRefs<TRefs, NormalizeRefs<ChildRefs<Head>>>>
  : TChildren extends readonly [...infer Init extends readonly Child[], infer Last extends Child]
    ? MergeRefs<CollectChildRefs<Init, TRefs>, NormalizeRefs<ChildRefs<Last>>>
    : TChildren extends readonly []
      ? TRefs
      : MergeRefs<TRefs, Partial<NormalizeRefs<ChildRefs<TChildren[number]>>>>

type HResult<TTag, TChildren extends readonly Child[] = []> = NormalizeRefs<
  CollectChildRefs<TChildren, TagRefs<TTag>> & ElementResult<TagToElement<TTag>>
>

const H_REGEX =
  /(?<tag>[\w\-]+)?(?:#(?<id>[\w\-]+))?(?<class>(?:\.(?:[\w\-]+))*)(?:@(?<name>(?:[\w\_])+))?/

const BOOLEAN_ATTRIBUTES = new Set([
  'disabled',
  'checked',
  'selected',
  'required',
  'multiple',
  'readOnly'
])

function camelCaseToHyphenCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * A helper function to create nested dom nodes.
 *
 * ```ts
 * const elements = h('div.code-view', [
 * 	h('div.title@title'),
 * 	h('div.container', [
 * 		h('div.gutter@gutterDiv'),
 * 		h('div@editor'),
 * 	]),
 * ]);
 * const editor = createEditor(elements.editor);
 * ```
 */
export function h<TTag extends string>(tag: TTag): HResult<TTag>

export function h<TTag extends string>(tag: TTag, text: string): HResult<TTag>

export function h<TTag extends string, const TChildren extends readonly Child[]>(
  tag: TTag,
  children: TChildren
): HResult<TTag, TChildren>

export function h<TTag extends string>(
  tag: TTag,
  attributes: ElementAttributes<TagToElement<TTag>>
): HResult<TTag>

export function h<TTag extends string>(
  tag: TTag,
  attributes: ElementAttributes<TagToElement<TTag>>,
  text: string
): HResult<TTag>

export function h<TTag extends string, const TChildren extends readonly Child[]>(
  tag: TTag,
  attributes: ElementAttributes<TagToElement<TTag>>,
  children: TChildren
): HResult<TTag, TChildren>

export function h(
  tag: string,
  ...args:
    | []
    | [
        attributes: ElementAttributes<HTMLElement> | Record<string, any>,
        children?: readonly any[] | string
      ]
    | [children: readonly any[] | string]
): Record<string, HTMLElement> {
  let attributes: ElementAttributes<HTMLElement>
  let children: readonly Child[] | undefined

  if (typeof args[0] === 'string') {
    attributes = {}
    children = [args[0]]
  } else if (Array.isArray(args[0])) {
    attributes = {}
    children = args[0]
  } else {
    attributes = (args[0] as any) || {}
    children = typeof args[1] === 'string' ? [args[1]] : args[1]
  }

  const match = H_REGEX.exec(tag)

  if (!match || !match.groups) {
    throw new Error('Bad use of h')
  }

  const tagName = match.groups['tag'] || 'div'
  const el = document.createElement(tagName)

  if (match.groups['id']) {
    el.id = match.groups['id']
  }

  const classNames: string[] = []
  if (match.groups['class']) {
    for (const className of match.groups['class'].split('.')) {
      if (className !== '') {
        classNames.push(className)
      }
    }
  }
  if (attributes.className !== undefined) {
    for (const className of attributes.className.split('.')) {
      if (className !== '') {
        classNames.push(className)
      }
    }
  }
  if (classNames.length > 0) {
    el.className = classNames.join(' ')
  }

  const result: Record<string, HTMLElement> = {}

  if (match.groups['name']) {
    result[match.groups['name']] = el
  }

  if (children) {
    for (const child of children) {
      if (child == null) continue
      if (child instanceof Node) {
        el.appendChild(child)
      } else if (typeof child !== 'object') {
        el.append(String(child))
      } else if ('root' in child) {
        Object.assign(result, child)
        el.appendChild(child.root)
      }
    }
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || key === 'className') continue

    if (key === 'dataset') {
      for (const [key, val] of Object.entries(value as DatasetAttributes)) {
        if (val !== undefined) {
          el.setAttribute(`data-${camelCaseToHyphenCase(key)}`, String(val))
        }
      }
    } else if (key === 'style') {
      for (const [cssKey, cssValue] of Object.entries(value)) {
        if (cssValue === undefined) continue
        el.style.setProperty(camelCaseToHyphenCase(cssKey), String(cssValue))
      }
    } else if (key === 'innerText') {
      el.append(value)
    } else if (key === 'innerHTML') {
      el.innerHTML = value
    } else if (key === 'tabIndex') {
      el.tabIndex = value
    } else if (key === 'htmlFor') {
      el.setAttribute('for', String(value))
    } else if (key === 'maxLength' || key === 'minLength') {
      el.setAttribute(key.toLowerCase(), String(value))
    } else if (typeof value === 'boolean' && BOOLEAN_ATTRIBUTES.has(key)) {
      if (value) {
        el.setAttribute(key.toLowerCase(), '')
      }
    } else {
      el.setAttribute(camelCaseToHyphenCase(key), String(value))
    }
  }

  result['root'] = el

  return result
}
