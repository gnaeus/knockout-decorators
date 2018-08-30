/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";
import { ArrayPrototype, arraySlice, defineProperty, hasOwnProperty, isArray, PATCHED_KEY } from "./common-functions";
import { prepareDeepValue } from "./observable-property";
import { applyExtenders } from "./property-extenders";

type ObsArray = KnockoutObservableArray<any> & { [fnName: string]: Function };

const deepArrayMethods = ["pop", "reverse", "shift", "sort"];
const allArrayMethods = [...deepArrayMethods, "push", "splice", "unshift"];

const deepObservableArrayMethods = ["remove", "removeAll", "destroy", "destroyAll", "replace", "subscribe"];
const allObservableArrayMethods = [...deepObservableArrayMethods, "replace"];

const allMethods = [...allArrayMethods, ...allObservableArrayMethods, "mutate", "set"];

export function defineObservableArray(
  instance: Object, key: string | symbol, value: any[], deep: boolean, expose: boolean,
) {
  const obsArray = applyExtenders(instance, key, ko.observableArray()) as ObsArray;

  let insideObsArray = false;

  defineProperty(instance, key, {
    enumerable: true,
    get: obsArray,
    set: setter,
  });
  if (expose) {
    defineProperty(instance, "_" + key.toString(), {
      value: obsArray,
    });
  }

  setter(value);

  function setter(newValue: any[]) {
    const lastValue = obsArray.peek();
    // if we got new value
    if (lastValue !== newValue) {
      if (isArray(lastValue)) {
        // if lastValue array methods were already patched
        if (hasOwnProperty(lastValue, PATCHED_KEY)) {
          delete lastValue[PATCHED_KEY];
          // clear patched array methods on lastValue (see unit tests)
          allMethods.forEach((fnName) => {
            delete lastValue[fnName];
          });
        }
      }
      if (isArray(newValue)) {
        // if new value array methods were already connected with another @observable
        if (hasOwnProperty(newValue, PATCHED_KEY)) {
          // clone new value to prevent corruption of another @observable (see unit tests)
          newValue = [...newValue];
        }
        // if deep option is set
        if (deep) {
          // make all array items deep observable
          for (let i = 0; i < newValue.length; ++i) {
            newValue[i] = prepareDeepValue(newValue[i], expose);
          }
        }
        // mark instance as ObservableArray
        defineProperty(newValue, PATCHED_KEY, {
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
      value() {
        if (insideObsArray) {
          return ArrayPrototype[fnName].apply(array, arguments);
        }
        insideObsArray = true;
        const result = obsArray[fnName].apply(obsArray, arguments);
        insideObsArray = false;
        return result;
      },
    }));

    const observableArrayMethods = deep ? deepObservableArrayMethods : allObservableArrayMethods;

    observableArrayMethods.forEach((fnName) => defineProperty(array, fnName, {
      value() {
        insideObsArray = true;
        const result = obsArray[fnName].apply(obsArray, arguments);
        insideObsArray = false;
        return result;
      },
    }));

    if (deep) {
      defineProperty(array, "push", {
        value() {
          if (insideObsArray) {
            return ArrayPrototype.push.apply(array, arguments);
          }
          const args = arraySlice(arguments);
          for (let i = 0; i < args.length; ++i) {
            args[i] = prepareDeepValue(args[i], expose);
          }
          insideObsArray = true;
          const result = obsArray.push.apply(obsArray, args);
          insideObsArray = false;
          return result;
        },
      });

      defineProperty(array, "unshift", {
        value() {
          if (insideObsArray) {
            return ArrayPrototype.unshift.apply(array, arguments);
          }
          const args = arraySlice(arguments);
          for (let i = 0; i < args.length; ++i) {
            args[i] = prepareDeepValue(args[i], expose);
          }
          insideObsArray = true;
          const result = obsArray.unshift.apply(obsArray, args);
          insideObsArray = false;
          return result;
        },
      });

      defineProperty(array, "splice", {
        value() {
          if (insideObsArray) {
            return ArrayPrototype.splice.apply(array, arguments);
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
                arguments[0], arguments[1], prepareDeepValue(arguments[2], expose),
              );
              break;
            }
            default: {
              const args = arraySlice(arguments);
              for (let i = 2; i < args.length; ++i) {
                args[i] = prepareDeepValue(args[i], expose);
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
        value(oldItem: any, newItem: any) {
          insideObsArray = true;
          const result = obsArray.replace(oldItem, prepareDeepValue(newItem, expose));
          insideObsArray = false;
          return result;
        },
      });

      defineProperty(array, "mutate", {
        value(mutator: (array?: any[]) => void) {
          const nativeArray = obsArray.peek();
          // it is defined for ko.observableArray
          (obsArray.valueWillMutate as Function)();
          mutator(nativeArray);
          for (let i = 0; i < nativeArray.length; ++i) {
            nativeArray[i] = prepareDeepValue(nativeArray[i], expose);
          }
          // it is defined for ko.observableArray
          (obsArray.valueHasMutated as Function)();
        },
      });

      defineProperty(array, "set", {
        value(index: number, newItem: any) {
          return obsArray.splice(index, 1, prepareDeepValue(newItem, expose))[0];
        },
      });
    } else {
      defineProperty(array, "mutate", {
        value(mutator: (array?: any[]) => void) {
          // it is defined for ko.observableArray
          (obsArray.valueWillMutate as Function)();
          mutator(obsArray.peek());
          // it is defined for ko.observableArray
          (obsArray.valueHasMutated as Function)();
        },
      });

      defineProperty(array, "set", {
        value(index: number, newItem: any) {
          return obsArray.splice(index, 1, newItem)[0];
        },
      });
    }
  }
}
