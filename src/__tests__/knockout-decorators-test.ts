/**
 * Copyright (c) 2016 Dmitry Panyushkin
 * Available under MIT license
 */
jest.unmock("knockout");
jest.unmock("../knockout-decorators");

import * as ko from "knockout";
import {
    component, observable, computed, extend, autobind,
    subscribe, unwrap, observableArray, ObservableArray
} from "../knockout-decorators";

interface ComponentConfig extends KnockoutComponentTypes.ComponentConfig {
    synchronous?: boolean;
}

describe("@component decorator", () => {
    // mock for require()
    function reuqire(path: string) { return path; }

    it("should register components", () => {
        @component("my-component")
        class MyComponent {}

        expect(ko.components.isRegistered("my-component")).toBeTruthy();
    });

    it("should register synchoronous by default", () => {
        @component("my-component")
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ synchronous }: ComponentConfig) => {
            expect(synchronous).toBe(true);
        });
    });

    it("should register constructor as view model if it has 0 or 1 args", () => {
        @component("my-component")
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ viewModel }) => {
            expect(viewModel).toBe(MyComponent);
        });
    });

    it("should create view model factory if constructor has 2 or 3 args", () => {
        @component("my-component")
        class MyComponent {
            constructor(public params, public element, public templateNodes) {}
        }

        ko.components.defaultLoader.getConfig("my-component", ({ viewModel }) => {
            expect(viewModel.constructor).toBe(Object);
            
            let { createViewModel } = viewModel as any;
            expect(createViewModel instanceof Function).toBeTruthy();

            let vm = createViewModel(1, { element: 2, templateNodes: 3 });
            expect(vm.params).toBe(1);
            expect(vm.element).toBe(2);
            expect(vm.templateNodes).toBe(3);
        });
    });

    it("should extend config options", () => {
        @component("my-component", {
            template: "<div></div>",
            synchronous: false,
        })
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ template, synchronous }: ComponentConfig) => {
            expect(template).toBe("<div></div>");
            expect(synchronous).toBe(false);
        });
    });

    it("should work with (name, template) overload", () => {
        @component("my-component", "<div></div>")
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ template }) => {
            expect(template).toBe("<div></div>");
        });
    });

    it("should work with (name, template, options) overload", () => {
        @component("my-component", { require: "my-template" }, { synchronous: false })
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ template, synchronous }: ComponentConfig) => {
            expect(template).toEqual({ require: "my-template" });
            expect(synchronous).toBe(false);
        });
    });

    it("should work with (name, template, styles) overload", () => {
        @component("my-component", "<div></div>", reuqire("./my-component.css"))
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ template }) => {
            expect(template).toBe("<div></div>");
        });
    });

    it("should work with (name, template, styles, options) overload", () => {
        @component("my-component", "<div></div>", reuqire("./my-component.css"), {
            additionalData: { foo: "bar" }
        })
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", (config) => {
            expect(config.template).toBe("<div></div>");
            expect(config['additionalData']).toEqual({ foo: "bar" });
        });
    });

    afterEach(() => {
        if (ko.components.isRegistered("my-component")) {
            ko.components.unregister("my-component");
        }
    })
});

describe("@observable & @computed decorators", () => {
    ko.options.deferUpdates = false;

    it("should decorate porperties and getters", () => {
        class Calc {
            @observable number: number;

            @computed get square() {
                return this.number * this.number;
            }
        }
        
        let calc = new Calc();
        let result: number;

        // subscribe to .square changes
        ko.computed(() => { result = calc.square; });

        // change observable
        calc.number = 15;

        expect(result).toBe(225);
    });

    it("should lazily create properties on instance", () => {
        class Calc {
            @observable number: number;

            @computed get square() {
                return this.number * this.number;
            }
        }
        
        let calc = new Calc();
        let temp = calc.square;

        expect(Object.hasOwnProperty.call(calc, "number")).toBeTruthy();
        expect(Object.hasOwnProperty.call(calc, "square")).toBeTruthy();
    });

    it("should work with writeable computed", () => {
        class User {
            @observable firstName;
            @observable lastName;

            @computed
            get name() { return this.firstName + " " + this.lastName; }
            set name(value) { [this.firstName, this.lastName] = value.trim().split(/\s+/g); }
        }

        let user = new User();
        
        let fullName;
        ko.computed(() => { fullName = user.name; });

        user.name = " John Smith ";

        expect(fullName).toBe("John Smith");
        expect(user.firstName).toBe("John");
        expect(user.lastName).toBe("Smith");
        expect(user.name).toBe("John Smith");
    });
});

