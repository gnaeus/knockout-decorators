/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";
import { observable } from "../src/knockout-decorators";

describe("@observable decorator", () => {
  it("should throw on uninitialized properties", () => {
    class ViewModel {
      @observable text: any;
    }

    const vm = new ViewModel();

    expect(() => vm.text).toThrowError("@observable property 'text' was not initialized");
  });

  it("should define hidden observable", () => {
    class ViewModel {
      @observable text = "";
    }

    const vm = new ViewModel();

    const text = Object.getOwnPropertyDescriptor(vm, "text")!.get;

    expect(ko.isObservable(text)).toBeTruthy();
  });

  it("should define hidden observableArray when initialized by array", () => {
    class ViewModel {
      @observable array: any[] = [];
    }

    const vm = new ViewModel();

    const array = Object.getOwnPropertyDescriptor(vm, "array")!.get;

    expect(ko.isObservable(array)).toBeTruthy();
    expect(Object.getPrototypeOf(array)).toBe(ko.observableArray.fn);
  });

  it("should track hidden observable changes", () => {
    class ViewModel {
      @observable text = "";
    }

    const vm = new ViewModel();

    let changedText;
    ko.pureComputed(() => vm.text).subscribe((value) => { changedText = value; });

    vm.text = "test";

    expect(changedText).toBe("test");
  });

  it("should not modify property value", () => {
    class ViewModel {
      @observable field: object | null = null;
    }

    const vm = new ViewModel();

    const frozenObject = Object.freeze({ foo: "bar" });
    vm.field = frozenObject;

    expect(vm.field).toBe(frozenObject);
  });
});
