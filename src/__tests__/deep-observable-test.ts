/**
 * Copyright (c) 2016 Dmitry Panyushkin
 * Available under MIT license
 */
jest.unmock("knockout");
jest.unmock("../knockout-decorators");
jest.unmock("../deep-observable");

import * as ko from "knockout";
import { reactive, subscribe, unwrap } from "../knockout-decorators";

describe("@reactive decorator", () => {

});

describe("reactive utility function", () => {
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

// describe("deep ObservableArray", () => {
//     it("should track changes from method calls", () => {
//         let arr = reactive([]);

//         // let changed;
//         // subscribe(() => arr, value => { changed = value });

//         arr.push(1, 2, 3);
//         console.log("arr:", Object.getPrototypeOf(arr)['slice']);

//         expect(arr.slice()).toEqual([1, 2, 3]);
//     });
// });