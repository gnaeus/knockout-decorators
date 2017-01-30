/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";
import { objectForEach, defineProperty, hasOwnProperty, getPrototypeOf } from "./common-functions";
import { applyExtenders } from "./property-extenders";
import { defineObservableArray } from "./observable-array";

export function defineObservableProperty(
    instance: Object, key: string | symbol, value: any, deep: boolean
) {
    const observable = applyExtenders(instance, key, ko.observable());

    let setter = observable as Function;
    
    if (deep) {
        setter = function (newValue: any) {
            observable(prepareReactiveValue(newValue));
        };
    }

    defineProperty(instance, key, {
        configurable: true,
        enumerable: true,
        get: observable,
        set: setter,
    });
    
    setter(value);
}

export function prepareReactiveValue(value: any) {
    if (typeof value === "object") {
        if (Array.isArray(value) || value === null) {
            // value is Array or null
            return value;
        } else if (value.constructor === Object) {
            // value is plain Object
            return prepareReactiveObject(value); 
        } else if (hasOwnProperty(value, "constructor")) {
            const prototype = getPrototypeOf(value);
            if (prototype === Object.prototype || prototype === null) {
                // value is plain Object
                return prepareReactiveObject(value);
            }
        }
    }
    // value is primitive, function or class instance
    return value;
}

const REACTIVE_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators_reactive") : "__ko_decorators_reactive__";

export function prepareReactiveObject(instance: Object) {
    if (!hasOwnProperty(instance, REACTIVE_KEY)) {
        // mark instance as ObservableObject
        defineProperty(instance, REACTIVE_KEY, {
            configurable: true,
            value: void 0,
        });
        // define deep observable properties
        objectForEach(instance, (key, value) => {
            if (Array.isArray(value)) {
                defineObservableArray(instance, key, value, true);
            } else {
                defineObservableProperty(instance, key, value, true);
            }
        });
    }
    return instance;
}