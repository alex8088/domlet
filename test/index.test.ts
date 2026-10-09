import { describe, expect, it } from 'vitest'
import { h } from '../src/index'

describe('h selectors', () => {
  it.each(['', '.panel', '#container'])('defaults %j to a div', (selector) => {
    expect(h(selector).root).toBeInstanceOf(HTMLDivElement)
  })

  it('creates an element with an id, classes and a named reference', () => {
    const result = h('input#search.box.active@field', { value: 'text', type: 'text' })

    expect(result.root).toBeInstanceOf(HTMLInputElement)
    expect(result.field).toBe(result.root)
    expect(result.root.id).toBe('search')
    expect(Array.from(result.root.classList)).toEqual(['box', 'active'])
    expect(result.field.value).toBe('text')
    expect(result.field.type).toBe('text')
  })

  it('supports implicit tags and merges selector classes with className', () => {
    const { panel, root } = h('.panel@panel', { className: '.active..wide.' })

    expect(panel).toBe(root)
    expect(root).toBeInstanceOf(HTMLDivElement)
    expect(Array.from(root.classList)).toEqual(['panel', 'active', 'wide'])
  })

  it('returns only the root for an unnamed element', () => {
    expect(Object.keys(h('button'))).toEqual(['root'])
    expect(Object.keys(h('input@root'))).toEqual(['root'])
  })
})

describe('h children and references', () => {
  it('supports text shorthand with and without attributes', () => {
    const plain = h('button@save', '保存')
    const attributed = h('button@save', { tabIndex: 0 }, '保存')

    expect(plain.save.textContent).toBe('保存')
    expect(attributed.save.textContent).toBe('保存')
    expect(attributed.save.tabIndex).toBe(0)
    expect(h('div', '').root.textContent).toBe('')
    expect(h('div', {}, '').root.textContent).toBe('')
  })

  it('keeps zero and empty text children while ignoring null and undefined', () => {
    const { root } = h('div', [0, '', null, undefined, 'text'])

    expect(root.textContent).toBe('0text')
    expect(Array.from(root.childNodes).map((node) => node.textContent)).toEqual(['0', '', 'text'])
  })

  it('inserts DOM nodes and fragment contents in order without cloning', () => {
    const text = document.createTextNode('text')
    const comment = document.createComment('comment')
    const fragment = document.createDocumentFragment()
    const span = document.createElement('span')
    fragment.append(span)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const input = h('input@field')
    const { root, field } = h('div', [text, comment, fragment, svg, input])

    expect(Array.from(root.childNodes)).toEqual([text, comment, span, svg, input.root])
    expect(field).toBe(input.root)
    expect(fragment.childNodes.length).toBe(0)
  })

  it('collects nested references while keeping each parent root', () => {
    const input = h('input@field')
    const parent = h('div@container', ['label', input])
    const nested = h('section', { title: 'form' }, [parent])

    expect(nested.root.tagName).toBe('SECTION')
    expect(nested.root.title).toBe('form')
    expect(nested.container).toBe(parent.root)
    expect(nested.field).toBe(input.root)
    expect(nested.root.firstChild).toBe(parent.root)
    expect(parent.root.lastChild).toBe(input.root)
  })

  it('lets the last named child overwrite earlier and parent references', () => {
    const first = h('input@same')
    const last = h('button@same')
    const result = h('div@same', [first, last])

    expect(result.same).toBe(last.root)
    expect(result.root).toBeInstanceOf(HTMLDivElement)
    expect(Array.from(result.root.children)).toEqual([first.root, last.root])
  })

  it('preserves the parent root when a child is named root', () => {
    const child = h('input@root')
    const result = h('div@root', [child])

    expect(result.root).toBeInstanceOf(HTMLDivElement)
    expect(result.root.firstChild).toBe(child.root)
    expect(Object.keys(result)).toEqual(['root'])
  })

  it.each([true, false])(
    'merges only references present in conditional children (%s)',
    (condition) => {
      const input = h('input@field')
      const button = h('button@field')
      const optional = h('div', [condition ? button : undefined])
      const result = h('section', [input, optional])

      expect(result.field).toBe(condition ? button.root : input.root)
      expect('field' in optional).toBe(condition)
      expect(optional.root.children.length).toBe(condition ? 1 : 0)
    }
  )

  it.each([true, false])('collects references from dynamic spread groups (%s)', (condition) => {
    const inputs = [1, 2].map((id) => h('input@field', { value: String(id) }))
    const save = h('button@save', '保存')
    const result = h('div', [...inputs.filter(() => condition), save])

    expect(result.field).toBe(condition ? inputs[1].root : undefined)
    expect(result.save).toBe(save.root)
    expect(Array.from(result.root.children)).toEqual([
      ...(condition ? inputs.map((input) => input.root) : []),
      save.root
    ])
  })
})

