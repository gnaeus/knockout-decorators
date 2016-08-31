(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('knockout')) :
    typeof define === 'function' && define.amd ? define(['exports', 'knockout'], factory) :
    (factory((global.KnockoutDecorators = global.KnockoutDecorators || {}),global.ko));
}(this, (function (exports,ko) { 'use strict';

var assign = ko.utils.extend;
var objectForEach = ko.utils.objectForEach;
var defProp = Object.defineProperty.bind(Object);
var getDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
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
var DECORATORS_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators") : "__ko_decorators_";
var SUBSCRIPTIONS_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators_subscriptions") : "__ko_decorators_subscriptions_";
var DISPOSABLE_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators_disposable") : "__ko_decorators_disposable_";
var DecoratorType;
(function (DecoratorType) {
    DecoratorType[DecoratorType["Extend"] = 0] = "Extend";
    DecoratorType[DecoratorType["Subscribe"] = 1] = "Subscribe";
})(DecoratorType || (DecoratorType = {}));
function getMetaData(prototype) {
    var metaData = prototype[DECORATORS_KEY];
    if (!prototype.hasOwnProperty(DECORATORS_KEY)) {
        prototype[DECORATORS_KEY] = metaData = assign({}, metaData);
        objectForEach(metaData, function (key, decorators) {
            metaData[key] = decorators.slice();
        });
    }
    return metaData;
}
function getDecorators(metaData, key) {
    return metaData[key] || (metaData[key] = []);
}
function getSubscriptions(instance) {
    return instance[SUBSCRIPTIONS_KEY] || (instance[SUBSCRIPTIONS_KEY] = []);
}
function applyDecorators(instance, key, target) {
    var metaData = instance[DECORATORS_KEY];
    var decorators = metaData && metaData[key];
    if (decorators) {
        decorators.forEach(function (d) {
            switch (d.type) {
                case DecoratorType.Extend:
                    var extenders = d.value instanceof Function
                        ? d.value.call(instance) : d.value;
                    target = target.extend(extenders);
                    break;
                case DecoratorType.Subscribe:
                    var subscription = target.subscribe(d.value, instance, d.event);
                    if (d.dispose) {
                        getSubscriptions(instance).push(subscription);
                    }
                    break;
            }
        });
    }
    return target;
}
function redefineDispose(prototype) {
    if (prototype[DISPOSABLE_KEY]) {
        return;
    }
    prototype[DISPOSABLE_KEY] = true;
    var original = prototype["dispose"];
    prototype["dispose"] = function dispose() {
        var disposables = this[SUBSCRIPTIONS_KEY];
        if (disposables) {
            disposables.forEach(function (s) { s.dispose(); });
        }
        if (original) {
            return original.apply(this, arguments);
        }
    };
}
/**
 * Property decorator that creates hidden ko.observable with ES6 getter and setter for it
 */
function observable(prototype, key) {
    defProp(prototype, key, {
        get: function () {
            var observable = applyDecorators(this, key, ko.observable());
            defProp(this, key, { get: observable, set: observable });
            return observable();
        },
        set: function (value) {
            var observable = applyDecorators(this, key, ko.observable());
            defProp(this, key, { get: observable, set: observable });
            observable(value);
        },
    });
}
/**
 * Accessor decorator that wraps ES6 getter and setter to hidden ko.pureComputed
 */
function computed(prototype, key) {
    var _a = getDescriptor(prototype, key), get = _a.get, set = _a.set;
    defProp(prototype, key, {
        get: function () {
            var computed = ko.pureComputed(get, this);
            defProp(this, key, { get: computed, set: set });
            return computed();
        }
    });
    // TODO: make @computed extendable (by @extend decorator)
}
var arrayMethods = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];
var observableArrayMethods = ["remove", "removeAll", "destroy", "destroyAll", "replace", "subscribe"];
function defObservableArray(instance, key) {
    var obsArray = applyDecorators(instance, key, ko.observableArray());
    var insideObsArray = false;
    defProp(instance, key, {
        get: obsArray,
        set: function (array) {
            if (array) {
                arrayMethods.forEach(function (fnName) { return defProp(array, fnName, {
                    enumerable: false,
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
                    enumerable: false,
                    value: function () {
                        insideObsArray = true;
                        var result = obsArray[fnName].apply(obsArray, arguments);
                        insideObsArray = false;
                        return result;
                    }
                }); });
            }
            insideObsArray = true;
            obsArray(array);
            insideObsArray = false;
        }
    });
}
/**
 * Property decorator that creates hidden ko.observableArray with ES6 getter and setter for it
 */
function observableArray(prototype, key) {
    defProp(prototype, key, {
        get: function () {
            defObservableArray(this, key);
            return this[key];
        },
        set: function (value) {
            defObservableArray(this, key);
            return this[key] = value;
        },
    });
}
/**
 * Replace original method with factory that produces ko.computed from original method
 * @param autoDispose { Boolean } if true then subscription will be disposed when entire ViewModel is disposed
 */
function observer(prototypeOrAutoDispose, key) {
    var autoDispose;
    if (typeof prototypeOrAutoDispose === "boolean" && key === void 0) {
        autoDispose = prototypeOrAutoDispose; // @observer(false)
        return decorator; // onSomethingChange() {}
    }
    else if (typeof prototypeOrAutoDispose === "object" && key !== void 0) {
        autoDispose = true; // @observer
        decorator(prototypeOrAutoDispose, key); // onSomethingChange() {}
    }
    else {
        throw new Error("Can not use @observer decorator this way");
    }
    function decorator(prototype, key) {
        var original = prototype[key];
        prototype[key] = function () {
            var _this = this;
            var args = slice(arguments);
            var computed = ko.computed(function () { return original.apply(_this, args); });
            if (autoDispose) {
                getSubscriptions(this).push(computed);
            }
            return computed;
        };
        if (autoDispose) {
            redefineDispose(prototype);
        }
    }
}
/**
 * Apply extenders to decorated @observable
 * @extendersOrFactory { Object | Function } Knockout extenders definition or factory that produces definition
 */
function extend(extendersOrFactory) {
    return function (prototype, key) {
        getDecorators(getMetaData(prototype), key).push({
            type: DecoratorType.Extend,
            value: extendersOrFactory,
        });
    };
}
/**
 * Subscribe to @observable by name or by specifying callback explicitely
 * @param targetOrCallback { String | Function } name of callback or callback itself
 * when observable is decorated and name of observable property when callback is decorated
 * @param event { String } Knockout subscription event name
 * @param autoDispose { Boolean } if true then subscription will be disposed when entire ViewModel is disposed
 */
function subscribe(targetOrCallback, event, autoDispose) {
    if (autoDispose === void 0) { autoDispose = true; }
    return function (prototype, key) {
        var _a = getDescriptor(prototype, key), value = _a.value, get = _a.get;
        var targetKey;
        var callback;
        if (typeof value === "function") {
            if (typeof targetOrCallback === "string" || typeof targetOrCallback === "symbol") {
                targetKey = targetOrCallback; // @subscribe("target")
                callback = value; // callback(value) {}    
            }
            else {
                throw new Error("Subscription target should be a key in decorated ViewModel");
            }
        }
        else if (typeof get === "function") {
            if (typeof targetOrCallback === "function") {
                targetKey = key; // @subscribe(ViewModel.prototype.callback)
                callback = targetOrCallback; // @observable target;
            }
            else if (typeof targetOrCallback === "string" || typeof targetOrCallback === "symbol") {
                targetKey = key; // @subscribe("callback")
                callback = prototype[targetOrCallback]; // @observable target;
            }
            else {
                throw new Error("Subscription callback should be a function or key in decorated ViewModel");
            }
        }
        getDecorators(getMetaData(prototype), targetKey).push({
            type: DecoratorType.Subscribe,
            value: callback,
            event: event,
            dispose: autoDispose,
        });
        if (autoDispose) {
            redefineDispose(prototype);
        }
    };
}

exports.component = component;
exports.observable = observable;
exports.computed = computed;
exports.observableArray = observableArray;
exports.observer = observer;
exports.extend = extend;
exports.subscribe = subscribe;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=knockout-decorators.js.map
