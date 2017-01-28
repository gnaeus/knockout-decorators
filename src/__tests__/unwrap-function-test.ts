/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
jest.unmock("knockout");
jest.unmock("../knockout-decorators");
jest.unmock("../observable-array");
jest.unmock("../observable-array-proxy");
jest.unmock("../observable-property");
jest.unmock("../property-extenders");

import * as ko from "knockout";
import { component, observable, computed, extend, unwrap } from "../knockout-decorators";

describe("unwrap utility function", () => {
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

    // it("should unwrap ReactiveArray", () => {
    //     class ViewModel {
    //         @reactive array = [];
    //     }

    //     let vm = new ViewModel();

    //     let obsArray = unwrap(vm, "array");

    //     expect(ko.isObservable(obsArray)).toBeTruthy();
    //     expect(Object.getPrototypeOf(obsArray)).toBe(ko.observableArray.fn);
    // });
});