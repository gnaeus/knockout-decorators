/**
 * Copyright (c) 2016 Dmitry Panyushkin
 * Available under MIT license
 */
jest.unmock("knockout");
jest.unmock("../knockout-decorators");
jest.unmock("../deep-observable");

import * as ko from "knockout";
import { observable, reactive, subscribe, unwrap } from "../knockout-decorators";

describe("@reactive decorator", () => {
    it("should define reactive object property", () => {
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

    it("should define reactive array property", () => {
        class ViewModel {
            @reactive array = [];
        }

        let vm = new ViewModel();

        let changesCount = 0;
        subscribe(() => vm.array["unwrap"](), () => { changesCount++; });

        vm.array.push(1);
        vm.array[0] = 2;
        vm.array = [1, 2, 3];

        expect(changesCount).toBe(3);
    });

    it("should combine reactive objects and arrays", () => {
        class ViewModel {
            @observable({ deep: true })
            deepObservable = {              // like @observable
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

describe("deep ObservableObject", () => {
    it("should define observable properties on object", () => {
        let obj = reactive({
            first: 123,
            second: "foo",
            reference: {
                nested: 789,
            },
        });

        let first = unwrap<number>(obj, "first");
        let second = unwrap<string>(obj, "second");
        let reference = unwrap<Object>(obj, "reference");
        let nested = unwrap<number>(obj.reference, "nested");

        expect(ko.isObservable(first)).toBeTruthy();
        expect(ko.isObservable(second)).toBeTruthy();
        expect(ko.isObservable(reference)).toBeTruthy();
        expect(ko.isObservable(nested)).toBeTruthy();
        expect(first()).toBe(123);
        expect(second()).toBe("foo");
        expect(reference()).toEqual({ nested: 789 });
        expect(nested()).toBe(789);
    });

    it("should define reactive properties on object", () => {
        let obj = reactive({
            first: 123,
            second: "foo",
        });

        let first, second;
        subscribe(() => obj.first, value => { first = value; });
        subscribe(() => obj.second, value => { second = value; });
        
        obj.first = 456;
        obj.second = "bar";

        expect(first).toBe(456);
        expect(second).toBe("bar");
    });
});

describe("deep ObservableArray", () => {
    it("should proxy methods from native Array", () => {
        let arr = reactive([1, 2, 3]);

        arr.push(4, 5, 6);

        expect(arr.slice()).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("should proxy index accessors from native Array", () => {
        let arr = reactive([1, 2, 3]);

        arr[0] = 4;
        arr[1] = 5;
        arr[2] = 6;

        expect(arr.slice()).toEqual([4, 5, 6]);
    });

    it("should track changes from method calls", () => {
        let arr = reactive([1, 2, 3]);

        let changesCount = 0;
        subscribe(() => arr.slice(), () => { changesCount++; });

        arr.push(4, 5, 6);

        expect(changesCount).toBe(1);
    });

    it("should track changes from index accessors", () => {
        let arr = reactive([1, 2, 3]);

        let changesCount = 0;
        subscribe(() => arr.slice(), () => { changesCount++; });

        arr[0] = 4;
        arr[1] = 5;
        arr[2] = 6;

        expect(changesCount).toBe(3);
    });

    it("should define deep observable properties on inner values", () => {
        let arr = reactive([]);

        arr.push({ first: 123 });
        arr.push({ second: "test" });

        let first = unwrap<number>(arr[0], "first");
        let second = unwrap<string>(arr[1], "second");

        expect(ko.isObservable(first)).toBeTruthy();
        expect(ko.isObservable(second)).toBeTruthy();

        expect(first()).toBe(123);
        expect(second()).toBe("test");
    });
});