function delay(msec: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setImmediate(() => { resolve(); }, delay);
    });
}

describe("@observableArray decorator", () => {
    it("should work as plain observable", () => {
        class ViewModel {
            @observableArray array = [];
        }
        
        let vm = new ViewModel();
        let syncArr: any[];
        ko.computed(() => { syncArr = vm.array; });
        
        let arr = [1, 2, 3];
        vm.array = arr;

        expect(syncArr).toBe(arr);
    });

    it("should observe array changes", () => {
        class ViewModel {
            @observableArray array = [];
        }
        
        let vm = new ViewModel();

        let syncArr: any[];
        ko.computed(() => { syncArr = vm.array; });
        
        let arr = [1, 2, 3];
        vm.array = arr;
        
        let removed = vm.array.splice(1, 1);

        expect(syncArr).toBe(arr);
        expect(removed).toEqual([2]);
        expect(arr).toEqual([1, 3]);
    });

    it("should expose knockout-specific methods", () => {
        class ViewModel {
            @observableArray array = [1, 2, 3, 4, 3, 2, 1] as ObservableArray<number>;
        }
        
        let vm = new ViewModel();
        let changes = [];

        vm.array.subscribe(val => { changes.push(...val); }, null, "arrayChange");
        
        vm.array.remove(val => val % 2 === 0);
        vm.array.splice(2, 0, 5);

        expect(vm.array).toEqual([1, 3, 5, 3, 1]);
        expect(changes).toEqual([
            { status: 'deleted', value: 2, index: 1 },
            { status: 'deleted', value: 4, index: 3 },
            { status: 'deleted', value: 2, index: 5 },
            { status: 'added', value: 5, index: 2 }
        ]);
    });

    it("should clear array methods on previous observableArray value", () => {
        class ViewModel {
            @observableArray array = [1, 2, 3];
        }
        
        let vm = new ViewModel();
        let previous = vm.array;
        vm.array = [4, 5, 6];

        expect(previous).not.toBe(vm.array);
        expect(Object.hasOwnProperty.call(previous, "push")).toBeFalsy();
        expect(Object.hasOwnProperty.call(previous, "subscribe")).toBeFalsy();
        expect(Object.hasOwnProperty.call(vm.array, "push")).toBeTruthy();
        expect(Object.hasOwnProperty.call(vm.array, "subscribe")).toBeTruthy();
    });

    it("should lazily create observableArray on instance", () => {
        class ViewModel {
            @observableArray array;
        }
        
        let vm = new ViewModel();
        let temp = vm.array;

        expect(Object.hasOwnProperty.call(vm, "array")).toBeTruthy();
        expect(Array.isArray(vm.array));
    });

    it("should expose knockout-specific methods when lazily created", () => {
        class ViewModel {
            @observableArray array: ObservableArray<string>;
        }

        let vm = new ViewModel();
        let changes = [];

        vm.array.subscribe(val => { changes.push(...val); }, null, "arrayChange");
        
        vm.array.splice(0, 0, "foo", "bar");

        expect(vm.array).toEqual(["foo", "bar"]);
        expect(changes).toEqual([
            { status: 'added', value: "foo", index: 0 },
            { status: 'added', value: "bar", index: 1 },
        ]);
    });

    it("should clone array if it is @observableArray from another field", () => {
        class ViewModel {
            @observableArray arrayFirst = [1, 2] as ObservableArray<number>;
            @observableArray arraySecond = [3, 4] as ObservableArray<number>;
        }

        let vm = new ViewModel();
        let changesFirst = [];
        let changesSecond = [];

        vm.arrayFirst.subscribe(val => { changesFirst.push(...val); }, null, "arrayChange");
        vm.arraySecond.subscribe(val => { changesSecond.push(...val); }, null, "arrayChange");

        // assign pointer to array
        vm.arrayFirst = vm.arraySecond;
        vm.arrayFirst.push(5, 6);

        expect(vm.arrayFirst).not.toBe(vm.arraySecond);

        expect(vm.arrayFirst).toEqual([3, 4, 5, 6]);
        expect(vm.arraySecond).toEqual([3, 4]);

        expect(changesFirst).toEqual([
            { status: 'added', value: 3, index: 0 },
            { status: 'deleted', value: 1, index: 0 },
            { status: 'added', value: 4, index: 1 },
            { status: 'deleted', value: 2, index: 1 },
            { status: 'added', value: 5, index: 2 },
            { status: 'added', value: 6, index: 3 },
        ]);
        expect(changesSecond).toEqual([]);
    })
});

