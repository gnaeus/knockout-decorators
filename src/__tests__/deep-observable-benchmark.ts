/**
 * Copyright (c) 2016 Dmitry Panyushkin
 * Available under MIT license
 */
jest.unmock("knockout");
jest.unmock("../knockout-decorators");
jest.unmock("../deep-observable");

import * as ko from "knockout";
import { reactive, subscribe, unwrap } from "../knockout-decorators";

describe("Array Benchmarks", () => {
     function benchNative(count: number) {
        let source = new Array(count);
        for (let i = 0; i < count; ++i) {
            source[i] = {};
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
        console.time("Native Array [size: 100, mutations: 100x100, runs: 20]");
        for (let i = 0; i < 20; ++i) {
            res = benchNative(100);
        }
        console.timeEnd("Native Array [size: 100, mutations: 100x100, runs: 20]");
    });

    function benchObservable(count: number) {
        let source = new Array(count);
        for (let i = 0; i < count; ++i) {
            source[i] = {};
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

    it("benchmark Observable Array", () => {
        let res = benchObservable(10);
        console.time("Observable Array [size: 100, mutations: 100x100, runs: 20]");
        for (let i = 0; i < 20; ++i) {
            res = benchObservable(100);
        }
        console.timeEnd("Observable Array [size: 100, mutations: 100x100, runs: 20]");
    });

    function benchReactive(count: number) {
        let source = new Array(count);
        for (let i = 0; i < count; ++i) {
            source[i] = {};
        }
        let arr = reactive(source);
        for (let i = 0; i < arr.length; ++i) {
            let temp = arr[0];
            for (let j = 0; j < arr.length - 1; ++j) {
                arr[j] = arr[j + 1];
            }
            arr[arr.length - 1] = temp;
        }
        return arr.slice();
    }

    it("benchmark Reactive Array", () => {
        let res = benchReactive(10);
        console.time("Reactive Array [size: 100, mutations: 100x100, runs: 20]");
        for (let i = 0; i < 20; ++i) {
            res = benchReactive(100);
        }
        console.timeEnd("Reactive Array [size: 100, mutations: 100x100, runs: 20]");
    });
});