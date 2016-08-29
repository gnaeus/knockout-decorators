jest.unmock("knockout");
jest.unmock("../knockout-decorators.ts");

import * as ko from "knockout";
import { component, observable, computed, subscribe } from "../knockout-decorators.ts"

describe("@component", () => {
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

        ko.components.defaultLoader.getConfig("my-component", ({ synchronous }) => {
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

        ko.components.defaultLoader.getConfig("my-component", ({ template, synchronous }) => {
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

        ko.components.defaultLoader.getConfig("my-component", ({ template, synchronous }) => {
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

        expect(Object.prototype.hasOwnProperty.call(calc, "number")).toBeTruthy();
        expect(Object.prototype.hasOwnProperty.call(calc, "square")).toBeTruthy();
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

describe("@subscribe decorator", () => {
    it("should subscribe given callback to decorated @observable", () => {
        class ViewModel {
            plainField: number;

            @subscribe(ViewModel.prototype.onChange)
            @observable observableField: number = 0;

            onChange(value: number) {
                this.plainField = value;
            }
        }

        let vm = new ViewModel();
        vm.observableField = 123;

        expect(vm.plainField).toBe(123);
    });

    it("should subscribe callback to decorated @observable by given callback name", () => {
        class ViewModel {
            plainField: number;

            @subscribe("onChange")
            @observable observableField: number = 0;

            onChange(value: number) {
                this.plainField = value;
            }
        }

        let vm = new ViewModel();
        vm.observableField = 123;

        expect(vm.plainField).toBe(123);
    });

    it("should subscribe decorated callback to @observable by given observable name", () => {
        class ViewModel {
            plainField: number;

            @observable observableField: number = 0;

            @subscribe("observableField")
            onChange(value: number) {
                this.plainField = value;
            }
        }

        let vm = new ViewModel();
        vm.observableField = 123;

        expect(vm.plainField).toBe(123);
    });

    it("should dispose subscriptions with ViewModel by default", () => {
        class ViewModel {
            plain: number = 123;

            @subscribe(ViewModel.prototype.onChange)
            @observable first: number = 0;

            @subscribe(ViewModel.prototype.onChange)
            @observable second: number = 0;

            onChange(value: number) {
                this.plain = value;
            }

            dispose() {}
        }

        let vm = new ViewModel();
        vm.dispose();

        vm.first = 456;
        vm.second = 789;
        
        expect(vm.plain).toBe(123);
    });

    it("should not dispose subscriptions with ViewModel if 'autoDispose' is false", () => {
        class ViewModel {
            plain: number = 123;

            @subscribe(ViewModel.prototype.onChange, false)
            @observable first: number = 0;

            @subscribe(ViewModel.prototype.onChange, true)
            @observable second: number = 0;

            onChange(value: number) {
                this.plain = value;
            }

            dispose() {}
        }

        let vm = new ViewModel();
        vm.dispose();

        vm.first = 456;
        vm.second = 789;
        
        expect(vm.plain).toBe(456);
    });

    it("should dispose subscriptions from base class", () => {
        class Base {
            plainField: number;

            @observable observableField: number = 0;

            @subscribe("observableField")
            onChange(value: number) {
                this.plainField = value;
            }
        }

        class Derived extends Base {
            @subscribe("observableField")
            onChangeDerived(value: number) {
                this.plainField = value * 2;
            }

            dispose: Function;
        }

        let derived = new Derived();
        derived.observableField = 123;
        derived.dispose();

        derived.observableField = 456;

        expect(derived.plainField).toBe(246);
    });
});