describe("@extend decorator", () => {
    ko.extenders["reverse"] = (target, options) => {
        if (options === "read") {
            return ko.pureComputed({
                read: () => reverse(target()),
                write: target,
            });
        } else if (options === "write") {
            return ko.pureComputed({
                read: target,
                write: value => target(reverse(value)),
            });
        }

        function reverse(value) {
            return value instanceof Array 
                ? value.reverse()
                : String(value).split("").reverse().join("");
        }
    };

    ko.extenders["upperCase"] = (target, options) => {
        if (options === "read") {
            return ko.pureComputed({
                read: () => String(target()).toUpperCase(),
                write: target,
            });
        } else if (options === "write") {
            return ko.pureComputed({
                read: target,
                write: value => target(String(value).toUpperCase()),
            });
        }
    }

    it("should extend @observable", () => {
        class ViewModel {
            @extend({ reverse: "write" })
            @observable observable = "abcdef";
        }
        
        let vm = new ViewModel();
        
        expect(vm.observable).toBe("fedcba");
    });

    it("should extend @observableArray", () => {
        class ViewModel {
            @extend({ reverse: "write" })
            @observableArray array = [1, 2, 3, 4];
        }
        
        let vm = new ViewModel();
        
        expect(vm.array).toEqual([4, 3, 2, 1]);
    });

    it("should accept extenders factory", () => {
        class ViewModel {
            @extend(ViewModel.prototype.getExtender)
            @observable observable = "abcdef";

            getExtender() {
                return { reverse: "write" };
            }
        }
        
        let vm = new ViewModel();
        
        expect(vm.observable).toBe("fedcba");
    });

    it("can be combined with other @extend", () => {
        class ViewModel {
            @extend({ upperCase: "write" })
            @extend({ reverse: "read" })
            @observable observable = "abcdef";
        }
        
        let vm = new ViewModel();
        
        expect(vm.observable).toBe("FEDCBA");
    });

    it("should extend getter @computed", () => {
        class ViewModel {
            @observable observable = "";

            @extend({ reverse: "read" })
            @computed get computed() {
                return this.observable.substr(0, 4);
            }
        }
        
        let vm = new ViewModel();
        let result: string;

        ko.computed(() => { result = vm.computed; });

        vm.observable = "abcdef";

        expect(vm.observable).toBe("abcdef");
        expect(result).toBe("dcba");
    });
});

describe("@autobind decorator", () => {
    it("should lazily create instance props", () => {
        class Test {
            @autobind method() { return this; }
        }

        let instance = new Test();
        let method = instance.method;

        expect(method()).toBe(instance);
    });

    it("should return original method when it accesses through prototype", () => {
        class Test {
            @autobind method() { return this; }
        }

        let instance = new Test();

        expect(instance.method).not.toBe(Test.prototype.method);
        expect(Test.prototype.method()).toBe(Test.prototype);
    });
});

