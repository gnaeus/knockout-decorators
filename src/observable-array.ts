/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";
import { arraySlice, defineProperty, hasOwnProperty, PATCHED_KEY } from "./common-functions";
import { prepareReactiveValue } from "./observable-property";
import { applyExtenders } from "./property-extenders";

type ObsArray = KnockoutObservableArray<any> & { [fnName: string]: Function };

const deepArrayMethods = ["pop", "reverse", "shift", "sort"];
const allArrayMethods = [...deepArrayMethods, "push", "splice", "unshift"];

const deepObservableArrayMethods = ["remove", "removeAll", "destroy", "destroyAll", "replace", "subscribe"];
const allObservableArrayMethods = [...deepObservableArrayMethods, "replace"];

const allMethods = [...allArrayMethods, ...allObservableArrayMethods, "mutate", "set"];

export function defineObservableArray(
    instance: Object, key: string | symbol, value: any[], deep: boolean,
) {
    const obsArray = applyExtenders(instance, key, ko.observableArray()) as ObsArray;

    let insideObsArray = false;

    defineProperty(instance, key, {
        configurable: true,
        enumerable: true,
        get: obsArray,
        set: setter,
    });

    setter(value);

    function setter(newValue: any[]) {
        const lastValue = obsArray.peek();
        // if we got new value
        if (lastValue !== newValue) {
            if (Array.isArray(lastValue)) {
                // if lastValue array methods were already patched
                if (hasOwnProperty(lastValue, PATCHED_KEY)) {
                    delete lastValue[PATCHED_KEY];
                    // clear patched array methods on lastValue (see unit tests)
                    allMethods.forEach((fnName) => {
                        delete lastValue[fnName];
                    });
                }
            }
            if (Array.isArray(newValue)) {
                // if new value array methods were already connected with another @observable
                if (hasOwnProperty(newValue, PATCHED_KEY)) {
                    // clone new value to prevent corruption of another @observable (see unit tests)
                    newValue = [...newValue];
                }
                // if deep option is set
                if (deep) {
                    // make all array items reactive
                    for (let i = 0; i < newValue.length; ++i) {
                        newValue[i] = prepareReactiveValue(newValue[i]);
                    }
                }
                // mark instance as ObservableArray
                defineProperty(newValue, PATCHED_KEY, {
                    configurable: true,
                    value: true,
                });
                // call ko.observableArray.fn[fnName] instead of Array.prototype[fnName]
                patchArrayMethods(newValue);
            }
        }
        // update obsArray contents
        insideObsArray = true;
        obsArray(newValue);
        insideObsArray = false;
    }

    function patchArrayMethods(array: any[]) {
        const arrayMethods = deep ? deepArrayMethods : allArrayMethods;

        arrayMethods.forEach((fnName) => defineProperty(array, fnName, {
            configurable: true,
            value() {
                if (insideObsArray) {
                    return Array.prototype[fnName].apply(array, arguments);
                }
                insideObsArray = true;
                const result = obsArray[fnName].apply(obsArray, arguments);
                insideObsArray = false;
                return result;
            },
        }));

        const observableArrayMethods = deep ? deepObservableArrayMethods : allObservableArrayMethods;

        observableArrayMethods.forEach((fnName) => defineProperty(array, fnName, {
            configurable: true,
            value() {
                insideObsArray = true;
                const result = obsArray[fnName].apply(obsArray, arguments);
                insideObsArray = false;
                return result;
            },
        }));

        if (deep) {
            defineProperty(array, "push", {
                configurable: true,
                value() {
                    if (insideObsArray) {
                        return Array.prototype.push.apply(array, arguments);
                    }
                    let args = arraySlice(arguments);
                    for (let i = 0; i < args.length; ++i) {
                        args[i] = prepareReactiveValue(args[i]);
                    }
                    insideObsArray = true;
                    const result = obsArray.push.apply(obsArray, args);
                    insideObsArray = false;
                    return result;
                },
            });

            defineProperty(array, "unshift", {
                configurable: true,
                value() {
                    if (insideObsArray) {
                        return Array.prototype.unshift.apply(array, arguments);
                    }
                    let args = arraySlice(arguments);
                    for (let i = 0; i < args.length; ++i) {
                        args[i] = prepareReactiveValue(args[i]);
                    }
                    insideObsArray = true;
                    const result = obsArray.unshift.apply(obsArray, args);
                    insideObsArray = false;
                    return result;
                },
            });

            defineProperty(array, "splice", {
                configurable: true,
                value() {
                    if (insideObsArray) {
                        return Array.prototype.splice.apply(array, arguments);
                    }

                    let result: any[];

                    insideObsArray = true;
                    switch (arguments.length) {
                        case 0:
                        case 1:
                        case 2: {
                            result = obsArray.splice.apply(obsArray, arguments);
                            break;
                        }
                        case 3: {
                            result = obsArray.splice(
                                arguments[0], arguments[1], prepareReactiveValue(arguments[2]),
                            );
                            break;
                        }
                        default: {
                            const args = arraySlice(arguments);
                            for (let i = 2; i < args.length; ++i) {
                                args[i] = prepareReactiveValue(args[i]);
                            }
                            result = obsArray.splice.apply(obsArray, arguments);
                            break;
                        }
                    }
                    insideObsArray = false;

                    return result;
                },
            });

            defineProperty(array, "replace", {
                configurable: true,
                value(oldItem: any, newItem: any) {
                    insideObsArray = true;
                    const result = obsArray.replace(oldItem, prepareReactiveValue(newItem));
                    insideObsArray = false;
                    return result;
                },
            });

            defineProperty(array, "mutate", {
                configurable: true,
                value(mutator: (array?: any[]) => void) {
                    const nativeArray = obsArray.peek();
                    // it is defined for ko.observableArray
                    (obsArray.valueWillMutate as Function)();
                    mutator(nativeArray);
                    for (let i = 0; i < nativeArray.length; ++i) {
                        nativeArray[i] = prepareReactiveValue(nativeArray[i]);
                    }
                    // it is defined for ko.observableArray
                    (obsArray.valueHasMutated as Function)();
                },
            });

            defineProperty(array, "set", {
                configurable: true,
                value(index: number, newItem: any) {
                    return obsArray.splice(index, 1, prepareReactiveValue(newItem))[0];
                },
            });
        } else {
            defineProperty(array, "mutate", {
                configurable: true,
                value(mutator: (array?: any[]) => void) {
                    // it is defined for ko.observableArray
                    (obsArray.valueWillMutate as Function)();
                    mutator(obsArray.peek());
                    // it is defined for ko.observableArray
                    (obsArray.valueHasMutated as Function)();
                },
            });

            defineProperty(array, "set", {
                configurable: true,
                value(index: number, newItem: any) {
                    return obsArray.splice(index, 1, newItem)[0];
                },
            });
        }
    }
}

export interface ObservableArray<T> extends Array<T> {
    replace(oldItem: T, newItem: T): void;

    remove(item: T): T[];
    remove(removeFunction: (item: T) => boolean): T[];

    removeAll(): T[];
    removeAll(items: T[]): T[];

    destroy(item: T): void;
    destroy(destroyFunction: (item: T) => boolean): void;

    destroyAll(): void;
    destroyAll(items: T[]): void;

    subscribe(callback: (val: T[]) => void): KnockoutSubscription;
    subscribe(callback: (val: T[]) => void, callbackTarget: any): KnockoutSubscription;
    subscribe(callback: (val: any[]) => void, callbackTarget: any, event: string): KnockoutSubscription;

    /**
     * Run mutator function that can write to array at some index (`array[index] = value;`)
     * Then notify about observableArray changes
     */
    mutate(mutator: (arrayValue: T[]) => void): void;

    /**
     * Replace value at some index and return old value
     */
    set(index: number, value: T): T;
}
