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
import { reactive, subscribe, unwrap } from "../knockout-decorators";

describe("@reactive decorator", () => {
    it("should define deep observable object property", () => {
        class ViewModel {
            @reactive object = {
                first: 123,
                second: "foo",
                reference: {
                    nested: 789,
                },
            };
        }

        let vm = new ViewModel();

        let first = unwrap<number>(vm.object, "first");
        let second = unwrap<string>(vm.object, "second");
        let reference = unwrap<Object>(vm.object, "reference");
        let nested = unwrap<number>(vm.object.reference, "nested");

        expect(ko.isObservable(first)).toBeTruthy();
        expect(ko.isObservable(second)).toBeTruthy();
        expect(ko.isObservable(reference)).toBeTruthy();
        expect(ko.isObservable(nested)).toBeTruthy();
        expect(first()).toBe(123);
        expect(second()).toBe("foo");
        expect(reference()).toEqual({ nested: 789 });
        expect(nested()).toBe(789);
    });

    it("should define subscribale properties on object", () => {
        class ViewModel {
            @reactive object = {
                first: 123,
                second: "foo",
                reference: {
                    nested: 789,
                },
            };
        }

        let vm = new ViewModel();

        let first, second, nested;
        subscribe(() => vm.object.first, value => { first = value; });
        subscribe(() => vm.object.second, value => { second = value; });
        subscribe(() => vm.object.reference.nested, value => { nested = value; });
        
        vm.object.first = 456;
        vm.object.second = "bar";
        vm.object.reference.nested = 500;

        expect(first).toBe(456);
        expect(second).toBe("bar");
        expect(nested).toBe(500);
    });

    it("should define deep observable array property", () => {
        class ViewModel {
            @reactive array = [];
        }

        let vm = new ViewModel();

        let changesCount = 0;
        subscribe(() => vm.array, () => { changesCount++; });

        vm.array.push(1);
        vm.array = [1, 2, 3];

        expect(changesCount).toBe(2);
    });

    it("should combine deep observable objects and arrays", () => {
        class ViewModel {
            @reactive deepObservable = {    // like @observable
                firstName: "Clive Staples", // like @observable
                lastName: "Lewis",          // like @observable

                array: [],                  // like @observableArray

                object: {                   // like @observable({ deep: true })
                    foo: "bar",             // like @observable
                    reference: null,        // like @observable({ deep: true })
                },
            }
        }

        const vm = new ViewModel();

        vm.deepObservable.array.push({
            firstName: "Clive Staples", // make @observable
            lastName: "Lewis",          // make @observable
        });

        vm.deepObservable.object.reference = {
            firstName: "Clive Staples", // make @observable
            lastName: "Lewis",          // make @observable
        };

        expect(ko.isObservable(unwrap(vm, "deepObservable"))).toBeTruthy();
        expect(ko.isObservable(unwrap(vm.deepObservable, "firstName"))).toBeTruthy();
        expect(ko.isObservable(unwrap(vm.deepObservable, "lastName"))).toBeTruthy();

        expect(ko.isObservable(unwrap(vm.deepObservable, "array"))).toBeTruthy();
        expect(ko.isObservable(unwrap(vm.deepObservable.array[0], "firstName"))).toBeTruthy();
        expect(ko.isObservable(unwrap(vm.deepObservable.array[0], "lastName"))).toBeTruthy();

        expect(ko.isObservable(unwrap(vm.deepObservable, "object"))).toBeTruthy();
        expect(ko.isObservable(unwrap(vm.deepObservable.object, "foo"))).toBeTruthy();
        expect(ko.isObservable(unwrap(vm.deepObservable.object, "reference"))).toBeTruthy();

        expect(ko.isObservable(unwrap(vm.deepObservable.object.reference, "firstName"))).toBeTruthy();
        expect(ko.isObservable(unwrap(vm.deepObservable.object.reference, "lastName"))).toBeTruthy();
    });
});