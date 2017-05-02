/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";
import { ObservableArrayProxy } from "../../src/experimental/observable-array-proxy";
import { subscribe, unwrap } from "../../src/knockout-decorators";
import { prepareDeepValue } from "../../src/observable-property";

describe("deep ObservableArray", () => {
    function makeProxy<T>(array: T[]): T[] & KnockoutObservableArray<T> {
        return new ObservableArrayProxy(
            ko.observableArray(array), prepareDeepValue,
        ) as any;
    }

    it("should proxy methods from native Array", () => {
        const arr = makeProxy([1, 2, 3]);

        arr.push(4, 5, 6);

        expect(arr.slice()).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("should proxy index accessors from native Array", () => {
        const arr = makeProxy([1, 2, 3]);

        arr[0] = 4;
        arr[1] = 5;
        arr[2] = 6;

        expect(arr.slice()).toEqual([4, 5, 6]);
    });

    it("should track changes from method calls", () => {
        const arr = makeProxy([1, 2, 3]);

        let changesCount = 0;
        subscribe(() => arr.slice(), () => { changesCount++; });

        arr.push(4, 5, 6);

        expect(changesCount).toBe(1);
    });

    it("should track changes from index accessors", () => {
        const arr = makeProxy([1, 2, 3]);

        let changesCount = 0;
        subscribe(() => arr.slice(), () => { changesCount++; });

        arr[0] = 4;
        arr[1] = 5;
        arr[2] = 6;

        expect(changesCount).toBe(3);
    });

    it("should define deep observable properties on inner values", () => {
        const arr = makeProxy([]);

        arr.push({ first: 123 });
        arr.push({ second: "test" });

        const first = unwrap<number>(arr[0], "first");
        const second = unwrap<string>(arr[1], "second");

        expect(ko.isObservable(first)).toBeTruthy();
        expect(ko.isObservable(second)).toBeTruthy();

        expect(first()).toBe(123);
        expect(second()).toBe("test");
    });

    it("should be serializable to JSON", () => {
        const arr = makeProxy([1, 2, 3]);

        const json = JSON.stringify(arr);

        expect(json).toBe("[1,2,3]");
    });
});
