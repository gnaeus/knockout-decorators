/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
Symbol = undefined as any;
import * as ko from "knockout";
import { observable, observableArray, ObservableArray, subscribe, unwrap } from "../src/knockout-decorators";

describe("@observable({ deep: true, hiddenObservable:true }) decorator", () => {

  it("should combine deep observable objects and arrays", () => {
    class ViewModel {
      @observable({ deep: true, hiddenObservable:true })
      deepObservable = {                    // like @observable
        firstName: "Clive Staples",         // like @observable
        lastName: "Lewis",                  // like @observable

        array: [] as any[],                 // like @observableArray

        object: {                           // like @observable({ deep: true })
          foo: "bar",                       // like @observable
          reference: null as object | null, // like @observable({ deep: true })
        },
      };
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
    expect(ko.isObservable(vm._deepObservable)).toBeTruthy();

    expect(ko.isObservable(unwrap(vm.deepObservable, "firstName"))).toBeTruthy();
    expect(ko.isObservable(vm.deepObservable._firstName)).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable, "lastName"))).toBeTruthy();
    expect(ko.isObservable(vm.deepObservable._lastName)).toBeTruthy();

    expect(ko.isObservable(unwrap(vm.deepObservable, "array"))).toBeTruthy();
    expect(ko.isObservable(vm.deepObservable._array)).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable.array[0], "firstName"))).toBeTruthy();
    expect(ko.isObservable(vm.deepObservable.array[0]._firstName)).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable.array[0], "lastName"))).toBeTruthy();
    expect(ko.isObservable(vm.deepObservable.array[0]._lastName)).toBeTruthy();

    expect(ko.isObservable(unwrap(vm.deepObservable, "object"))).toBeTruthy();
    expect(ko.isObservable(vm.deepObservable._object)).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable.object, "foo"))).toBeTruthy();
    expect(ko.isObservable(vm.deepObservable.object._foo)).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable.object, "reference"))).toBeTruthy();
    expect(ko.isObservable(vm.deepObservable.object._reference)).toBeTruthy();

    expect(ko.isObservable(unwrap(vm.deepObservable.object.reference, "firstName"))).toBeTruthy();
    expect(ko.isObservable(vm.deepObservable.object.reference._firstName)).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable.object.reference, "lastName"))).toBeTruthy();
    expect(ko.isObservable(vm.deepObservable.object.reference._lastName)).toBeTruthy();
  });

  it("should be serializable to JSON", () => {
    class ViewModel {
      @observable({ deep: true, hiddenObservable: true })
      object = {
        property: "test",
        reference: {
          nested: 123,
        },
        array: [
          { x: 0, y: 0 },
        ],
      };
    }

    const vm = new ViewModel();

    const json = JSON.stringify(vm);

    expect(json).toBe('{"object":{"property":\"test\","reference":{"nested":123},"array":[{"x":0,"y":0}]}}');
  });
});
