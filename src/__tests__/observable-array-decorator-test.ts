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
import { observableArray, ObservableArray } from "../knockout-decorators";

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
        expect(Object.hasOwnProperty.call(previous, "mutate")).toBeFalsy();
        expect(Object.hasOwnProperty.call(previous, "set")).toBeFalsy();
        expect(Object.hasOwnProperty.call(vm.array, "push")).toBeTruthy();
        expect(Object.hasOwnProperty.call(vm.array, "subscribe")).toBeTruthy();
        expect(Object.hasOwnProperty.call(vm.array, "mutate")).toBeTruthy();
        expect(Object.hasOwnProperty.call(vm.array, "set")).toBeTruthy();
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
    });

    it("should have 'mutate' method", () => {
        class ViewModel {
            @observableArray array = [1, 2, 3] as ObservableArray<any>;
        }

        let vm = new ViewModel();
        let changes = [];

        vm.array.subscribe(val => { changes.push(...val); }, null, "arrayChange");

        vm.array.mutate((array) => {
            array[1] = 4;
        });

        expect(vm.array).toEqual([1, 4, 3]);
        expect(changes).toEqual([
            { status: 'added', value: 4, index: 1 },
            { status: 'deleted', value: 2, index: 1 },
        ]);
    });

    it("should have 'set' method", () => {
        class ViewModel {
            @observableArray array = [1, 2, 3] as ObservableArray<any>;
        }

        let vm = new ViewModel();
        let changes = [];

        vm.array.subscribe(val => { changes.push(...val); }, null, "arrayChange");

        let oldValue = vm.array.set(1, 4);

        expect(oldValue).toBe(2);
        expect(vm.array).toEqual([1, 4, 3]);
        expect(changes).toEqual([
            { status: 'deleted', value: 2, index: 1 },
            { status: 'added', value: 4, index: 1 },
        ]);
    });
});