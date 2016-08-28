# Knockout Decorators
__Decorators for use Knockout JS in TypeScript and ESNext environments__

[![Build Status](https://travis-ci.org/gnaeus/knockout-decorators.svg?branch=master)](https://travis-ci.org/gnaeus/knockout-decorators)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/gnaeus/knockout-decorators/master/LICENSE)

### Example
```ts
import { observable, computed, component } from "knockout-decorators";

@component("person-view", `
  <div>Name: <span data-bind="text: fullName"></span></div>
  <div>Age: <span data-bind="text: age"></span></div>
`)
class PersonView {
  @observable firstName: string;
  @observable lastName: string;
  @observable age: string;
  
  @computed get fullName() {
    return this.firstName + " " + this.lastName;
  }
  
  constructor({ firstName, lastName, age }, element, templateNodes) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.age = age;
  }
}
```

---
## Documentation
 * [@observable](#knockout-decorators-observable)
 * [@computed](#knockout-decorators-computed)
 * [@component](#knockout-decorators-component)

#### <a name="knockout-decorators-observable"></a> @observable
Property decorator that creates hidden `ko.observable` with ES6 getter and setter for it
```ts
class Model {
  @observable field = 123;
};
let model = new Model();

ko.computed(() => { console.log(model.field); }); // [console] ➜ 123
model.field = 456; // [console] ➜ 456
```

#### <a name="knockout-decorators-computed"></a> @computed
Accessor decorator that wraps ES6 getter and setter (if defined) to hidden (maybe writeable) `ko.pureComputed`
```ts
class Person {
  @observable firstName = "";
  @observable lastName = "";

  @computed
  get fullName() { return this.firstName + " " + this.lastName; }
  set fullName(value) { [this.firstName, this.lastName] = value.trim().split(/\s+/g); }
}
let person = new Person();

ko.pureComputed(() => person.fullName).subscribe(console.log.bind(console));

person.fullName = "  John  Smith  " // [console] ➜ "John Smith"
```

#### <a name="knockout-decorators-component"></a> @component
```ts
@component(name: string, options?: Object);
@component(name: string, template: any, options?: Object);
@component(name: string, template: any, styles: any, options?: Object);
```
Shorthand for registering Knockout component by decorating ViewModel class
| argument | description                                                        |
|----------|--------------------------------------------------------------------|
| name     | Name of component                                                  |
| template | Knockout template definition                                       |
| styles   | Ignored parameter (used for `require()` styles by webpack etc.)    |
| options  | Another options that passed directly to `ko.components.register()` |

By default components registered with `synchronous` flag.
It can be overwritten by passing `{ synchronous: false }` as __options__.

If template is not specified then it will be replaced by HTML comment `<!---->`

If ViewModel constructor accepts zero or one arguments,
then it will be registered as `viewModel:` in config object.
```ts
@component("my-component")
class Component {
    constructor(params: any) {}
}
// ▼▼▼ results to ▼▼▼
ko.components.register("my-component", {
    viewModel: Component,
    template: "<!---->",
    synchronous: true,
});
```

If ViewModel constructor accepts two or three arguments,
then it `createViewModel` factory is created and component config
`{ element, templateNodes }` are passed as arguments to ViewModel constructor.
```ts
@component("my-component",
    require("./my-component.html"),
    require("./my-component.css"), {
    synchronous: false,
    additionalData: { foo: "bar" } // consider non-standard field
})
class Component {
    constructor(
        private params: any,
        private element: Node,
        private templateNodes: Node[]
    ) {}
}
// ▼▼▼ results to ▼▼▼
ko.components.register("my-component", {
    viewModel: {
        createViewModel(params, { element, templateNodes }) {
            return new Component(params, element, templateNodes);
        }
    },
    template: require("./my-component.html"),
    synchronous: false,
    additionalData: { foo: "bar" } // consider non-standard field
});
```
