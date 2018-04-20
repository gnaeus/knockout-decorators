/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
Symbol = undefined as any;
import * as ko from "knockout";
import { computed, extend, observable, observableArray, subscribe } from "../src/knockout-decorators";

describe("@extend decorator", () => {
  ko.extenders["reverse"] = (target: KnockoutObservable<any>, options: "read" | "write") => {
    if (options === "read") {
      return ko.pureComputed({
        read: () => reverse(target()),
        write: target,
      });
    } else if (options === "write") {
      return ko.pureComputed({
        read: target,
        write: (value: any) => target(reverse(value)),
      });
    }
    return void 0;

    function reverse(value: any) {
      return value instanceof Array
        ? value.reverse()
        : String(value).split("").reverse().join("");
    }
  };

  ko.extenders["upperCase"] = (target: KnockoutObservable<any>, options: "read" | "write") => {
    if (options === "read") {
      return ko.pureComputed({
        read: () => String(target()).toUpperCase(),
        write: target,
      });
    } else if (options === "write") {
      return ko.pureComputed({
        read: target,
        write: (value) => target(String(value).toUpperCase()),
      });
    }
    return void 0;
  };

  it("should extend @observable", () => {
    class ViewModel {
      @extend({ reverse: "write" })
      @observable observable = "abcdef";
    }

    const vm = new ViewModel();

    expect(vm.observable).toBe("fedcba");
  });

  it("should extend deep @observable", () => {
    class ViewModel {
      @extend({ reverse: "write" })
      @observable({ deep: true })
      observable = "abcdef";
    }

    const vm = new ViewModel();

    expect(vm.observable).toBe("fedcba");
  });

  it("should extend @observableArray", () => {
    class ViewModel {
      @extend({ reverse: "write" })
      @observableArray array = [1, 2, 3, 4];
    }

    const vm = new ViewModel();

    expect(vm.array).toEqual([4, 3, 2, 1]);
  });

  it("should accept extenders factory", () => {
    class ViewModel {
      @extend(ViewModel.prototype.getExtender)
      @observable observable = "abcdef";

      getExtender() {
        return { reverse: "write" };
      }
    }

    const vm = new ViewModel();

    expect(vm.observable).toBe("fedcba");
  });

  it("should be combinable with other @extend", () => {
    class ViewModel {
      @extend({ upperCase: "write" })
      @extend({ reverse: "read" })
      @observable observable = "abcdef";
    }

    const vm = new ViewModel();

    expect(vm.observable).toBe("FEDCBA");
  });

  it("should extend base class properties", () => {
    class Base {
      @extend({ reverse: "read" })
      @observable base = "abcdef";
    }

    class Derived extends Base {
      @extend({ upperCase: "read" })
      @observable derived = "abcdef";
    }

    const vm = new Derived();

    expect(vm.base).toBe("fedcba");
    expect(vm.derived).toBe("ABCDEF");
  });

  it("should extend getter @computed", () => {
    class ViewModel {
      @observable observable = "";

      @extend({ reverse: "read" })
      @computed get computed() {
        return this.observable.substr(0, 4);
      }
    }

    const vm = new ViewModel();
    let result: string = "";

    ko.computed(() => { result = vm.computed; });

    vm.observable = "abcdef";

    expect(vm.observable).toBe("abcdef");
    expect(result).toBe("dcba");
  });

  it("should work with 'subscribe' utility function", () => {
    class ViewModel {
      @extend({ reverse: "read" })
      @observable observable = "";
    }

    const vm = new ViewModel();
    let result: string = "";

    subscribe(() => vm.observable, (value) => {
      result = value;
    });

    vm.observable = "abcdef";

    expect(result).toBe("fedcba");
  });

  it("should work with 'subscribe' utility function", async () => {
    class ViewModel {
      @extend({ rateLimit: 50 })
      @observable observable = "";
    }

    const vm = new ViewModel();
    let result: string = "";

    subscribe(() => vm.observable, (value) => {
      result = value;
    });

    vm.observable = "abcdef";

    await new Promise((resolve) => {
      setTimeout(resolve, 80);
    });

    expect(result).toBe("abcdef");
  });
});
