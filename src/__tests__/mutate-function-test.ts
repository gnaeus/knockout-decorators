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
import { mutate, observableArray, ObservableArray } from "../knockout-decorators";

describe("mutate utility function", () => {
    it("should track @observableArray changes from numeric index setters", () => {
        class ViewModel {
            @observableArray array = [1, 2, 3] as ObservableArray<any>;
        }

        let vm = new ViewModel();
        let changes = [];

        vm.array.subscribe(val => { changes.push(...val); }, null, "arrayChange");

        mutate(() => vm.array, (array) => {
            array[1] = 4;
            array[2] = 5;
        });

        expect(vm.array).toEqual([1, 4, 5]);
        expect(changes).toEqual([
            { status: 'added', value: 4, index: 1 },
            { status: 'deleted', value: 2, index: 1 },
            { status: 'added', value: 5, index: 2 },
            { status: 'deleted', value: 3, index: 2 },
        ]);
    });
});