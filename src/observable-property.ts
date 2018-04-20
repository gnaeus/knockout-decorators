/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";
import {
  defineProperty, getPrototypeOf, hasOwnProperty, isArray, objectForEach, PATCHED_KEY,
} from "./common-functions";
import { defineObservableArray } from "./observable-array";
import { applyExtenders } from "./property-extenders";

export function defineObservableProperty(
  instance: Object, key: string | symbol, value: any, deep: boolean,
) {
  const observable = applyExtenders(instance, key, ko.observable());

  let setter = observable as any;

  if (deep) {
    setter = function (newValue: any) {
      observable(prepareDeepValue(newValue));
    };
  }

  defineProperty(instance, key, {
    enumerable: true,
    get: observable,
    set: setter,
  });

  setter(value);
}

export function prepareDeepValue(value: any) {
  if (typeof value === "object") {
    if (isArray(value) || value === null) {
      // value is Array or null
      return value;
    } else if (hasOwnProperty(value, "constructor")) {
      // there is redefined own property "constructor"
      const prototype = getPrototypeOf(value);
      if (prototype === Object.prototype || prototype === null) {
        // value is plain Object
        return prepareDeepObject(value);
      }
    } else if (value.constructor === Object) {
      // value is plain Object
      return prepareDeepObject(value);
    }
  }
  // value is primitive, function or class instance
  return value;
}

export function prepareDeepObject(instance: Object) {
  if (!hasOwnProperty(instance, PATCHED_KEY)) {
    // mark instance as ObservableObject
    defineProperty(instance, PATCHED_KEY, {
      value: true,
    });
    // define deep observable properties
    objectForEach(instance, (key, value) => {
      if (isArray(value)) {
        defineObservableArray(instance, key, value, true);
      } else {
        defineObservableProperty(instance, key, value, true);
      }
    });
  }
  return instance;
}