describe("subscribe function", () => {
    it("should subscribe given callback to decorated @observable", () => {
        class ViewModel {
            plainField: number;
            
            @observable observableField: number = 0;

            constructor() {
                subscribe(() => this.observableField, (value) => {
                    this.plainField = value;
                });
            }
        }

        let vm = new ViewModel();
        vm.observableField = 123;

        expect(vm.plainField).toBe(123);
    });

    it("should subscribe given callback to decorated @computed", () => {
        class ViewModel {
            plainField: number;

            @observable observableField: number = 0;

            @computed get computedField() {
                return this.observableField;
            }

            constructor() {
                subscribe(() => this.computedField, (value) => {
                    this.plainField = value;
                });
            }
        }

        let vm = new ViewModel();
        
        vm.observableField = 123;
        
        expect(vm.plainField).toBe(123);
    });

    it("should subscribe to decorated @observable with given event", () => {
        class ViewModel {
            plainField: number;
            
            @observable observableField: number = 0;

            constructor() {
                subscribe(() => this.observableField, (value) => {
                    this.plainField = value;
                }, { event: "beforeChange" });
            }
        }

        let vm = new ViewModel();
        vm.observableField = 123;
        vm.observableField = 456;

        expect(vm.plainField).toBe(123);
    });

    it("should run subscription to decorated @observable once", () => {
        class ViewModel {
            plainField: number;
            
            @observable observableField: number = 0;

            constructor() {
                subscribe(() => this.observableField, (value) => {
                    this.plainField = value;
                }, { once: true });
            }
        }

        let vm = new ViewModel();
        vm.observableField = 123;
        vm.observableField = 456;

        expect(vm.plainField).toBe(123);
    });

    it("should return subscription to hidden ko.computed", () => {
        let koObservable = ko.observable();

        let givenSubscription = subscribe(() => koObservable(), () => {});
        let koSubscription = koObservable.subscribe(() => {});

        expect(Object.hasOwnProperty.call(givenSubscription, "dispose")).toBeTruthy();

        expect(Object.getPrototypeOf(givenSubscription)).toBe(Object.getPrototypeOf(koSubscription));
    });

    it("should dispose hidden ko.computed with returned subscription", () => {
        let koObservable = ko.observable();

        let sideEffectValue;

        let subscription = subscribe(() => {
            return sideEffectValue = koObservable();
        }, () => {});
        
        koObservable(123);
        subscription.dispose();
        koObservable(456);

        expect(sideEffectValue).toBe(123);
    });
});

describe("unwrap function", () => {
    it("should return hidden observable", () => {
        class Test {
            @observable property = "";
        }

        let instance = new Test();

        let observableProperty = unwrap<string>(instance, "property");

        expect(ko.isObservable(observableProperty)).toBeTruthy();
    });

    it("should share hidden observable with decorated property", () => {
        class Test {
            @observable property = "";
        }

        let instance = new Test();

        let observableProperty = unwrap<string>(instance, "property");
        expect(observableProperty()).toBe("");

        instance.property = "property value";
        expect(observableProperty()).toBe("property value");

        observableProperty("observable value");
        expect(instance.property).toBe("observable value");
    });

    ko.extenders["required"] = (target) => {
        const extendedObservable = ko.pureComputed({
            read: target,
            write: value => {
                extendedObservable.isValid = !!value;
                return target(value);
            },
        }) as any;
        return extendedObservable;
    }

    it("should return hidden extended observable", () => {
        class Test {
            @extend({ required: true })
            @observable property = "";

            unwrap(key: string) {
                return unwrap(this, key);
            }
        }

        let instance = new Test();
        expect(instance.unwrap("property").isValid).toBe(false);

        instance.property = "foo bar";
        expect(instance.unwrap("property").isValid).toBe(true);
    });

    it("should return hidden uninitialized observable", () => {
        class Test {
            @observable property;
        }

        let instance = new Test();

        let observableProperty = unwrap<string>(instance, "property");

        expect(ko.isObservable(observableProperty)).toBeTruthy();
    });

    it("should return hidden computed", () => {
        class Test {
            @observable observableField = "";

            @computed get computedField() {
                return this.observableField;
            }
        }

        let instance = new Test();

        let computedField = unwrap<string>(instance, "computedField");

        expect(ko.isComputed(computedField)).toBeTruthy();
    });

    it("should work with class inheritance", () => {
        class Base {
            @observable observableField = "";

            @computed get computedField() {
                return this.observableField;
            }
        }

        class Derived extends Base {
            @observable observableDerivedField = "";
            
            @computed get computedDerivedField() {
                return this.observableDerivedField;
            }
        };

        let instance = new Derived();

        let observableField = unwrap<string>(instance, "observableField");
        let computedField = unwrap<string>(instance, "computedField");
        let observableDerivedField = unwrap<string>(instance, "observableDerivedField");
        let computedDerivedField = unwrap<string>(instance, "computedDerivedField");

        expect(ko.isObservable(observableField)).toBeTruthy();
        expect(ko.isComputed(computedField)).toBeTruthy();
        expect(ko.isObservable(observableDerivedField)).toBeTruthy();
        expect(ko.isComputed(computedDerivedField)).toBeTruthy();
    });
})