(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('knockout')) :
    typeof define === 'function' && define.amd ? define(['exports', 'knockout'], factory) :
    (factory((global.KnockoutDecorators = global.KnockoutDecorators || {}),global.ko));
}(this, (function (exports,ko) { 'use strict';

/**
 * Copyright (c) 2016 Dmitry Panyushkin
 * Available under MIT license
 */
var assign = ko.utils.extend;
var objectForEach = ko.utils.objectForEach;
var defProp = Object.defineProperty.bind(Object);
var getDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
var hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
var slice = Function.prototype.call.bind(Array.prototype.slice);
/**
 * Register Knockout component by decorating ViewModel class
 * @param name { String } Name of component
 * @param template { Any } Knockout template definition
 * @param styles { Any } Ignored parameter (used for `require()` styles by webpack etc.)
 * @param options { Object } Another options that passed directly to `ko.components.register()`
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
        ko.components.register(name, assign({
            viewModel: constructor.length < 2 ? constructor : {
                createViewModel: function (params, _a) {
                    var element = _a.element, templateNodes = _a.templateNodes;
                    return new constructor(params, element, templateNodes);
                }
            },
            template: template || "<!---->",
            synchronous: true,
        }, options));
    };
}
/*===========================================================================*/
/**
 * Property decorator that creates hidden ko.observable with ES6 getter and setter for it
 */
function observable$1(prototype, key) {
    defProp(prototype, key, {
        configurable: true,
        get: function () {
            var observable$$1 = applyExtenders(this, key, ko.observable());
            defProp(this, key, {
                configurable: true,
                enumerable: true,
                get: observable$$1,
                set: observable$$1,
            });
            return observable$$1();
        },
        set: function (value) {
            var observable$$1 = applyExtenders(this, key, ko.observable());
            defProp(this, key, {
                configurable: true,
                enumerable: true,
                get: observable$$1,
                set: observable$$1,
            });
            observable$$1(value);
        },
    });
}
/*===========================================================================*/
/**
 * Accessor decorator that wraps ES6 getter to hidden ko.pureComputed
 *
 * Setter is not wrapped to hidden ko.pureComputed and stays unchanged
 *
 * But we can still extend getter @computed by extenders like { rateLimit: 500 }
 */
function computed$1(prototype, key, desc) {
    var _a = desc || (desc = getDescriptor(prototype, key)), get = _a.get, set = _a.set;
    desc.get = function () {
        var computed$$1 = applyExtenders(this, key, ko.pureComputed(get, this));
        defProp(this, key, {
            configurable: true,
            get: computed$$1,
            set: set
        });
        return computed$$1();
    };
    return desc;
    // TODO: make @computed extendable (by @extend decorator)
}
var arrayMethods = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];
var observableArrayMethods = ["remove", "removeAll", "destroy", "destroyAll", "replace", "subscribe"];
function defObservableArray(instance, key) {
    var obsArray = applyExtenders(instance, key, ko.observableArray());
    var insideObsArray = false;
    defProp(instance, key, {
        configurable: true,
        enumerable: true,
        get: obsArray,
        set: function (value) {
            var lastValue = obsArray.peek();
            // if we got new value
            if (lastValue !== value) {
                if (Array.isArray(lastValue)) {
                    // if lastValue array methods were already patched
                    if (hasOwnProperty(lastValue, "subscribe")) {
                        // clear patched array methods on lastValue (see unit tests)
                        clearArrayMethods(lastValue);
                    }
                }
                if (Array.isArray(value)) {
                    // if new value array methods were already connected with another @observableArray
                    if (hasOwnProperty(value, "subscribe")) {
                        // clone new value to prevent corruption of another @observableArray (see unit tests)
                        value = slice(value);
                    }
                    // call ko.observableArray.fn[fnName] instead of Array.prototype[fnName]
                    patchArrayMethods(value);
                }
            }
            insideObsArray = true;
            obsArray(value);
            insideObsArray = false;
        }
    });
    function patchArrayMethods(array) {
        arrayMethods.forEach(function (fnName) { return defProp(array, fnName, {
            configurable: true,
            value: function () {
                if (insideObsArray) {
                    return Array.prototype[fnName].apply(array, arguments);
                }
                insideObsArray = true;
                var result = obsArray[fnName].apply(obsArray, arguments);
                insideObsArray = false;
                return result;
            }
        }); });
        observableArrayMethods.forEach(function (fnName) { return defProp(array, fnName, {
            configurable: true,
            value: function () {
                insideObsArray = true;
                var result = obsArray[fnName].apply(obsArray, arguments);
                insideObsArray = false;
                return result;
            }
        }); });
    }
}
// moved outside of defObservableArray function to prevent creation of unnecessary closure
function clearArrayMethods(array) {
    arrayMethods.forEach(function (fnName) {
        delete array[fnName];
    });
    observableArrayMethods.forEach(function (fnName) {
        delete array[fnName];
    });
}
/**
 * Property decorator that creates hidden ko.observableArray with ES6 getter and setter for it
 */
function observableArray$1(prototype, key) {
    defProp(prototype, key, {
        configurable: true,
        get: function () {
            defObservableArray(this, key);
            this[key] = [];
            return this[key];
        },
        set: function (value) {
            defObservableArray(this, key);
            this[key] = value;
        },
    });
}
/*===========================================================================*/
var DECORATORS_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators") : "__ko_decorators__";
function getOrCreateMetaData(prototype) {
    var metaData = prototype[DECORATORS_KEY];
    if (!prototype.hasOwnProperty(DECORATORS_KEY)) {
        // clone MetaData from base class prototype
        prototype[DECORATORS_KEY] = metaData = assign({}, metaData);
        // clone extenders arrays for each property key
        objectForEach(metaData, function (key, extenders) {
            metaData[key] = extenders.slice();
        });
    }
    return metaData;
}
function getOrCreateExtenders(metaData, key) {
    return metaData[key] || (metaData[key] = []);
}
function applyExtenders(instance, key, target) {
    var metaData = instance[DECORATORS_KEY];
    var extenders = metaData && metaData[key];
    if (extenders) {
        extenders.forEach(function (extender) {
            var koExtender = extender instanceof Function
                ? extender.call(instance) : extender;
            target = target.extend(koExtender);
        });
    }
    return target;
}
/**
 * Apply extenders to decorated @observable
 * @extendersOrFactory { Object | Function } Knockout extenders definition or factory that produces definition
 */
function extend(extendersOrFactory) {
    return function (prototype, key) {
        var medaData = getOrCreateMetaData(prototype);
        var extenders = getOrCreateExtenders(medaData, key);
        extenders.push(extendersOrFactory);
    };
}
/*===========================================================================*/
/**
 * Like https://github.com/jayphelps/core-decorators.js @autobind but less smart and complex
 * Do NOT use with ES6 inheritance!
 */
function autobind(prototype, key, desc) {
    var _a = desc || (desc = getDescriptor(prototype, key)), value = _a.value, configurable = _a.configurable, enumerable = _a.enumerable;
    return {
        configurable: configurable,
        enumerable: enumerable,
        get: function () {
            if (this === prototype) {
                return value;
            }
            var bound = value.bind(this);
            defProp(this, key, {
                configurable: true,
                value: bound,
            });
            return bound;
        }
    };
}
/*===========================================================================*/
/**
 * Subscribe callback to dependency changes
 */
function subscribe(getDependency, callback, options) {
    var once = options && options.once || false;
    var event = options && options.event || "change";
    var dependency = ko.computed(getDependency);
    var subscription = dependency.subscribe(callback, null, event);
    var originalDispose = subscription.dispose;
    // dispose hidden computed with subscription
    subscription.dispose = function () {
        originalDispose.call(this);
        dependency.dispose();
    };
    if (once) {
        dependency.subscribe(function () {
            subscription.dispose();
        });
    }
    return subscription;
}
/**
 * Get internal ko.observable() for object property decodated by @observable
 */
function unwrap(instance, key) {
    if (!hasOwnProperty(instance, key)) {
        // invoke getter on instance.__proto__ that defines property on instance
        instance[key];
    }
    return getDescriptor(instance, key).get;
}

exports.component = component;
exports.observable = observable$1;
exports.computed = computed$1;
exports.observableArray = observableArray$1;
exports.extend = extend;
exports.autobind = autobind;
exports.subscribe = subscribe;
exports.unwrap = unwrap;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=knockout-decorators.js.map
