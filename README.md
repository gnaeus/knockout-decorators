# Knockout Decorators
__Decorators for use Knockout JS in TypeScript and ESNext environments__

[![Build Status](https://travis-ci.org/gnaeus/knockout-decorators.svg?branch=master)](https://travis-ci.org/gnaeus/knockout-decorators)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/gnaeus/knockout-decorators/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/knockout-decorators.svg?style=flat)](https://www.npmjs.com/package/knockout-decorators)

### Example
```js
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
 * [@observableArray](#knockout-decorators-observableArray)
 * [@computed](#knockout-decorators-computed)
 * [@observer](#knockout-decorators-observer)
 * [@extend](#knockout-decorators-extend)
 * [@subscribe](#knockout-decorators-subscribe)
 * [@component](#knockout-decorators-component)


#### <a name="knockout-decorators-observable"></a> @observable
Property decorator that creates hidden `ko.observable` with ES6 getter and setter for it
```js
class Model {
  @observable field = 123;
};
let model = new Model();

ko.computed(() => { console.log(model.field); }); // [console] ➜ 123
model.field = 456;                                // [console] ➜ 456
```

<br>

#### <a name="knockout-decorators-observableArray"></a> @observableArray
Property decorator that creates hidden `ko.observableArray` with ES6 getter and setter for it
```js
class Model {
  @observableArray array = [1, 2, 3];
};
let model = new Model();

ko.computed(() => { console.log(model.field); }); // [console] ➜ [1, 2, 3]
model.field = [4, 5, 6];                          // [console] ➜ [4, 5, 6]
```
Functions from `ko.observableArray` (both Knockout-specific `remove`, `removeAll`, `destroy`, `destroyAll`, `replace`<br>
and redefined `Array.prototype` functions `pop`, `push`, `reverse`, `shift`, `sort`, `splice`, `unshift`)
are also presents in decorated poperty.<br>
They works like if we invoke them on hidden `ko.observableArray`.

And also decorated array has a `subscribe` function from `ko.subscribable`
```js
class Model {
  @observableArray array = [1, 2, 3];
};
let model = new Model();
model.array.subscribe((changes) => { console.log(changes); }, null, "arrayChange");

model.array.push(4);                      // [console] ➜  [{ status: 'added', value: 4, index: 3 }]
model.array.remove(val => val % 2 === 0); // [console] ➜  [{ status: 'deleted', value: 2, index: 1 },
                                          //                { status: 'deleted', value: 4, index: 3 }]
```

<br>

#### <a name="knockout-decorators-computed"></a> @computed
Accessor decorator that wraps ES6 getter and setter (if defined) to hidden `ko.pureComputed`
```js
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

<br>

#### <a name="knockout-decorators-observer"></a> @observer
Replace original method with factory that produces `ko.computed` from original method
```js
@observer
@observer(autoDispose: boolean)
```
| Argument    | Default | Description                                                                    |
|:------------|:--------|:-------------------------------------------------------------------------------|
| autoDispose | `true`  | if true then computed will be disposed when entire decorated class is disposed |

Method that decorated with `@observer` evaluates once when explicitely invoked (this call creates hidden `ko.computed`)
and every times when it's observable (or computed) dependencies are changed.

Hidden `ko.computed` will be disposed when entire decorated class is disposed (if we don't set `autoDispose` to `false`)
```js
class BlogPage {
  @observable postId = 0;
  @observable pageData: any;
  
  constructor(blogId: ko.Observable<number>) {
    const computed = this.onRoute(blogId);
    // subscribe onRoute handler to changes
    // then we can do whatever with created computed
  }
  
  // 'dispose()' method is redefined such that it disposes hidded 'onRoute' computed
  // if original class already has 'dispose()' method then it would be wrapped by new method
  
  @observer async onRoute(blogId: ko.Observable<number>) {
    const resp = await fetch(`/blog/${ blogId() }/post/${ this.postId }`);
    this.pageData = await resp.json();
  }
}
```

<br>

#### <a name="knockout-decorators-extend"></a> @extend
Apply extenders to decorated `@observable`
```js
@extend(extenders: Object)
@extend(extendersFactory: () => Object)
```

Extenders can be defined by plain object or by calling method, that returns extenders-object.<br>
Note that `extendersFactory` invoked with ViewModel instance as `this` argument.
```js
class ViewModel {
  rateLimit: 50;
  
  @extend({ notify: "always" })
  @observable first = "";

  @extend(ViewModel.prototype.getExtender)
  @observable second = "";
  
  getExtender() {
    return { rateLimit: this.rateLimit };
  }
}
```

<br>

#### <a name="knockout-decorators-subscribe"></a> @subscribe
Subscribe to `@observable` by name or by specifying callback explicitely
```js
@subscribe(callback: (value: any) => void, event?: string, autoDispose?: boolean)
@subscribe(targetOrCallback: string | symbol, event?: string, autoDispose?: boolean)
```

| Argument         | Default | Description                                                                    |
|:-----------------|:--------|:-------------------------------------------------------------------------------|
| callback         |         | Subscription handler method                                                    |
| targetOrCallback |         | Name of subscription handler method or name of `@observable` property          |
| event            | `null`  | Knockout subscription event                                                    |
| autoDispose      | `true`  | if true then computed will be disposed when entire decorated class is disposed |

We can define name of handler when we decorate `@observable` or define name of `@observable` when decorate handler.
Subscriptions will be disposed when entire decorated class is disposed (if we don't set `autoDispose` to `false`)
```js
class ViewModel {
  // specify callback
  @subscribe("onFirstChanged")
  @observable first = "";
  
  onFirstChanged(value) {}
  
  @observable second = "";
  // specify observable  
  @subscribe("second")
  onSecondChanged(value) {}
}
```

Also whe can pass subscription handler directly.
Then it will be invoked with ViewModel instance as `this` argument.

And we can specify subscription `event`
```js
class ViewModel {
  operationLog = [];
  
  @subscribe(ViewModel.prototype.onArrayChange, "arrayChange")
  @observableArray array = [1, 2, 3]
  
  onArrayChange(changes) {
    this.operationLog.push(...changes);
  }
}
```

<br>

#### <a name="knockout-decorators-component"></a> @component
Shorthand for registering Knockout component by decorating ViewModel class
```js
@component(name: string, options?: Object);
@component(name: string, template: any, options?: Object);
@component(name: string, template: any, styles: any, options?: Object);
```

| Argument | Default                 | Description                                                        |
|:---------|:------------------------|:-------------------------------------------------------------------|
| name     |                         | Name of component                                                  |
| template | `"<!---->"`             | Knockout template definition                                       |
| styles   |                         | Ignored parameter (used for `require()` styles by webpack etc.)    |
| options  | `{ synchronous: true }` | Another options that passed directly to `ko.components.register()` |

By default components registered with `synchronous` flag.<br>
It can be overwritten by passing `{ synchronous: false }` as __options__.

If template is not specified then it will be replaced by HTML comment `<!---->`

If ViewModel constructor accepts zero or one arguments,
then it will be registered as `viewModel:` in config object.
```js
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
then `createViewModel:` factory is created<br>
and `{ element, templateNodes }` are passed as arguments to ViewModel constructor.
```js
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

### Usage without module loaders (in global scope)
__layout.html__
```html
<script src="/{path_to_vendor_scrpts}/knockout.js"></script>
<script src="/{path_to_vendor_scrpts}/knockout-decorators.js"></script>
```
__script.ts__
```js
namespace MyTypescriptNamespace {
  // import from TypeScript namespace (JavaScript global variable)
  const { observable, computed } = KnockoutDecorators; 
  
  export class MyClass {
    @observable field = "";
  }
}
```
