(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('knockout')) :
    typeof define === 'function' && define.amd ? define(['exports', 'knockout'], factory) :
    (factory((global.KnockoutDecorators = global.KnockoutDecorators || {}),global.ko));
}(this, (function (exports,ko) { 'use strict';

function __extends(d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
var prefix = "__ko_decorators_";
var PATCHED_KEY = prefix + "patched__";
var EXTENDERS_KEY = prefix + "extenders__";
var SUBSCRIPTIONS_KEY = prefix + "subscriptions__";
if (typeof Symbol !== "undefined") {
    PATCHED_KEY = Symbol(PATCHED_KEY);
    EXTENDERS_KEY = Symbol(EXTENDERS_KEY);
    SUBSCRIPTIONS_KEY = Symbol(SUBSCRIPTIONS_KEY);
}
function defineProperty(instance, key, descriptor) {
    descriptor.configurable = true;
    Object.defineProperty(instance, key, descriptor);
}
var extendObject = ko.utils.extend;
var objectForEach = ko.utils.objectForEach;
var getPrototypeOf = Object.getPrototypeOf.bind(Object);
var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
var hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
var arraySlice = Function.prototype.call.bind(Array.prototype.slice);

/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
function defineEventProperty(instance, key) {
    var subscribable$$1 = new ko.subscribable();
    var event = function () {
        var eventArgs = arraySlice(arguments);
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
    var dictionary = instance[EXTENDERS_KEY];
    var extenders = dictionary && dictionary[key];
    if (extenders) {
        extenders.forEach(function (extender) {
            var koExtender = extender instanceof Function
                ? extender.call(instance) : extender;
            target = target.extend(koExtender);
        });
    }
    return target;
}
function defineExtenders(prototype, key, extendersOrFactory) {
    var dictionary = prototype[EXTENDERS_KEY];
    // if there is no ExtendersDictionary or ExtendersDictionary lives in base class prototype
    if (!hasOwnProperty(prototype, EXTENDERS_KEY)) {
        // clone ExtendersDictionary from base class prototype or create new ExtendersDictionary
        prototype[EXTENDERS_KEY] = dictionary = extendObject({}, dictionary);
        // clone Extenders arrays for each property key
        objectForEach(dictionary, function (existingKey, extenders) {
            dictionary[existingKey] = extenders.slice();
        });
    }
    // get existing Extenders array or create new array
    var extenders = dictionary[key] || (dictionary[key] = []);
    // add new Extenders
    extenders.push(extendersOrFactory);
}

/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
function defineObservableProperty(instance, key, value, deep) {
    var observable$$1 = applyExtenders(instance, key, ko.observable());
    var setter = observable$$1;
    if (deep) {
        setter = function (newValue) {
            observable$$1(prepareReactiveValue(newValue));
        };
    }
    defineProperty(instance, key, {
        enumerable: true,
        get: observable$$1,
        set: setter,
    });
    setter(value);
}
function prepareReactiveValue(value) {
    if (typeof value === "object") {
        if (Array.isArray(value) || value === null) {
            // value is Array or null
            return value;
        }
        else if (value.constructor === Object) {
            // value is plain Object
            return prepareReactiveObject(value);
        }
        else if (hasOwnProperty(value, "constructor")) {
            var prototype = getPrototypeOf(value);
            if (prototype === Object.prototype || prototype === null) {
                // value is plain Object
                return prepareReactiveObject(value);
            }
        }
    }
    // value is primitive, function or class instance
    return value;
}
function prepareReactiveObject(instance) {
    if (!hasOwnProperty(instance, PATCHED_KEY)) {
        // mark instance as ObservableObject
        defineProperty(instance, PATCHED_KEY, {
            value: true,
        });
        // define deep observable properties
        objectForEach(instance, function (key, value) {
            if (Array.isArray(value)) {
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
var deepArrayMethods = ["pop", "reverse", "shift", "sort"];
var allArrayMethods = deepArrayMethods.concat(["push", "splice", "unshift"]);
var deepObservableArrayMethods = ["remove", "removeAll", "destroy", "destroyAll", "replace", "subscribe"];
var allObservableArrayMethods = deepObservableArrayMethods.concat(["replace"]);
var allMethods = allArrayMethods.concat(allObservableArrayMethods, ["mutate", "set"]);
function defineObservableArray(instance, key, value, deep) {
    var obsArray = applyExtenders(instance, key, ko.observableArray());
    var insideObsArray = false;
    defineProperty(instance, key, {
        enumerable: true,
        get: obsArray,
        set: setter,
    });
    setter(value);
    function setter(newValue) {
        var lastValue = obsArray.peek();
        // if we got new value
        if (lastValue !== newValue) {
            if (Array.isArray(lastValue)) {
                // if lastValue array methods were already patched
                if (hasOwnProperty(lastValue, PATCHED_KEY)) {
                    delete lastValue[PATCHED_KEY];
                    // clear patched array methods on lastValue (see unit tests)
                    allMethods.forEach(function (fnName) {
                        delete lastValue[fnName];
                    });
                }
            }
            if (Array.isArray(newValue)) {
                // if new value array methods were already connected with another @observable
                if (hasOwnProperty(newValue, PATCHED_KEY)) {
                    // clone new value to prevent corruption of another @observable (see unit tests)
                    newValue = newValue.slice();
                }
                // if deep option is set
                if (deep) {
                    // make all array items reactive
                    for (var i = 0; i < newValue.length; ++i) {
                        newValue[i] = prepareReactiveValue(newValue[i]);
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
        var arrayMethods = deep ? deepArrayMethods : allArrayMethods;
        arrayMethods.forEach(function (fnName) { return defineProperty(array, fnName, {
            value: function () {
                if (insideObsArray) {
                    return Array.prototype[fnName].apply(array, arguments);
                }
                insideObsArray = true;
                var result = obsArray[fnName].apply(obsArray, arguments);
                insideObsArray = false;
                return result;
            },
        }); });
        var observableArrayMethods = deep ? deepObservableArrayMethods : allObservableArrayMethods;
        observableArrayMethods.forEach(function (fnName) { return defineProperty(array, fnName, {
            value: function () {
                insideObsArray = true;
                var result = obsArray[fnName].apply(obsArray, arguments);
                insideObsArray = false;
                return result;
            },
        }); });
        if (deep) {
            defineProperty(array, "push", {
                value: function () {
                    if (insideObsArray) {
                        return Array.prototype.push.apply(array, arguments);
                    }
                    var args = arraySlice(arguments);
                    for (var i = 0; i < args.length; ++i) {
                        args[i] = prepareReactiveValue(args[i]);
                    }
                    insideObsArray = true;
                    var result = obsArray.push.apply(obsArray, args);
                    insideObsArray = false;
                    return result;
                },
            });
            defineProperty(array, "unshift", {
                value: function () {
                    if (insideObsArray) {
                        return Array.prototype.unshift.apply(array, arguments);
                    }
                    var args = arraySlice(arguments);
                    for (var i = 0; i < args.length; ++i) {
                        args[i] = prepareReactiveValue(args[i]);
                    }
                    insideObsArray = true;
                    var result = obsArray.unshift.apply(obsArray, args);
                    insideObsArray = false;
                    return result;
                },
            });
            defineProperty(array, "splice", {
                value: function () {
                    if (insideObsArray) {
                        return Array.prototype.splice.apply(array, arguments);
                    }
                    var result;
                    insideObsArray = true;
                    switch (arguments.length) {
                        case 0:
                        case 1:
                        case 2: {
                            result = obsArray.splice.apply(obsArray, arguments);
                            break;
                        }
                        case 3: {
                            result = obsArray.splice(arguments[0], arguments[1], prepareReactiveValue(arguments[2]));
                            break;
                        }
                        default: {
                            var args = arraySlice(arguments);
                            for (var i = 2; i < args.length; ++i) {
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
                value: function (oldItem, newItem) {
                    insideObsArray = true;
                    var result = obsArray.replace(oldItem, prepareReactiveValue(newItem));
                    insideObsArray = false;
                    return result;
                },
            });
            defineProperty(array, "mutate", {
                value: function (mutator) {
                    var nativeArray = obsArray.peek();
                    // it is defined for ko.observableArray
                    obsArray.valueWillMutate();
                    mutator(nativeArray);
                    for (var i = 0; i < nativeArray.length; ++i) {
                        nativeArray[i] = prepareReactiveValue(nativeArray[i]);
                    }
                    // it is defined for ko.observableArray
                    obsArray.valueHasMutated();
                },
            });
            defineProperty(array, "set", {
                value: function (index, newItem) {
                    return obsArray.splice(index, 1, prepareReactiveValue(newItem))[0];
                },
            });
        }
        else {
            defineProperty(array, "mutate", {
                value: function (mutator) {
                    // it is defined for ko.observableArray
                    obsArray.valueWillMutate();
                    mutator(obsArray.peek());
                    // it is defined for ko.observableArray
                    obsArray.valueHasMutated();
                },
            });
            defineProperty(array, "set", {
                value: function (index, newItem) {
                    return obsArray.splice(index, 1, newItem)[0];
                },
            });
        }
    }
}

/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 * Version: 0.10.0
 */
/**
 * Property decorator that creates hidden (shallow) ko.observable with ES6 getter and setter for it
 * If initialized by Array then hidden (shallow) ko.observableArray will be created
 */
function observable$1(prototype, key) {
    defineProperty(prototype, key, {
        get: function () {
            throw new Error("@observable property '" + key.toString() + "' was not initialized");
        },
        set: function (value) {
            if (Array.isArray(value)) {
                defineObservableArray(this, key, value, false);
            }
            else {
                defineObservableProperty(this, key, value, false);
            }
        },
    });
}
/*---------------------------------------------------------------------------*/
/**
 * Property decorator that creates hidden (deep) ko.observable with ES6 getter and setter for it
 * If initialized by Array then hidden (deep) ko.observableArray will be created
 */
function reactive(prototype, key) {
    defineProperty(prototype, key, {
        get: function () {
            throw new Error("@reactive property '" + key.toString() + "' was not initialized");
        },
        set: function (value) {
            if (Array.isArray(value)) {
                defineObservableArray(this, key, value, true);
            }
            else {
                defineObservableProperty(this, key, value, true);
            }
        },
    });
}
/*---------------------------------------------------------------------------*/
/**
 * Accessor decorator that wraps ES6 getter to hidden ko.pureComputed
 *
 * Setter is not wrapped to hidden ko.pureComputed and stays unchanged
 *
 * But we can still extend getter @computed by extenders like { rateLimit: 500 }
 */
function computed$1(prototype, key, desc) {
    var _a = desc || (desc = getOwnPropertyDescriptor(prototype, key)), get = _a.get, set = _a.set;
    if (!get) {
        throw new Error("@computed property '" + key.toString() + "' has no getter");
    }
    desc.get = function () {
        var computed$$1 = applyExtenders(this, key, ko.pureComputed(get, this));
        defineProperty(this, key, {
            get: computed$$1,
            // tslint:disable-next-line:object-literal-shorthand
            set: set,
        });
        return computed$$1();
    };
    return desc;
}
/*---------------------------------------------------------------------------*/
/**
 * Property decorator that creates hidden (shallow) ko.observableArray with ES6 getter and setter for it
 */
function observableArray$1(prototype, key) {
    defineProperty(prototype, key, {
        get: function () {
            throw new Error("@observableArray property '" + key.toString() + "' was not initialized");
        },
        set: function (value) {
            defineObservableArray(this, key, value, false);
        },
    });
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
        ko.components.register(name, extendObject({
            viewModel: constructor.length < 2 ? constructor : {
                createViewModel: function (params, _a) {
                    var element = _a.element, templateNodes = _a.templateNodes;
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
    var _a = desc || (desc = getOwnPropertyDescriptor(prototype, key)), value = _a.value, configurable = _a.configurable, enumerable = _a.enumerable;
    return {
        // tslint:disable-next-line:object-literal-shorthand
        configurable: configurable,
        // tslint:disable-next-line:object-literal-shorthand
        enumerable: enumerable,
        get: function () {
            if (this === prototype) {
                return value;
            }
            var bound = value.bind(this);
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
        get: function () {
            return defineEventProperty(this, key);
        },
    });
}
/**
 * Subscribe callback to `@observable` or `@computed` dependency changes or to some `@event`
 */
function subscribe(dependencyOrEvent, callback, options) {
    var once = options && options.once || false;
    if (hasOwnProperty(dependencyOrEvent, "subscribe")) {
        // overload: subscribe to @event property
        var event_1 = dependencyOrEvent;
        if (once) {
            var subscription_1 = event_1.subscribe(function () {
                subscription_1.dispose();
                callback.apply(null, arguments);
            });
            return subscription_1;
        }
        else {
            return event_1.subscribe(callback);
        }
    }
    else {
        // overload: subscribe to @observable, @reactive or @computed
        var event_2 = options && options.event || "change";
        var handler = void 0;
        var subscription_2;
        if (once) {
            handler = function () {
                subscription_2.dispose();
                callback.apply(null, arguments);
            };
        }
        else {
            handler = callback;
        }
        if (event_2 === "arrayChange") {
            var obsArray = dependencyOrEvent();
            if (Array.isArray(obsArray) && hasOwnProperty(obsArray, PATCHED_KEY)) {
                subscription_2 = obsArray.subscribe(handler, null, event_2);
            }
            else {
                throw new Error("Can not subscribe to 'arrayChange' because dependency is not an 'observableArray'");
            }
        }
        else {
            var computed_1 = ko.computed(dependencyOrEvent);
            subscription_2 = computed_1.subscribe(handler, null, event_2);
            var originalDispose_1 = subscription_2.dispose;
            // dispose hidden computed with subscription
            subscription_2.dispose = function () {
                originalDispose_1.call(this);
                computed_1.dispose();
            };
        }
        return subscription_2;
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
        Base = (function () {
            function class_1() {
            }
            return class_1;
        }());
    }
    return (function (_super) {
        __extends(class_2, _super);
        function class_2() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return _super.apply(this, args) || this;
        }
        /** Dispose all subscriptions from this class */
        class_2.prototype.dispose = function () {
            var subscriptions = this[SUBSCRIPTIONS_KEY];
            if (subscriptions) {
                subscriptions.forEach(function (subscription) {
                    subscription.dispose();
                });
            }
        };
        /** Subscribe callback to `@observable` or `@computed` dependency changes or to some `@event` */
        class_2.prototype.subscribe = function () {
            var subscription = subscribe.apply(null, arguments);
            var subscriptions = this[SUBSCRIPTIONS_KEY] || (this[SUBSCRIPTIONS_KEY] = []);
            subscriptions.push(subscription);
            return subscription;
        };
        /** Get internal ko.observable() for class property decodated by `@observable` */
        class_2.prototype.unwrap = function (key) {
            return unwrap(this, key);
        };
        return class_2;
    }(Base));
}

exports.observable = observable$1;
exports.reactive = reactive;
exports.computed = computed$1;
exports.observableArray = observableArray$1;
exports.extend = extend;
exports.component = component;
exports.autobind = autobind;
exports.event = event;
exports.subscribe = subscribe;
exports.unwrap = unwrap;
exports.Disposable = Disposable;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=knockout-decorators.js.map