describe('h attributes', () => {
  it('serializes custom attributes and skips undefined values', () => {
    const { root } = h('button', {
      action: 'save',
      'data-id': 1,
      'aria-hidden': 'false',
      title: undefined
    })

    expect(root.getAttribute('action')).toBe('save')
    expect(root.getAttribute('data-id')).toBe('1')
    expect(root.getAttribute('aria-hidden')).toBe('false')
    expect(root.hasAttribute('title')).toBe(false)
  })

  it('serializes dataset values and converts camelCase keys', () => {
    const { root } = h('div', {
      dataset: { itemId: 1, enabled: false, empty: null, missing: undefined }
    })

    expect({ ...root.dataset }).toEqual({ itemId: '1', enabled: 'false', empty: 'null' })
    expect(root.hasAttribute('data-missing')).toBe(false)
  })

  it('sets CSS properties from strings and skips undefined values', () => {
    const { root } = h('div', {
      style: {
        width: '12px',
        opacity: '0.5',
        lineHeight: '1.5',
        zIndex: '10',
        marginTop: undefined
      }
    })

    expect(root.style.width).toBe('12px')
    expect(root.style.opacity).toBe('0.5')
    expect(root.style.getPropertyValue('line-height')).toBe('1.5')
    expect(root.style.zIndex).toBe('10')
    expect(root.style.marginTop).toBe('')
    expect(h('div', { style: undefined }).root.hasAttribute('style')).toBe(false)
  })

  it('sets native tabIndex, htmlFor and length attributes', () => {
    const label = h('label', { htmlFor: 'field', tabIndex: 0 }, 'Label')
    const input = h('input', { maxLength: 10, minLength: 0 })
    const textarea = h('textarea', { maxLength: undefined, minLength: 0 })

    expect(label.root.htmlFor).toBe('field')
    expect(label.root.getAttribute('for')).toBe('field')
    expect(label.root.tabIndex).toBe(0)
    expect(input.root.maxLength).toBe(10)
    expect(input.root.minLength).toBe(0)
    expect(input.root.hasAttribute('max-length')).toBe(false)
    expect(textarea.root.hasAttribute('maxlength')).toBe(false)
    expect(textarea.root.minLength).toBe(0)
  })

  it.each(['disabled', 'checked', 'selected', 'required', 'multiple', 'readOnly'] as const)(
    'sets %s only when true',
    (attribute) => {
      const enabled = h('input', { [attribute]: true }).root
      const disabled = h('input', { [attribute]: false }).root

      expect(enabled.getAttribute(attribute.toLowerCase())).toBe('')
      expect(disabled.hasAttribute(attribute.toLowerCase())).toBe(false)
    }
  )

  it('serializes custom booleans as text', () => {
    const { root } = h('div', { customFlag: false })

    expect(root.getAttribute('custom-flag')).toBe('false')
  })

  it('appends innerText as literal text after existing children', () => {
    const { root } = h('div', { innerText: '<b>tail</b>' }, ['head'])

    expect(root.textContent).toBe('head<b>tail</b>')
    expect(root.querySelector('b')).toBeNull()
  })

  it('applies innerHTML after inserting children', () => {
    const { root } = h('div', { innerHTML: '<strong>replacement</strong>' }, ['original'])

    expect(root.textContent).toBe('replacement')
    expect(root.firstElementChild?.tagName).toBe('STRONG')
  })
})
