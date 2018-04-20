/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
Symbol = undefined as any;
import * as ko from "knockout";
import { observable, observableArray, ObservableArray, subscribe, unwrap } from "../src/knockout-decorators";

describe("@observable({ deep: true }) decorator", () => {
  it("should throw on uninitialized properties", () => {
    class ViewModel {
      @observable({ deep: true })
      field: any;
    }

    const vm = new ViewModel();

    expect(() => vm.field).toThrowError("@observable property 'field' was not initialized");
  });

  it("should combine deep observable objects and arrays", () => {
    class ViewModel {
      @observable({ deep: true })
      deepObservable = {              // like @observable
        firstName: "Clive Staples",   // like @observable
        lastName: "Lewis",            // like @observable

        array: [] as any[],           // like @observableArray

        object: {                     // like @observable({ deep: true })
          foo: "bar",                 // like @observable
          reference: null as Object,  // like @observable({ deep: true })
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
    expect(ko.isObservable(unwrap(vm.deepObservable, "firstName"))).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable, "lastName"))).toBeTruthy();

    expect(ko.isObservable(unwrap(vm.deepObservable, "array"))).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable.array[0], "firstName"))).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable.array[0], "lastName"))).toBeTruthy();

    expect(ko.isObservable(unwrap(vm.deepObservable, "object"))).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable.object, "foo"))).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable.object, "reference"))).toBeTruthy();

    expect(ko.isObservable(unwrap(vm.deepObservable.object.reference, "firstName"))).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.deepObservable.object.reference, "lastName"))).toBeTruthy();
  });

  it("should be serializable to JSON", () => {
    class ViewModel {
      @observable({ deep: true })
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

describe("@observable({ deep: true }) decorator: initialized by object", () => {
  it("should define deep observable object property", () => {
    class ViewModel {
      @observable({ deep: true })
      object = {
        first: 123,
        second: "foo",
        reference: {
          nested: 789,
        },
      };
    }

    const vm = new ViewModel();

    const first = unwrap<number>(vm.object, "first");
    const second = unwrap<string>(vm.object, "second");
    const reference = unwrap<Object>(vm.object, "reference");
    const nested = unwrap<number>(vm.object.reference, "nested");

    expect(ko.isObservable(first)).toBeTruthy();
    expect(ko.isObservable(second)).toBeTruthy();
    expect(ko.isObservable(reference)).toBeTruthy();
    expect(ko.isObservable(nested)).toBeTruthy();
    expect(first()).toBe(123);
    expect(second()).toBe("foo");
    expect(reference()).toEqual({ nested: 789 });
    expect(nested()).toBe(789);
  });

  it("should track deep observable object properties changes", () => {
    class ViewModel {
      @observable({ deep: true })
      object = {
        first: 123,
        second: "foo",
        reference: {
          nested: 789,
        },
      };
    }

    const vm = new ViewModel();

    let first: number;
    let second: string;
    let nested: number;
    subscribe(() => vm.object.first, (value) => { first = value; });
    subscribe(() => vm.object.second, (value) => { second = value; });
    subscribe(() => vm.object.reference.nested, (value) => { nested = value; });

    vm.object.first = 456;
    vm.object.second = "bar";
    vm.object.reference.nested = 500;

    expect(first).toBe(456);
    expect(second).toBe("bar");
    expect(nested).toBe(500);
  });

  it("should modify plain objects", () => {
    class ViewModel {
      @observable({ deep: true })
      field: Object = null;
    }

    const vm = new ViewModel();

    const frozenObject = Object.freeze({ foo: "bar" });

    expect(() => { vm.field = frozenObject; }).toThrow();
  });

  it("should modify plain objects without prototype", () => {
    class ViewModel {
      @observable({ deep: true })
      field: Object = null;
    }

    const vm = new ViewModel();

    let frozenObject = Object.create(null);
    frozenObject.foo = "bar";
    frozenObject = Object.freeze({ foo: "bar" });

    expect(() => { vm.field = frozenObject; }).toThrow();
  });

  it("should modify plain objects with redefined 'constructor' property", () => {
    class ViewModel {
      @observable({ deep: true })
      field: Object = null;
    }

    const vm = new ViewModel();

    const frozenObject: any = Object.freeze({ constructor: "bar" });

    expect(() => { vm.field = frozenObject; }).toThrow();
  });

  it("should not modify class instances", () => {
    class Model { }

    class ViewModel {
      @observable({ deep: true })
      model: Object = null;
    }

    const vm = new ViewModel();

    const frozenObject = Object.freeze(new Model());

    vm.model = frozenObject;

    expect(vm.model).toBe(frozenObject);
  });

  it("should not modify class instances with redefined 'constructor' property", () => {
    class Model { }

    class ViewModel {
      @observable({ deep: true })
      model: Object = null;
    }

    const vm = new ViewModel();

    let frozenObject = new Model();
    frozenObject.constructor = Object;
    frozenObject = Object.freeze(frozenObject);

    vm.model = frozenObject;

    expect(vm.model).toBe(frozenObject);
  });

  it("should work with circular references", () => {
    interface Circular {
      reference: Circular;
    }

    class ViewModel {
      @observable({ deep: true })
      object: Circular = null;
    }

    const vm = new ViewModel();

    const circular = {
      reference: null as Circular,
    };
    circular.reference = circular;

    vm.object = circular;

    expect(vm.object).toBe(vm.object.reference);
    expect(ko.isObservable(unwrap(vm, "object"))).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.object, "reference"))).toBeTruthy();
  });
});

