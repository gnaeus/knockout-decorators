/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import { arraySlice, defineProperty } from "../common-functions";

// for `new ObservableArrayProxy(...) instanceof Array === true`
class ArrayStub { }
ArrayStub.prototype = Array.prototype;

export class ObservableArrayProxy<T> extends ArrayStub {
  /** @private */
  static _maxLength = 0;

  /** @private */
  _observableArray: KnockoutObservableArray<T>;

  /** @private */
  _preapreArrayItem: (item: T) => T;

  constructor(
    observableArray: KnockoutObservableArray<T>,
    preapreArrayItem?: (item: T) => T,
  ) {
    super();

    defineProperty(this, "_observableArray", {
      value: observableArray,
    });

    defineProperty(this, "_preapreArrayItem", {
      value: preapreArrayItem,
    });

    const array = this._observableArray.peek();

    this._prepareArrayItems(array);

    this._defineArrayIndexAccessors(array.length);
  }

  /** @private */
  _prepareArrayItems(array: T[], start = 0) {
    if (this._preapreArrayItem) {
      for (let i = start; i < array.length; ++i) {
        array[i] = this._preapreArrayItem(array[i]);
      }
    }
  }

  /** @private */
  _defineArrayIndexAccessors(length: number) {
    if (ObservableArrayProxy._maxLength < length) {
      for (let i = ObservableArrayProxy._maxLength; i < length; i++) {
        defineProperty(ObservableArrayProxy.prototype, i.toString(), {
          enumerable: true,
          get<T>(this: ObservableArrayProxy<T>) {
            return this._observableArray()[i];
          },
          set<T>(this: ObservableArrayProxy<T>, value: T) {
            if (this._preapreArrayItem) {
              value = this._preapreArrayItem(value);
            }
            this._observableArray.splice(i, 1, value);
          },
        });
      }
      ObservableArrayProxy._maxLength = length;
    }
  }

  /** Array.prototype.push() */
  public push() {
    const args = arraySlice(arguments);
    this._prepareArrayItems(args);
    this._defineArrayIndexAccessors(this._observableArray.length + args.length);
    return this._observableArray.push.apply(this._observableArray, args);
  }

  /** Array.prototype.unshift() */
  public unshift() {
    const args = arraySlice(arguments);
    this._prepareArrayItems(args);
    this._defineArrayIndexAccessors(this._observableArray.length + args.length);
    return this._observableArray.unshift.apply(this._observableArray, args);
  }

  /** Array.prototype.splice() */
  public splice(start: number, remove: number) {
    const args = arraySlice(arguments);
    this._prepareArrayItems(args, 2);

    const append = Math.max(args.length - 2, 0);
    const length = this._observableArray.length;
    if (start === void 0) {
      start = length;
    } else if (start < 0) {
      start = Math.max(length - start, 0);
    } else if (start > length) {
      start = length;
    }
    if (remove === void 0) {
      remove = length - start;
    } else if (remove < 0) {
      remove = 0;
    }
    if (start + remove > length) {
      remove = length - start;
    }

    this._defineArrayIndexAccessors(length - remove + append);
    return this._observableArray.splice.apply(this._observableArray, args);
  }

  /** ko.observableArray.fn.replace() */
  public replace(oldItem: any, newItem: any) {
    if (this._preapreArrayItem) {
      newItem = this._preapreArrayItem(newItem);
    }
    return this._observableArray.replace(oldItem, newItem);
  }

  /**
   * ko.observable.fn.peek()
   *
   * Get native array instance. If called from ko.computed() then dependency will not be registered.
   */
  public peek() {
    return this._observableArray.peek();
  }

  /**
   * Get native array instance. If called from ko.computed() then dependency will be registered.
   */
  public unwrap() {
    return this._observableArray();
  }

  /** Object.prototype.toJSON() */
  protected toJSON() {
    return this._observableArray();
  }
}

defineProperty(ObservableArrayProxy.prototype, "length", {
  get<T>(this: ObservableArrayProxy<T>) {
    return this._observableArray().length;
  },
});

[
  "constructor",
  "push",
  "unshift",
  "splice",
  "replace",
  "peek",
  "unwrap",
  "toJSON",
  "_prepareArrayItems",
  "_defineArrayIndexAccessors",
].forEach((key) => {
  defineProperty(ObservableArrayProxy.prototype, key, {
    value: ObservableArrayProxy.prototype[key],
  });
});

[
  // Array.prototype[fnName]
  "concat",
  "every",
  "filter",
  "find",
  "findIndex",
  "forEach",
  "includes",
  "indexOf",
  "join",
  "keys",
  "lastIndexOf",
  "map",
  "reduce",
  "reduceRight",
  "slice",
  "some",
  "toLocaleString",
  "toString",
].forEach((fnName) => {
  defineProperty(ObservableArrayProxy.prototype, fnName, {
    value<T>(this: ObservableArrayProxy<T>) {
      const nativeArray = this._observableArray();
      return nativeArray[fnName].apply(nativeArray, arguments);
    },
  });
});

[
  // Array.prototype[fnName]
  "pop",
  "reverse",
  "shift",
  "sort",
  // ko.observableArray.fn[fnName]
  "remove",
  "removeAll",
  "destroy",
  "destroyAll",
  "subscribe",
].forEach((fnName) => {
  defineProperty(ObservableArrayProxy.prototype, fnName, {
    value<T>(this: ObservableArrayProxy<T>) {
      const observableArray = this._observableArray as any;
      return observableArray[fnName].apply(observableArray, arguments);
    },
  });
});
