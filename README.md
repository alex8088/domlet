# domlet

A tiny, dependency-free DOM builder with CSS selector syntax, nested elements, and typed element references.

## Install

```sh
npm i domlet
```

## Quick start

Use `h()` in a browser or another environment that provides a DOM:

```ts
import { h } from 'domlet'

const form = h('form.profile@form', [
  h('label', { htmlFor: 'name' }, 'Name'),
  h('input#name@name', { type: 'text', placeholder: 'Your name' }),
  h('button.primary@save', { type: 'submit' }, 'Save')
])

form.form.addEventListener('submit', (event) => {
  event.preventDefault()
  console.log(form.name.value)
})

document.body.append(form.root)
```

Every call creates an element and returns an object containing `root` and any named references. The element is attached to the document when you append it.

## Usage

### Call forms

The second argument can be attributes, text, or an array of children. When passing attributes, put text or children in the third argument.

```ts
h('div')
h('p', 'Hello')
h('div', [h('span', 'Hello'), ' world'])
h('input', { type: 'text', value: 'Hello' })
h('button', { type: 'button' }, 'Save')
h('div', { title: 'Greeting' }, [h('span', 'Hello')])
```

### Selector shorthand

Write selectors in this order: `tag#id.class1.class2@reference`. Each part is optional; omitting the tag creates a `div`.

| Selector                 | Result                                          |
| ------------------------ | ----------------------------------------------- |
| `button`                 | A button                                        |
| `input#search`           | An input with `id="search"`                     |
| `div.panel.active`       | A div with classes `panel` and `active`         |
| `.panel@panel`           | A div available as both `root` and `panel`      |
| `input#search.box@field` | An input with an ID, class, and named reference |
| `''`                     | A div                                           |

This shorthand creates one HTML element. Use nested `h()` calls to build a hierarchy.

### Named references

Add `@name` to access an element directly. References from nested results are collected into their parent's result, so you can use them without querying the DOM.

```ts
const view = h('div@container', [
  h('header', [h('h1@title', 'Profile')]),
  h('input@field', { value: 'Alex' })
])

view.container === view.root // true
view.title.textContent = 'Edit profile'
view.field.focus()
```

If a name appears more than once, the last present child reference wins, including over the parent's own named reference. `root` always points to the element created by the current call.

```ts
const first = h('input@field')
const last = h('button@field', 'Save')
const view = h('div@field', [first, last])

view.field === last.root // true
view.root.tagName // 'DIV'
```

### Attributes

Pass an object to set attributes. Native attribute types are inferred from the tag, and custom attributes such as `aria-label` and `data-id` are also accepted.

```ts
const field = h('input#name@field', {
  type: 'text',
  value: 'Alex',
  maxLength: 40,
  required: true,
  disabled: false,
  tabIndex: 0,
  'aria-label': 'Name',
  dataset: { userId: 42, editable: false },
  style: { width: '240px', marginTop: '8px', opacity: '0.8' }
})

field.field.value // 'Alex'
field.field.dataset.userId // '42'
field.field.dataset.editable // 'false'
```

- `undefined` values are skipped, including inside `dataset` and `style`.
- `dataset` keys become `data-*` attributes; values are converted to strings.
- `style` accepts CSS values as strings, including unitless values such as opacity. Camel-case keys such as `marginTop` become `margin-top`.
- `disabled`, `checked`, `selected`, `required`, `multiple`, and `readOnly` are added when `true` and omitted when `false`.
- `htmlFor`, `maxLength`, `minLength`, and `tabIndex` use their corresponding native HTML attributes or properties.
- `className` is merged with selector classes and also accepts dot-separated classes: `h('div.panel', { className: 'active.wide' })`.

Ordinary attribute names are converted from camel case to hyphenated names, and their values are converted to strings. `innerText` appends literal text after the children; `innerHTML` replaces the element's contents after the children are inserted.

Attach event listeners through the returned references:

```ts
const button = h('button@save', { type: 'button' }, 'Save')
button.save.addEventListener('click', () => console.log('Saved'))
```

### Children and conditional content

Children can be `h()` results, existing elements, text or comment nodes, document fragments, strings, numbers, `null`, or `undefined`.

```ts
const showHint: boolean = Math.random() > 0.5
const items = ['One', 'Two']
const existing = document.createElement('hr')

const view = h('div', [
  'Items: ',
  items.length,
  existing,
  showHint ? h('p@hint', 'Choose an item') : null,
  h(
    'ul',
    items.map((item) => h('li', item))
  )
])

view.hint?.remove()
```

`null` and `undefined` are ignored; `0` and empty strings are kept as text. Existing DOM nodes are moved into the new parent without cloning.

Use a ternary returning `null` or `undefined` for conditional children, since booleans are not supported. Spread child arrays into the list instead of nesting arrays:

```ts
const visible: boolean = Math.random() > 0.5
const rows = ['One', 'Two'].map((text) => h('li', text))

h('ul', [visible ? h('li', 'Heading') : null, ...rows])
```

### TypeScript

Literal selectors infer native element types, including named references from children:

```ts
const view = h('div@panel', [h('input@field'), h('button@save', 'Save')])

view.root // HTMLDivElement
view.panel // HTMLDivElement
view.field // HTMLInputElement
view.save // HTMLButtonElement
```

References that may be absent from conditional children or dynamic arrays include `undefined` in their type. Check them before use or use optional chaining. A selector typed as a general `string` produces an `HTMLElement` root; literal selectors preserve more precise types.

The exported `Child` and `ElementResult` types can be used to annotate reusable child lists and element results. Keeping inferred types preserves specific named references.

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm test:watch
pnpm test:types
pnpm typecheck
pnpm lint
```

`pnpm test` runs DOM behavior tests in jsdom (`test/*.test.ts`) and Vitest type tests (`test/*.test-d.ts`). Type tests are checked without executing invalid calls.

## License

[MIT](./LICENSE) © alex.wei
