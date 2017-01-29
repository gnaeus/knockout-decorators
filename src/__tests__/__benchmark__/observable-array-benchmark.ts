/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
jest.unmock("knockout");
jest.unmock("../../knockout-decorators");
jest.unmock("../../observable-array");
jest.unmock("../../observable-array-proxy");
jest.unmock("../../observable-property");
jest.unmock("../../property-extenders");

import * as ko from "knockout";
import { observableArray } from "../../knockout-decorators";
import { ObservableArrayProxy } from "../../observable-array-proxy";

describe("Observable Array Benchmark", () => {
     function benchNative(count: number) {
        let source = new Array(count);
        for (let i = 0; i < count; ++i) {
            source[i] = i;
        }
        let arr = source;
        for (let i = 0; i < arr.length; ++i) {
            let temp = arr[0];
            for (let j = 0; j < arr.length - 1; ++j) {
                arr[j] = arr[j + 1];
            }
            arr[arr.length - 1] = temp;
        }
        return arr.slice();
    }

    it("benchmark Native Array", () => {
        let res = benchNative(10);
        console.time("Native Array [size: 100, mutations: 100x100, runs: 10]");
        for (let i = 0; i < 10; ++i) {
            res = benchNative(100);
        }
        console.timeEnd("Native Array [size: 100, mutations: 100x100, runs: 10]");
    });

    function benchKnockout(count: number) {
        let source = new Array(count);
        for (let i = 0; i < count; ++i) {
            source[i] = i;
        }
        let arr = ko.observableArray(source);
        for (let i = 0; i < arr().length; ++i) {
            let temp = arr()[0];
            for (let j = 0; j < arr().length - 1; ++j) {
                arr.splice(j, 1, arr()[j + 1]);
            }
            arr.splice(arr.length - 1, 1, temp);
        }
        return arr().slice();
    }

    it("benchmark Knockout Observable Array", () => {
        let res = benchKnockout(10);
        console.time("Knockout Observable Array [size: 100, mutations: 100x100, runs: 10]");
        for (let i = 0; i < 10; ++i) {
            res = benchKnockout(100);
        }
        console.timeEnd("Knockout Observable Array [size: 100, mutations: 100x100, runs: 10]");
    });

    function benchDecorator(count: number) {
        let source = new Array(count);
        for (let i = 0; i < count; ++i) {
            source[i] = i;
        }
        class ViewModel {
            @observableArray arr = source;
        }
        let vm = new ViewModel();
        for (let i = 0; i < vm.arr.length; ++i) {
            let temp = vm.arr[0];
            for (let j = 0; j < vm.arr.length - 1; ++j) {
                vm.arr.splice(j, 1, vm.arr[j + 1]);
            }
            vm.arr.splice(vm.arr.length - 1, 1, temp);
        }
        return vm.arr.slice();
    }

    it("benchmark Observable Array Decorator", () => {
        let res = benchDecorator(10);
        console.time("Observable Array Decorator [size: 100, mutations: 100x100, runs: 10]");
        for (let i = 0; i < 10; ++i) {
            res = benchDecorator(100);
        }
        console.timeEnd("Observable Array Decorator [size: 100, mutations: 100x100, runs: 10]");
    });

    function benchProxy(count: number) {
        let source = new Array(count);
        for (let i = 0; i < count; ++i) {
            source[i] = i;
        }
        let arr = makeProxy(source);
        for (let i = 0; i < arr.length; ++i) {
            let temp = arr[0];
            for (let j = 0; j < arr.length - 1; ++j) {
                arr[j] = arr[j + 1];
            }
            arr[arr.length - 1] = temp;
        }
        return arr.slice();
    }

    function makeProxy<T>(array: T[]): T[] {
        return new ObservableArrayProxy(ko.observableArray(array)) as any;
    }

    it("benchmark Observable Array Proxy", () => {
        let res = benchProxy(10);
        console.time("Observable Array Proxy [size: 100, mutations: 100x100, runs: 10]");
        for (let i = 0; i < 10; ++i) {
            res = benchProxy(100);
        }
        console.timeEnd("Observable Array Proxy [size: 100, mutations: 100x100, runs: 10]");
    });
});