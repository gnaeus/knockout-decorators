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
import { subscribe, unwrap } from "../knockout-decorators";
import { prepareReactiveValue } from "../observable-property";
import { ObservableArrayProxy } from "../observable-array-proxy";

describe("deep ObservableArray", () => {
    function makeProxy<T>(array: T[]): T[] & KnockoutObservableArray<T> {
        return new ObservableArrayProxy(
            ko.observableArray(array), prepareReactiveValue
        ) as any;
    }

    it("should proxy methods from native Array", () => {
        let arr = makeProxy([1, 2, 3]);

        arr.push(4, 5, 6);

        expect(arr.slice()).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("should proxy index accessors from native Array", () => {
        let arr = makeProxy([1, 2, 3]);

        arr[0] = 4;
        arr[1] = 5;
        arr[2] = 6;

        expect(arr.slice()).toEqual([4, 5, 6]);
    });

    it("should track changes from method calls", () => {
        let arr = makeProxy([1, 2, 3]);

        let changesCount = 0;
        subscribe(() => arr.slice(), () => { changesCount++; });

        arr.push(4, 5, 6);

        expect(changesCount).toBe(1);
    });

    it("should track changes from index accessors", () => {
        let arr = makeProxy([1, 2, 3]);

        let changesCount = 0;
        subscribe(() => arr.slice(), () => { changesCount++; });

        arr[0] = 4;
        arr[1] = 5;
        arr[2] = 6;

        expect(changesCount).toBe(3);
    });

    it("should define deep observable properties on inner values", () => {
        let arr = makeProxy([]);

        arr.push({ first: 123 });
        arr.push({ second: "test" });

        let first = unwrap<number>(arr[0], "first");
        let second = unwrap<string>(arr[1], "second");

        expect(ko.isObservable(first)).toBeTruthy();
        expect(ko.isObservable(second)).toBeTruthy();

        expect(first()).toBe(123);
        expect(second()).toBe("test");
    });

    it("should be serializable to JSON", () => {
        let arr = makeProxy([1, 2, 3]);

        let json = JSON.stringify(arr);

        expect(json).toBe("[1,2,3]");
    });
});