import { computed, components, utils, subscribable, observableArray, observable } from 'knockout';

/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
const prefix = "__ko_decorators_";
let PATCHED_KEY = prefix + "patched__";
let EXTENDERS_KEY = prefix + "extenders__";
let SUBSCRIPTIONS_KEY = prefix + "subscriptions__";
if (typeof Symbol !== "undefined") {
    PATCHED_KEY = Symbol(PATCHED_KEY);
    EXTENDERS_KEY = Symbol(EXTENDERS_KEY);
    SUBSCRIPTIONS_KEY = Symbol(SUBSCRIPTIONS_KEY);
}
// tslint:disable-next-line:variable-name
const ArrayPrototype = Array.prototype;
function defineProperty(instance, key, descriptor) {
    descriptor.configurable = true;
    Object.defineProperty(instance, key, descriptor);
}
const extendObject = utils.extend;
const objectForEach = utils.objectForEach;
const isArray = Array.isArray.bind(Array);
const getPrototypeOf = Object.getPrototypeOf.bind(Object);
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
const hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
const arraySlice = Function.prototype.call.bind(ArrayPrototype.slice);

/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
function defineEventProperty(instance, key) {
    const subscribable$$1 = new subscribable();
    const event = function () {
        const eventArgs = arraySlice(arguments);
        subscribable$$1.notifySubscribers(eventArgs);
    };
    event.subscribe = function (callback) {
        return subscribable$$1.subscribe(function (eventArgs) {
            callback.apply(null, eventArgs);
        });
    };
    defineProperty(instance, key, {
        value: event,
    });
    return event;
}

/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
function applyExtenders(instance, key, target) {
    const dictionary = instance[EXTENDERS_KEY];
    const extenders = dictionary && dictionary[key];
    if (extenders) {
        extenders.forEach((extender) => {
            const koExtender = extender instanceof Function
                ? extender.call(instance) : extender;
            target = target.extend(koExtender);
        });
    }
    return target;
}
function defineExtenders(prototype, key, extendersOrFactory) {
    let dictionary = prototype[EXTENDERS_KEY];
    // if there is no ExtendersDictionary or ExtendersDictionary lives in base class prototype
    if (!hasOwnProperty(prototype, EXTENDERS_KEY)) {
        // clone ExtendersDictionary from base class prototype or create new ExtendersDictionary
        prototype[EXTENDERS_KEY] = dictionary = extendObject({}, dictionary);
        // clone Extenders arrays for each property key
        objectForEach(dictionary, (existingKey, extenders) => {
            dictionary[existingKey] = [...extenders];
        });
    }
    // get existing Extenders array or create new array
    const currentExtenders = dictionary[key] || (dictionary[key] = []);
    // add new Extenders
    currentExtenders.push(extendersOrFactory);
}

/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
function defineObservableProperty(instance, key, value, deep) {
    const observable$$1 = applyExtenders(instance, key, observable());
    let setter = observable$$1;
    if (deep) {
        setter = function (newValue) {
            observable$$1(prepareDeepValue(newValue));
        };
    }
    defineProperty(instance, key, {
        enumerable: true,
        get: observable$$1,
        set: setter,
    });
    setter(value);
}
function prepareDeepValue(value) {
    if (typeof value === "object") {
        if (isArray(value) || value === null) {
            // value is Array or null
            return value;
        }
        else if (hasOwnProperty(value, "constructor")) {
            // there is redefined own property "constructor"
            const prototype = getPrototypeOf(value);
            if (prototype === Object.prototype || prototype === null) {
                // value is plain Object
                return prepareDeepObject(value);
            }
        }
        else if (value.constructor === Object) {
            // value is plain Object
            return prepareDeepObject(value);
        }
    }
    // value is primitive, function or class instance
    return value;
}
function prepareDeepObject(instance) {
    if (!hasOwnProperty(instance, PATCHED_KEY)) {
        // mark instance as ObservableObject
        defineProperty(instance, PATCHED_KEY, {
            value: true,
        });
        // define deep observable properties
        objectForEach(instance, (key, value) => {
            if (isArray(value)) {
                defineObservableArray(instance, key, value, true);
            }
            else {
                defineObservableProperty(instance, key, value, true);
            }
        });
    }
    return instance;
}

