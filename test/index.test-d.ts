import { describe, expectTypeOf, it } from 'vitest'
import { h } from '../src/index'
import type { Child, ElementResult } from '../src/index'

// These files are checked by TypeScript, never executed as runtime tests.
declare const condition: boolean
declare const element: HTMLElement

describe('h types', () => {
  it('defaults element results to HTMLElement and accepts a specific element', () => {
    expectTypeOf<ElementResult>().toEqualTypeOf<{ root: HTMLElement }>()
    expectTypeOf<ElementResult<HTMLInputElement>>().toEqualTypeOf<{ root: HTMLInputElement }>()
  })

  it('infers named elements and nested references', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    expectTypeOf(input.field).toEqualTypeOf<HTMLInputElement>()
    expectTypeOf(input.root).toEqualTypeOf<HTMLInputElement>()

    const parent = h('div@container', ['label', input, undefined, element])
    expectTypeOf(parent.root).toEqualTypeOf<HTMLDivElement>()
    expectTypeOf(parent.field).toEqualTypeOf<HTMLInputElement>()
    expectTypeOf(parent.container).toEqualTypeOf<HTMLDivElement>()
    const nested = h('section', [parent])
    expectTypeOf(nested.field).toEqualTypeOf<HTMLInputElement>()
    expectTypeOf(nested.root).toEqualTypeOf<HTMLElement>()
  })

  it('keeps conditional references optional through parents', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    const optional = h('div', [condition ? input : undefined])
    expectTypeOf(optional.field).toEqualTypeOf<HTMLInputElement | undefined>()
    const optionalParent = h('div', [optional])
    expectTypeOf(optionalParent.field).toEqualTypeOf<HTMLInputElement | undefined>()
  })

  it('uses the last present reference and preserves the parent root', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    const duplicate = h('div@same', [h('input@same'), h('button@same')])
    expectTypeOf(duplicate.same).toEqualTypeOf<HTMLButtonElement>()
    expectTypeOf(duplicate.root).toEqualTypeOf<HTMLDivElement>()
    const optionalDuplicate = h('div', [input, condition ? h('button@field') : undefined])
    expectTypeOf(optionalDuplicate.field).toEqualTypeOf<HTMLInputElement | HTMLButtonElement>()
    const rootName = h('div', [h('input@root')])
    expectTypeOf(rootName.root).toEqualTypeOf<HTMLDivElement>()
  })

  it('infers references in dynamic, variadic and readonly children', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    const optional = h('div', [condition ? input : undefined])
    const dynamic = h(
      'div',
      [input].filter(() => condition)
    )
    expectTypeOf(dynamic.field).toEqualTypeOf<HTMLInputElement | undefined>()
    const spread = h('div', [h('button@button'), ...[input].filter(() => condition)])
    expectTypeOf(spread.button).toEqualTypeOf<HTMLButtonElement>()
    expectTypeOf(spread.field).toEqualTypeOf<HTMLInputElement | undefined>()
    const trailing = h('div', [...[input].filter(() => condition), h('button@button')])
    expectTypeOf(trailing.button).toEqualTypeOf<HTMLButtonElement>()
    expectTypeOf(trailing.field).toEqualTypeOf<HTMLInputElement | undefined>()
    const alternatives = h('div', [condition ? input : h('button@button')])
    expectTypeOf(alternatives.field).toEqualTypeOf<HTMLInputElement | undefined>()
    expectTypeOf(alternatives.button).toEqualTypeOf<HTMLButtonElement | undefined>()
    const wrappedOverwrite = h('div', [h('button@field'), optional])
    expectTypeOf(wrappedOverwrite.field).toEqualTypeOf<HTMLInputElement | HTMLButtonElement>()
    const dynamicOverwrite = h('div', [h('button@field'), ...[input].filter(() => condition)])
    expectTypeOf(dynamicOverwrite.field).toEqualTypeOf<HTMLInputElement | HTMLButtonElement>()
    const readonly = h('div', [input] as const)
    expectTypeOf(readonly.field).toEqualTypeOf<HTMLInputElement>()
  })

  it('infers selector shorthand, union tags and dynamic tags', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    const empty = h('')
    const implicit = h('.panel@panel')
    const id = h('input#search.box@search', { value: 'text' })
    expectTypeOf(empty.root).toEqualTypeOf<HTMLDivElement>()
    expectTypeOf(implicit.panel).toEqualTypeOf<HTMLDivElement>()
    expectTypeOf(id.search).toEqualTypeOf<HTMLInputElement>()
    const namedRoot = h('input@root')
    expectTypeOf<keyof typeof namedRoot>().toEqualTypeOf<'root'>()
    expectTypeOf(namedRoot.root).toEqualTypeOf<HTMLInputElement>()
    const unionTag = h(condition ? 'input@field' : 'button@field')
    expectTypeOf(unionTag.field).toEqualTypeOf<HTMLInputElement | HTMLButtonElement>()
    expectTypeOf(unionTag.root).toEqualTypeOf<HTMLInputElement | HTMLButtonElement>()
    const unnamed = h(condition ? 'input' : 'button')
    expectTypeOf(unnamed).toEqualTypeOf<{ root: HTMLInputElement | HTMLButtonElement }>()
    const dynamicTag: string = condition ? 'input' : 'button'
    const unknownElement = h(dynamicTag)
    expectTypeOf(unknownElement.root).toEqualTypeOf<HTMLElement>()
    const withAttributes = h('div', { title: 'title' }, ['label', input])
    expectTypeOf(withAttributes.field).toEqualTypeOf<HTMLInputElement>()
  })

  it('accepts broadly typed element results as children', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    const parent = h('div@container', ['label', input, undefined, element])
    const optional = h('div', [condition ? input : undefined])
    const children: Child[] = [parent, optional]
    const result: ElementResult = h('div', children)
    expectTypeOf(result.root).toEqualTypeOf<HTMLElement>()
  })

  it('supports text shorthand with and without attributes', () => {
    const text = h('button@save', '保存')
    expectTypeOf(text.save).toEqualTypeOf<HTMLButtonElement>()
    expectTypeOf(text.root).toEqualTypeOf<HTMLButtonElement>()
    const textWithAttributes = h('button@save', { tabIndex: 0 }, '保存')
    expectTypeOf(textWithAttributes.save).toEqualTypeOf<HTMLButtonElement>()
    const textParent = h('div', [text])
    expectTypeOf(textParent.save).toEqualTypeOf<HTMLButtonElement>()
    h('div', '')
    h('div', {}, '')
  })

  it('infers nullable and conditional scalar children', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    const conditional = h('div', [condition ? input : null, null, undefined, 0])
    expectTypeOf(conditional.field).toEqualTypeOf<HTMLInputElement | undefined>()
    expectTypeOf(conditional.root).toEqualTypeOf<HTMLDivElement>()
    const conditionalWithAttributes = h('div', { title: 'text' }, [condition ? input : null])
    expectTypeOf(conditionalWithAttributes.field).toEqualTypeOf<HTMLInputElement | undefined>()
    const title: string = condition ? 'Title' : ''
    const count: number = condition ? 1 : 0
    const conditionalText = h('div', [
      title ? h('h3@heading', title) : null,
      condition ? h('span@loading', '加载中') : null,
      count ? input : undefined
    ])
    expectTypeOf(conditionalText.heading).toEqualTypeOf<HTMLHeadingElement | undefined>()
    expectTypeOf(conditionalText.loading).toEqualTypeOf<HTMLSpanElement | undefined>()
    expectTypeOf(conditionalText.field).toEqualTypeOf<HTMLInputElement | undefined>()
    const conditionalOverwrite = h('div', [input, condition ? h('button@field') : null])
    expectTypeOf(conditionalOverwrite.field).toEqualTypeOf<HTMLInputElement | HTMLButtonElement>()
  })

  it('accepts scalar children but excludes booleans from Child', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    const scalarMix = h('div', [0, '', input, null, undefined])
    expectTypeOf(scalarMix.field).toEqualTypeOf<HTMLInputElement>()
    expectTypeOf<Extract<Child, boolean>>().toEqualTypeOf<never>()
    h('input', { dataset: { enabled: false } })
  })

  it('preserves native attribute and CSS property types', () => {
    const customAttributes: Record<string, string | number> = { action: 'save', 'data-id': 1 }
    const custom = h('button@save', customAttributes)
    expectTypeOf(custom.save).toEqualTypeOf<HTMLButtonElement>()
    h('button', { disabled: false, tabIndex: 0, 'aria-hidden': 'false', action: 'save' })
    const label = h('label@label', { htmlFor: 'field' }, 'Label')
    expectTypeOf(label.label).toEqualTypeOf<HTMLLabelElement>()
    const limitedInput = h('input@field', { maxLength: 10, minLength: 0 })
    expectTypeOf(limitedInput.field).toEqualTypeOf<HTMLInputElement>()
    h('textarea', { maxLength: undefined, minLength: 0 })
    const styled = h('div@panel', {
      style: {
        width: '12px',
        opacity: '0.5',
        lineHeight: '1.5',
        zIndex: '10',
        marginTop: undefined
      }
    })
    expectTypeOf(styled.panel).toEqualTypeOf<HTMLDivElement>()
    h('div', { style: undefined })
    // @ts-expect-error CSS length values require an explicit string with units.
    h('div', { style: { width: 12 } })
    // @ts-expect-error Unitless CSS values also use strings.
    h('div', { style: { opacity: 0.5 } })
    // @ts-expect-error htmlFor retains its native string type.
    h('label', { htmlFor: 123 })
    // @ts-expect-error maxLength retains its native number type.
    h('input', { maxLength: '10' })
    // @ts-expect-error minLength retains its native number type.
    h('textarea', { minLength: '0' })
  })

  it('infers references across conditional child arrays', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    const emptyChildren = h('div', [])
    expectTypeOf(emptyChildren.root).toEqualTypeOf<HTMLDivElement>()
    h('div', condition ? ['text'] : [h('span')])
    h('div', condition ? [h('span')] : [])
    h('div', {}, condition ? ['text'] : [h('span')])
    const conditionalArray = h('div', condition ? [input] : [])
    expectTypeOf(conditionalArray.field).toEqualTypeOf<HTMLInputElement | undefined>()
    const arrayAlternatives = h('div', condition ? [input] : [h('button@save')])
    expectTypeOf(arrayAlternatives.field).toEqualTypeOf<HTMLInputElement | undefined>()
    expectTypeOf(arrayAlternatives.save).toEqualTypeOf<HTMLButtonElement | undefined>()
    const arrayOverwrite = h('div@field', condition ? [input] : [])
    expectTypeOf(arrayOverwrite.field).toEqualTypeOf<HTMLDivElement | HTMLInputElement>()
    const arrayWithAttributes = h('div', { title: 'title' }, condition ? [input] : [])
    expectTypeOf(arrayWithAttributes.field).toEqualTypeOf<HTMLInputElement | undefined>()
  })

  it('supports spread groups and insertable DOM nodes but rejects nested arrays', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    const mapped = h('div', [h('h3@heading', '标题'), ...[1, 2].map(() => input)])
    expectTypeOf(mapped.heading).toEqualTypeOf<HTMLHeadingElement>()
    expectTypeOf(mapped.field).toEqualTypeOf<HTMLInputElement | undefined>()
    const conditionalGroup = h('div', [...(condition ? [input] : []), h('button@save')])
    expectTypeOf(conditionalGroup.field).toEqualTypeOf<HTMLInputElement | undefined>()
    expectTypeOf(conditionalGroup.save).toEqualTypeOf<HTMLButtonElement>()
    const readonlyGroup = [input, h('button@save')] as const
    const spreadWithAttributes = h('div', { title: 'title' }, [...readonlyGroup])
    expectTypeOf(spreadWithAttributes.field).toEqualTypeOf<HTMLInputElement>()
    expectTypeOf(spreadWithAttributes.save).toEqualTypeOf<HTMLButtonElement>()
    const domNodes = h('div', [
      document.createTextNode('text'),
      document.createComment('comment'),
      document.createDocumentFragment(),
      document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
      input
    ])
    expectTypeOf(domNodes.field).toEqualTypeOf<HTMLInputElement>()
    // @ts-expect-error An array is not a child; spread it into the children list.
    const arrayChild: Child = [input]
    void arrayChild
    // @ts-expect-error The children overload must reject nested arrays.
    h('div', {}, [[input]])
    // @ts-expect-error Nested arrays must not fall back to the attributes overload.
    h('div', [[input]])
    // @ts-expect-error Readonly nested arrays must also be rejected.
    h('div', [[input]] as const)
    const nestedArray = [[input]]
    // @ts-expect-error Array variables must not fall back to the attributes overload.
    h('div', nestedArray)
    // @ts-expect-error Arrays cannot be used as attributes with a third argument.
    h('div', [input], 'text')
    // @ts-expect-error A Document is not an insertable child of an HTML element.
    const documentChild: Child = document
    void documentChild
  })

  it('rejects boolean children and boolean arrays', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    // @ts-expect-error Boolean values are not children; use a ternary with null/undefined.
    const booleanChild: Child = false
    void booleanChild
    // @ts-expect-error The children overload must reject a boolean condition result.
    h('div', {}, [condition && input])
    // @ts-expect-error Literal boolean children are also unsupported.
    h('div', {}, [true])
    // @ts-expect-error Boolean children must not fall back to the attributes overload.
    h('div', [false])
    // @ts-expect-error True is also not a supported child.
    h('div', [true])
    // @ts-expect-error Boolean condition results require a ternary with null/undefined.
    h('div', [condition && input])
    // @ts-expect-error Readonly boolean children must also be rejected.
    h('div', [false] as const)
    const booleanChildren: boolean[] = [condition]
    // @ts-expect-error Boolean array variables must also be rejected.
    h('div', booleanChildren)
  })

  it('rejects invalid attributes and child properties on parent roots', () => {
    const input = h('input@field', { value: 'text', type: 'text' })
    const parent = h('div@container', ['label', input, undefined, element])
    // @ts-expect-error Text shorthand preserves native attribute type checks.
    h('button', { tabIndex: '0' }, '保存')

    // @ts-expect-error Named input attributes must retain the input value type.
    h('input@field', { value: 123 })
    // @ts-expect-error Also check the attributes + children overload.
    h('input@field', { value: 123 }, [])
    // @ts-expect-error Known properties must still be checked for plain tags.
    h('input', { value: 123 })
    // @ts-expect-error Parent roots must not acquire properties of child inputs.
    void parent.root.value
  })
})