describe("@observable({ deep: true }) decorator: initialized by array", () => {
  it("should define deep observableArray property", () => {
    class ViewModel {
      @observable({ deep: true })
      array: any[] = [];
    }

    const vm = new ViewModel();

    const array = Object.getOwnPropertyDescriptor(vm, "array").get;

    expect(ko.isObservable(array)).toBeTruthy();
    expect(Object.getPrototypeOf(array)).toBe(ko.observableArray.fn);
  });

  it("should define deep @observableArray property", () => {
    class ViewModel {
      @observableArray({ deep: true })
      array: any[] = [];
    }

    const vm = new ViewModel();

    const array = Object.getOwnPropertyDescriptor(vm, "array").get;

    expect(ko.isObservable(array)).toBeTruthy();
    expect(Object.getPrototypeOf(array)).toBe(ko.observableArray.fn);
  });

  it("should track deep observableArray changes", () => {
    class ViewModel {
      @observable({ deep: true })
      array: { x: number, y: number }[] = [];
    }

    const vm = new ViewModel();

    let changesCount = 0;
    subscribe(() => vm.array, () => { changesCount++; });

    vm.array.push({ x: 1, y: 1 });
    vm.array = [{ x: 1, y: 1 }, { x: 2, y: 2 }];

    expect(changesCount).toBe(2);
  });

  it("should modify plain object array items", () => {
    class ViewModel {
      @observable({ deep: true })
      array: Object[] = [];
    }

    const vm = new ViewModel();

    const frozenObject = Object.freeze({ foo: "bar" });

    expect(() => { vm.array.push(frozenObject); }).toThrow();
  });

  it("should not modify class instance array items", () => {
    class Model { }

    class ViewModel {
      @observable({ deep: true })
      array: Model[] = [];
    }

    const vm = new ViewModel();

    const frozenObject = Object.freeze(new Model());
    vm.array.push(frozenObject);

    expect(vm.array[0]).toBe(frozenObject);
  });

  it("should work with circular references", () => {
    interface Circular {
      array: Circular[];
    }

    class ViewModel {
      @observable({ deep: true })
      array: Circular[] = [];
    }

    const vm = new ViewModel();

    const circular = {
      array: [] as Circular[],
    };
    circular.array.push(circular);

    vm.array = circular.array;

    expect(vm.array).toBe(vm.array[0].array);
    expect(ko.isObservable(unwrap(vm, "array"))).toBeTruthy();
    expect(ko.isObservable(unwrap(vm.array[0], "array"))).toBeTruthy();

    let firstLevelChanged = false;
    subscribe(() => vm.array, () => { firstLevelChanged = true; });

    const nested = vm.array[0];
    let secondLevelChanged = false;
    subscribe(() => nested.array, () => { secondLevelChanged = true; });

    vm.array.push({
      array: [] as Circular[],
    });

    expect(firstLevelChanged).toBe(true);
    // it is because vm.array[0].array has different hidden observale
    expect(secondLevelChanged).toBe(false);
  });

  it("should expose knockout-specific methods", () => {
    class ViewModel {
      @observable({ deep: true })
      first = [1, 2, 3, 4, 3, 2, 1] as ObservableArray<number>;
      @observable({ deep: true })
      second = [1, 2, 3, 4, 3, 2, 1] as ObservableArray<number>;
    }

    const vm = new ViewModel();
    const changesFirst: KnockoutArrayChange<number>[] = [];
    const changesSecond: KnockoutArrayChange<number>[] = [];

    vm.first.subscribe((val) => { changesFirst.push(...val); }, null, "arrayChange");
    vm.second.subscribe((val) => { changesSecond.push(...val); }, null, "arrayChange");

    // test: remove, splice, replace
    vm.first.remove((val) => val % 2 === 0);
    vm.first.splice(2, 0, 5);
    vm.first.replace(5, 7);

    expect(vm.first).toEqual([1, 3, 7, 3, 1]);
    expect(changesFirst).toEqual([
      { status: "deleted", value: 2, index: 1 },
      { status: "deleted", value: 4, index: 3 },
      { status: "deleted", value: 2, index: 5 },
      { status: "added", value: 5, index: 2 },
      { status: "added", value: 7, index: 2 },
      { status: "deleted", value: 5, index: 2 },
    ]);

    // test: splice, unshift
    vm.second.splice(0, 3, -1, -2, -3);
    vm.second.unshift(-0);
    vm.second.splice(4, 4);

    expect(vm.second).toEqual([-0, -1, -2, -3]);
    expect(changesSecond).toEqual([
      { status: "deleted", value: 1, index: 0 },
      { status: "added", value: -1, index: 0 },
      { status: "deleted", value: 2, index: 1 },
      { status: "added", value: -2, index: 1 },
      { status: "deleted", value: 3, index: 2 },
      { status: "added", value: -3, index: 2 },
      { status: "added", value: -0, index: 0 },
      { status: "deleted", value: 4, index: 4 },
      { status: "deleted", value: 3, index: 5 },
      { status: "deleted", value: 2, index: 6 },
      { status: "deleted", value: 1, index: 7 },
    ]);
  });

  it("should define optimized splice method", () => {
    class ViewModel {
      @observable({ deep: true })
      array = [] as ObservableArray<number>;
    }

    const vm = new ViewModel();

    vm.array.splice(0, 0, 1, 2, 3);
    vm.array.splice(4, 0, 4);
    vm.array.splice(5, 0);
    (vm.array as any).splice();

    expect(vm.array).toEqual([1, 2, 3, 4]);
  });

  it("should clear array methods on previous observableArray value", () => {
    class ViewModel {
      @observable({ deep: true })
      array = [1, 2, 3];
    }

    const vm = new ViewModel();
    const previous = vm.array;
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

  it("should clone array if it is @observableArray from another field", () => {
    class ViewModel {
      @observable({ deep: true })
      arrayFirst = [1, 2] as ObservableArray<number>;
      @observable({ deep: true })
      arraySecond = [3, 4] as ObservableArray<number>;
    }

    const vm = new ViewModel();
    const changesFirst: KnockoutArrayChange<number>[] = [];
    const changesSecond: KnockoutArrayChange<number>[] = [];

    vm.arrayFirst.subscribe((val) => { changesFirst.push(...val); }, null, "arrayChange");
    vm.arraySecond.subscribe((val) => { changesSecond.push(...val); }, null, "arrayChange");

    // assign pointer to array
    vm.arrayFirst = vm.arraySecond;
    vm.arrayFirst.push(5, 6);

    expect(vm.arrayFirst).not.toBe(vm.arraySecond);

    expect(vm.arrayFirst).toEqual([3, 4, 5, 6]);
    expect(vm.arraySecond).toEqual([3, 4]);

    expect(changesFirst).toEqual([
      { status: "added", value: 3, index: 0 },
      { status: "deleted", value: 1, index: 0 },
      { status: "added", value: 4, index: 1 },
      { status: "deleted", value: 2, index: 1 },
      { status: "added", value: 5, index: 2 },
      { status: "added", value: 6, index: 3 },
    ]);
    expect(changesSecond).toEqual([]);
  });

  it("should have 'mutate' method", () => {
    class ViewModel {
      @observable({ deep: true })
      array = [1, 2, 3] as ObservableArray<any>;
    }

    const vm = new ViewModel();
    const changes: KnockoutArrayChange<number>[] = [];

    vm.array.subscribe((val) => { changes.push(...val); }, null, "arrayChange");

    vm.array.mutate((array) => {
      array[1] = 4;
    });

    expect(vm.array).toEqual([1, 4, 3]);
    expect(changes).toEqual([
      { status: "added", value: 4, index: 1 },
      { status: "deleted", value: 2, index: 1 },
    ]);
  });

  it("should have 'set' method", () => {
    class ViewModel {
      @observable({ deep: true })
      array = [1, 2, 3] as ObservableArray<any>;
    }

    const vm = new ViewModel();
    const changes: KnockoutArrayChange<number>[] = [];

    vm.array.subscribe((val) => { changes.push(...val); }, null, "arrayChange");

    const oldValue = vm.array.set(1, 4);

    expect(oldValue).toBe(2);
    expect(vm.array).toEqual([1, 4, 3]);
    expect(changes).toEqual([
      { status: "deleted", value: 2, index: 1 },
      { status: "added", value: 4, index: 1 },
    ]);
  });
});