/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
const deepArrayMethods = ["pop", "reverse", "shift", "sort"];
const allArrayMethods = [...deepArrayMethods, "push", "splice", "unshift"];
const deepObservableArrayMethods = ["remove", "removeAll", "destroy", "destroyAll", "replace", "subscribe"];
const allObservableArrayMethods = [...deepObservableArrayMethods, "replace"];
const allMethods = [...allArrayMethods, ...allObservableArrayMethods, "mutate", "set"];
function defineObservableArray(instance, key, value, deep) {
    const obsArray = applyExtenders(instance, key, observableArray());
    let insideObsArray = false;
    defineProperty(instance, key, {
        enumerable: true,
        get: obsArray,
        set: setter,
    });
    setter(value);
    function setter(newValue) {
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
                        newValue[i] = prepareDeepValue(newValue[i]);
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
    function patchArrayMethods(array) {
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
                        args[i] = prepareDeepValue(args[i]);
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
                        args[i] = prepareDeepValue(args[i]);
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
                    let result;
                    insideObsArray = true;
                    switch (arguments.length) {
                        case 0:
                        case 1:
                        case 2: {
                            result = obsArray.splice.apply(obsArray, arguments);
                            break;
                        }
                        case 3: {
                            result = obsArray.splice(arguments[0], arguments[1], prepareDeepValue(arguments[2]));
                            break;
                        }
                        default: {
                            const args = arraySlice(arguments);
                            for (let i = 2; i < args.length; ++i) {
                                args[i] = prepareDeepValue(args[i]);
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
                value(oldItem, newItem) {
                    insideObsArray = true;
                    const result = obsArray.replace(oldItem, prepareDeepValue(newItem));
                    insideObsArray = false;
                    return result;
                },
            });
            defineProperty(array, "mutate", {
                value(mutator) {
                    const nativeArray = obsArray.peek();
                    // it is defined for ko.observableArray
                    obsArray.valueWillMutate();
                    mutator(nativeArray);
                    for (let i = 0; i < nativeArray.length; ++i) {
                        nativeArray[i] = prepareDeepValue(nativeArray[i]);
                    }
                    // it is defined for ko.observableArray
                    obsArray.valueHasMutated();
                },
            });
            defineProperty(array, "set", {
                value(index, newItem) {
                    return obsArray.splice(index, 1, prepareDeepValue(newItem))[0];
                },
            });
        }
        else {
            defineProperty(array, "mutate", {
                value(mutator) {
                    // it is defined for ko.observableArray
                    obsArray.valueWillMutate();
                    mutator(obsArray.peek());
                    // it is defined for ko.observableArray
                    obsArray.valueHasMutated();
                },
            });
            defineProperty(array, "set", {
                value(index, newItem) {
                    return obsArray.splice(index, 1, newItem)[0];
                },
            });
        }
    }
}

/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 * Version: 1.0.1
 */
/**
 * Property decorator that creates hidden (shallow or deep) ko.observable with ES6 getter and setter for it
 * If initialized by Array then hidden (shallow or deep) ko.observableArray will be created
 */
function observable$1(prototypeOrOptions, key) {
    observableArrayOption = false;
    deepObservableOption = false;
    if (arguments.length === 1) {
        deepObservableOption = prototypeOrOptions.deep;
        return observableDecorator;
    }
    return observableDecorator(prototypeOrOptions, key);
}
/**
 * Property decorator that creates hidden (shallow or deep) ko.observableArray with ES6 getter and setter for it
 */
function observableArray$1(prototypeOrOptions, key) {
    observableArrayOption = true;
    deepObservableOption = false;
    if (arguments.length === 1) {
        deepObservableOption = prototypeOrOptions.deep;
        return observableDecorator;
    }
    return observableDecorator(prototypeOrOptions, key);
}
// observableDecorator options
let observableArrayOption;
let deepObservableOption;
function observableDecorator(prototype, propKey) {
    const array = observableArrayOption;
    const deep = deepObservableOption;
    defineProperty(prototype, propKey, {
        get() {
            throw new Error("@observable property '" + propKey.toString() + "' was not initialized");
        },
        set(value) {
            if (array || isArray(value)) {
                defineObservableArray(this, propKey, value, deep);
            }
            else {
                defineObservableProperty(this, propKey, value, deep);
            }
        },
    });
}
/**
 * Accessor decorator that wraps ES6 getter to hidden ko.computed or ko.pureComputed
 *
 * Setter is not wrapped to hidden ko.pureComputed and stays unchanged
 *
 * But we can still extend getter @computed by extenders like { rateLimit: 500 }
 */
function computed$1(prototypeOrOptinos, key, propDesc) {
    computedDecoratorOptions = { pure: true };
    if (arguments.length === 1) {
        computedDecoratorOptions = prototypeOrOptinos;
        return computedDecorator;
    }
    return computedDecorator(prototypeOrOptinos, key, propDesc);
}
// computedDecorator options
let computedDecoratorOptions;
function computedDecorator(prototype, propKey, desc) {
    const options = computedDecoratorOptions;
    const { get, set } = desc || (desc = getOwnPropertyDescriptor(prototype, propKey));
    if (!get) {
        throw new Error("@computed property '" + propKey.toString() + "' has no getter");
    }
    desc.get = function () {
        const koComputed = applyExtenders(this, propKey, computed(get, this, options));
        defineProperty(this, propKey, {
            get: koComputed,
            // tslint:disable-next-line:object-literal-shorthand
            set: set,
        });
        return koComputed();
    };
    return desc;
}
/**
 * Apply extenders to decorated @observable
 * @extendersOrFactory { Object | Function } Knockout extenders definition or factory that produces definition
 */
function extend(extendersOrFactory) {
    return function (prototype, key) {
        defineExtenders(prototype, key, extendersOrFactory);
    };
}
/**
 * Register Knockout component by decorating ViewModel class
 * @param name {String} Name of component
 * @param template {Any} Knockout template definition
 * @param styles {Any} Ignored parameter (used for `require()` styles by webpack etc.)
 * @param options {Object} Another options that passed directly to `ko.components.register()`
 */
function component(name, template, styles, options) {
    if (options === void 0) {
        if (styles === void 0) {
            if (typeof template === "object"
                && template.constructor === Object
                && !("require" in template)
                && !("element" in template)) {
                options = template;
                template = void 0;
            }
        }
        else if (typeof styles === "object") {
            options = styles;
            styles = void 0;
        }
    }
    return function (constructor) {
        components.register(name, extendObject({
            viewModel: constructor.length < 2 ? constructor : {
                createViewModel(params, { element, templateNodes, }) {
                    return new constructor(params, element, templateNodes);
                },
            },
            template: template || "<!---->",
            synchronous: true,
        }, options));
    };
}
/*---------------------------------------------------------------------------*/
/**
 * Like https://github.com/jayphelps/core-decorators.js @autobind but less smart and complex
 * Do NOT use with ES6 inheritance!
 */
function autobind(prototype, key, desc) {
    const { value, configurable, enumerable } = desc || (desc = getOwnPropertyDescriptor(prototype, key));
    return {
        // tslint:disable-next-line:object-literal-shorthand
        configurable: configurable,
        // tslint:disable-next-line:object-literal-shorthand
        enumerable: enumerable,
        get() {
            if (this === prototype) {
                return value;
            }
            const bound = value.bind(this);
            defineProperty(this, key, {
                value: bound,
            });
            return bound;
        },
    };
}
/*---------------------------------------------------------------------------*/
/**
 * Define hidden ko.subscribable, that notifies subscribers when decorated method is invoked
 */
function event(prototype, key) {
    defineProperty(prototype, key, {
        get() {
            return defineEventProperty(this, key);
        },
    });
}
/**
 * Subscribe callback to `@observable` or `@computed` dependency changes or to some `@event`
 */
function subscribe(dependencyOrEvent, callback, options) {
    const once = options && options.once || false;
    if (hasOwnProperty(dependencyOrEvent, "subscribe")) {
        // overload: subscribe to @event property
        const eventFunc = dependencyOrEvent;
        if (once) {
            const subscription = eventFunc.subscribe(function () {
                subscription.dispose();
                callback.apply(null, arguments);
            });
            return subscription;
        }
        else {
            return eventFunc.subscribe(callback);
        }
    }
    else {
        // overload: subscribe to @observable or @computed
        const eventFunc = options && options.event || "change";
        let handler;
        let subscription;
        if (once) {
            handler = function () {
                subscription.dispose();
                callback.apply(null, arguments);
            };
        }
        else {
            handler = callback;
        }
        if (eventFunc === "arrayChange") {
            const obsArray = dependencyOrEvent();
            if (isArray(obsArray) && hasOwnProperty(obsArray, PATCHED_KEY)) {
                subscription = obsArray.subscribe(handler, null, eventFunc);
            }
            else {
                throw new Error("Can not subscribe to 'arrayChange' because dependency is not an 'observableArray'");
            }
        }
        else {
            const koComputed = computed(dependencyOrEvent);
            subscription = koComputed.subscribe(handler, null, eventFunc);
            const originalDispose = subscription.dispose;
            // dispose hidden computed with subscription
            subscription.dispose = function () {
                originalDispose.call(this);
                koComputed.dispose();
            };
        }
        return subscription;
    }
}
/**
 * Get internal ko.observable() for object property decodated by @observable
 */
function unwrap(instance, key) {
    if (!hasOwnProperty(instance, key)) {
        // invoke getter on instance.__proto__ that defines property on instance
        // tslint:disable-next-line:no-unused-expression
        instance[key];
    }
    return getOwnPropertyDescriptor(instance, key).get;
}
/**
 * Mixin which add `subscribe()` instance method and implement `dispose()` method,
 * that disposes all subscription created by `subscribe()`
 * @param Base {Function} Base class to extend
 */
function Disposable(
// tslint:disable-next-line:variable-name
Base) {
    if (typeof Base === "undefined") {
        Base = class {
        };
    }
    return class extends Base {
        /** Dispose all subscriptions from this class */
        dispose() {
            const subscriptions = this[SUBSCRIPTIONS_KEY];
            if (subscriptions) {
                subscriptions.forEach((subscription) => {
                    subscription.dispose();
                });
                delete this[SUBSCRIPTIONS_KEY];
            }
        }
        /** Subscribe callback to `@observable` or `@computed` dependency changes or to some `@event` */
        subscribe() {
            const subscription = subscribe.apply(null, arguments);
            const subscriptions = this[SUBSCRIPTIONS_KEY] || (this[SUBSCRIPTIONS_KEY] = []);
            subscriptions.push(subscription);
            return subscription;
        }
        /** Get internal ko.observable() for class property decodated by `@observable` */
        unwrap(key) {
            return unwrap(this, key);
        }
    };
}

export { observable$1 as observable, observableArray$1 as observableArray, computed$1 as computed, extend, component, autobind, event, subscribe, unwrap, Disposable };
//# sourceMappingURL=knockout-decorators.esm.js.map
