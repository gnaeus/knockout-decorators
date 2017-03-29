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
 * [@computed](#knockout-decorators-computed)
 * [@reactive](#knockout-decorators-reactive)
 * [@observableArray](#knockout-decorators-observableArray)
 * [@extend](#knockout-decorators-extend)
 * [@component](#knockout-decorators-component)
 * [@autobind](#knockout-decorators-autobind)
 * [@event](#knockout-decorators-event)
 * [subscribe](#knockout-decorators-subscribe)
 * [unwrap](#knockout-decorators-unwrap)
 * [Disposable() mixin](#knockout-decorators-disposable)

[Work with KnockoutValidation](#knockout-decorators-validation)

[Usage without module loaders](#knockout-decorators-without-loaders)

[Change Log](./CHANGELOG.md)

#### <a name="knockout-decorators-observable"></a> @observable
Property decorator that creates hidden `ko.observable` with ES6 getter and setter for it<br>
If initialized by Array then hidden `ko.observableArray` will be created (see [@observableArray](#knockout-decorators-observableArray))
```js
import { observable } from "knockout-decorators";

class Model {
  @observable field = 123;
  @observable collection = [];
};
let model = new Model();

ko.computed(() => { console.log(model.field); }); // [console] ➜ 123
model.field = 456;                                // [console] ➜ 456
```

<br>

#### <a name="knockout-decorators-computed"></a> @computed
Accessor decorator that wraps ES6 getter to hidden `ko.pureComputed`<br>
Setter is not wrapped to hidden `ko.pureComputed` and stays unchanged
```js
import { observable, computed } from "knockout-decorators";

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

#### <a name="knockout-decorators-reactive"></a> @reactive
Like [@observable](#knockout-decorators-observable), but creates "deep observable" property (see example below)<br>
If initialized by Array then hidden `ko.observableArray` will be created (see [@observableArray](#knockout-decorators-observableArray))

```js
import { reactive } from "knockout-decorators";

class ViewModel {
  @reactive deepObservable = {  // like @observable
    firstName: "Clive Staples", // like @observable
    lastName: "Lewis",          // like @observable

    array: [],                  // like @observableArray

    object: {                   // like @observable
      foo: "bar",               // like @observable
      reference: null,          // like @observable
    },
  }
}

const vm = new ViewModel();

vm.deepObservable.object.reference = {
  firstName: "Clive Staples", // make @observable
  lastName: "Lewis",          // make @observable
};

vm.deepObservable.array.push({
  firstName: "Clive Staples", // make @observable
  lastName: "Lewis",          // make @observable
});
```

<br>

#### <a name="knockout-decorators-observableArray"></a> @observableArray
Property decorator that creates hidden `ko.observableArray` with ES6 getter and setter for it
```js
import { observableArray } from "knockout-decorators";

class Model {
  @observableArray array = [1, 2, 3];
};
let model = new Model();

ko.computed(() => { console.log(model.field); }); // [console] ➜ [1, 2, 3]
model.field = [4, 5, 6];                          // [console] ➜ [4, 5, 6]
```
Functions from `ko.observableArray` (both Knockout-specific `remove`, `removeAll`, `destroy`, `destroyAll`, `replace`
and redefined `Array.prototype` functions `pop`, `push`, `reverse`, `shift`, `sort`, `splice`, `unshift`)
are also presents in decorated poperty.<br>
They works like if we invoke them on hidden `ko.observableArray`.

And also decorated array has:
 * a `subscribe(callback: (value: any[]) => void)` function from `ko.subscribable`,
```js
import { observableArray, ObservableArray } from "knockout-decorators";

class Model {
  @observableArray array = [1, 2, 3] as ObservableArray<number>;
};
let model = new Model();
model.array.subscribe((changes) => { console.log(changes); }, null, "arrayChange");

model.array.push(4);                      // [console] ➜  [{ status: 'added', value: 4, index: 3 }]
model.array.remove(val => val % 2 === 0); // [console] ➜  [{ status: 'deleted', value: 2, index: 1 },
                                          //                { status: 'deleted', value: 4, index: 3 }]
```
* a new `mutate(callback: () => void)` function that runs callback in which we can mutate array directly,
```js
import { observableArray, ObservableArray } from "knockout-decorators";

class Model {
  @observableArray array = [1, 2, 3] as ObservableArray<number>;
};

let model = new Model();

model.array.mutate(() => {
  model.array[1] = 200; // this changes are observed
  model.array[2] = 300; // when mutation callback stops execution
});
```
* a new `set(i: number, value: any): any` function that sets a new value at specified index and returns the old value.
```js
import { observableArray, ObservableArray } from "knockout-decorators";

class Model {
  @observableArray array = [1, 2, 3] as ObservableArray<number>;
};

let model = new Model();

let oldValue = model.array.set(2, 300) // this change is observed

console.log(model.array); // [console] ➜ [1, 2, 300]
console.log(oldValue);    // [console] ➜ 3
```
<br>

#### <a name="knockout-decorators-extend"></a> @extend
Apply extenders to decorated `@observable`, `@reactive`, `@observableArray` or `@computed`
```js
@extend(extenders: Object);
@extend(extendersFactory: () => Object);
```

Extenders can be defined by plain object or by calling method, that returns extenders-object.<br>
Note that `extendersFactory` invoked with ViewModel instance as `this` argument.
```js
import { observable, computed, extend } from "knockout-decorators";

class ViewModel {
  rateLimit: 50;
  
  @extend({ notify: "always" })
  @observable first = "";

  @extend(ViewModel.prototype.getExtender)
  @observable second = "";

  @extend({ rateLimit: 500 })
  @computed get both() {
    return this.first + " " + this.second;
  }
  
  getExtender() {
    return { rateLimit: this.rateLimit };
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
import { component } from "knockout-decorators";

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
import { component } from "knockout-decorators";

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

<br>

#### <a name="knockout-decorators-autobind"></a> @autobind
Bind class method to class instance. Clone of [core-decorators.js](https://github.com/jayphelps/core-decorators.js#autobind) `@autobind`
```js
import { observable, component, autobind } from "knockout-decorators";

@component("my-component", `
  <ul data-bind="foreach: array">
    <li data-bind="click: $component.remove">remove me</li>
  </ul>
`)
class MyComponent {
  @observable array = [1, 2, 3] as ObservableArray<number>;
  
  @autobind
  remove(item: number) {
    this.array.remove(item);
  }
}
```

<br>

#### <a name="knockout-decorators-event"></a> @event
Create subscribable function that invokes it's subscribers when it called.<br>

All arguments that passed to `@event` function are translated to it's subscribers.<br>
Internally uses hidden `ko.subscribable`.<br>

Subscribers can be attached by calling `.subscribe()` method of `EventType` type or by `subscribe()` [utility](#knockout-decorators-subscribe-event).
```js
import { event, EventType } from "knockout-decorators";

class Producer {
  @event myEvent: EventType;
}

class Consumer {  
  constructor(producer: Producer) {
    producer.myEvent.subscribe((arg1, arg2) => {
      console.log("lambda:", arg1, arg2);
    });
    
    // `subscription` type is `KnockoutSubscription`
    const subscription = producer.myEvent.subscribe(this.onEvent);
  }
  
  @autobind
  onEvent(arg1, arg2) {
    console.log("method:", arg1, arg2);
  }
}

const producer = new Producer();
const consumer = new Consumer(producer);

// emit @event
producer.myEvent(123, "test");
// [console] ➜ lambda:  123  "test"
// [console] ➜ method:  123  "test"
```

<br>

#### <a name="knockout-decorators-subscribe"></a> subscribe
Subscribe to `@observable` (or `@computed`) dependency with creation of hidden `ko.computed()`
```js
subscribe<T>(
  dependency: () => T,
  callback: (value: T) => void,
  options?: { once?: boolean, event?: string }
): KnockoutSubscription;
```
Or subscribe to some `@event` property
```js
subscribe<T1, T2, ...>(
  event: (arg1: T1, arg2: T2, ...) => void,
  callback: (arg1: T1, arg2: T2, ...) => void,
  options?: { once?: boolean }
): KnockoutSubscription;
```

| Argument          | Default    | Description                                                         |
|:------------------|:-----------|:--------------------------------------------------------------------|
| dependencyOrEvent |            | (1) Function for getting observeble property (2) @event property    |
| callback          |            | Callback that handle dependency changes or @event notifications     |
| options           | `null`     | Options object                                                      |
| options.once      | `false`    | If `true` then subscription will be disposed after first invocation |
| optons.event      | `"change"` | Event name for passing to Knockout native `subscribe()`             |

Subscribe to `@observable` changes
```js
import { observable, subscribe } from "knockout-decorators";

class ViewModel {
  @observable field = 123;
  
  constructor() {
    subscribe(() => this.field, (value) => {
      console.log(value); // TypeScript detects that `value` type is `number`
    });

    subscribe(() => this.field, (value) => {
      console.log(value);
    }, { once: true });

    subscribe(() => this.field, (value) => {
      console.log(value);
    }, { event: "beforeChange" });    
  }  
}
```
<a name="knockout-decorators-subscribe-event"></a>Subscribe to `@event` property
```js
import { event, subscribe } from "knockout-decorators";

class ViewModel {
  @event myEvent: (arg: string) => void;
  
  constructor() {
    subscribe(this.myEvent, (arg) => {
      console.log(arg); // TypeScript detects that `arg` type is `string`
    });
    
    subscribe(this.myEvent, (arg) => {
      console.log(arg);
    }, { once: true });
    
    // `subscription` type is `KnockoutSubscription`
    const subscription = subscribe(this.myEvent, (arg) => {
      console.log(arg);
    });
    
    // unsubscribe from @event
    subscription.dispose();
    
    // emit @event
    this.myEvent("event argument")
  }  
}
```

<br>

#### <a name="knockout-decorators-unwrap"></a> unwrap
Get hidden `ko.observable()` for property decodated by `@observable`
or hidden `ko.pureComputed()` for property decodated by `@computed`
```js
unwrap(instance: Object, key: string | symbol): any;
unwrap<T>(instance: Object, key: string | symbol): KnockoutObservable<T>;
```

| Argument | Default | Description                    |
|:---------|:--------|:-------------------------------|
| instance |         | Decorated class instance       |
| key      |         | Name of `@observable` property |

<a name="knockout-decorators-validation"></a>
KnockoutValidation example
```js
import { observable, extend, unwrap } from "knockout-decorators";

class MyViewModel {
  @extend({ required: "MyField is required" })
  @observable myField = "";
  
  checkMyField() {
    alert("MyField is valid: " + unwrap(this, "myField").isValid());
  }

  // pass `unwrap` function to data-bindings
  unwrap(key: string) {
    return unwrap(this, key);
  }
}
```
```html
<div>
  <input type="text" data-bind="value: myField"/>
  <button data-bind="click: checkMyField">check</button>
  <p data-bind="validationMessage: unwrap('myField')"></p>
</div>
```

<br>

#### <a name="knockout-decorators-disposable"></a> Disposable() mixin
Mixin that injects to class shorthands for utility functions and provides automatic disposing of created subscriptions
(see [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Mix-ins)
or [TypeScript 2.2 docs](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html))
```js
function Disposable(Base? /* optional */) {
  return class extends Base {
    subscribe(...): KnockoutSubscription;
    dispose(): void;
    unwrap(propName: string): KnockoutObservable;
  }
}
```
* `Disposable.subscribe(...)` Shorthand for [`subscribe()`](#knockout-decorators-subscribe)
  utility function that also store created subscription in hidden class property.
* `Disposable.dispose()` Automatically dispose all subscriptions created by `Disposable.subscribe(...)` method.
* `Disposable.unwrap()` Shorthand for [`unwrap()`](#knockout-decorators-unwrap)
  utility function that returns hidden Knockout observable for decorated class property.

```js
import { observable, computed, Disposable } from "knockout-decorators";

class Derived extends Disposable(Base) {
  @observable text = "";
  
  @computed({ pure: false })
  get upperCase() {
    return this.text.toUpperCase();
  }
  
  constructor() {
    // subscribe to computed changes
    // and store created subscription in hidden class property 
    this.subscribe(() => this.upperCase, (value) => {
      console.log(value);
    });
  }
  
  dispose() {
    // dispose all subscriptions that created by this.subscribe()
    super.dispose();
    // unwrap and dispose hiddden Knockout computed
    this.unwrap("upperCase").dispose();
  }
}

// Base class is optional
class Component extends Disposable() { }
```

<br>

### <a name="knockout-decorators-without-loaders"></a>
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
