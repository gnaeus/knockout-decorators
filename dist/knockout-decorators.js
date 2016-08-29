(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('knockout')) :
    typeof define === 'function' && define.amd ? define(['exports', 'knockout'], factory) :
    (factory((global.KnockoutDecorators = global.KnockoutDecorators || {}),global.ko));
}(this, (function (exports,ko) { 'use strict';

var extend = ko.utils.extend;
var objectForEach = ko.utils.objectForEach;
var defProp = Object.defineProperty.bind(Object);
var getDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
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
        ko.components.register(name, extend({
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
    ? Symbol("knockout_decorators") : "__knockout_decorators_";
var SUBSCRIPTIONS_KEY = typeof Symbol !== "undefined"
    ? Symbol("knockout_decorators_subscriptions") : "__knockout_decorators_subscriptions_";
var DISPOSABLE_KEY = typeof Symbol !== "undefined"
    ? Symbol("knockout_decorators_disposable") : "__knockout_decorators_disposable_";
var DecoratorType;
(function (DecoratorType) {
    DecoratorType[DecoratorType["Extend"] = 0] = "Extend";
    DecoratorType[DecoratorType["Subscribe"] = 1] = "Subscribe";
})(DecoratorType || (DecoratorType = {}));
function getMetaData(prototype) {
    var metaData = prototype[DECORATORS_KEY];
    if (!prototype.hasOwnProperty(DECORATORS_KEY)) {
        prototype[DECORATORS_KEY] = metaData = extend({}, metaData);
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
                    var extender = d.value;
                    target = target.extend(extender);
                    break;
                case DecoratorType.Subscribe:
                    var callback = d.value;
                    var subscription = target.subscribe(callback.bind(instance));
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
    var original = prototype['dispose'];
    prototype['dispose'] = function dispose() {
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
            var observable = applyDecorators(this, key, ko.observable(value));
            defProp(this, key, { get: observable, set: observable });
        },
    });
}
/**
 * Accessor decorator that wraps ES6 getter and setter to hidden ko.pureComputed
 */
function computed(prototype, key) {
    var _a = getDescriptor(prototype, key), get = _a.get, set = _a.set;
    if (!set) {
        defProp(prototype, key, {
            get: function () {
                var computed = applyDecorators(this, key, ko.pureComputed(get, this));
                defProp(this, key, { get: computed });
                return computed();
            }
        });
    }
    else {
        defProp(prototype, key, {
            get: function () {
                var computed = applyDecorators(this, key, ko.pureComputed({ read: get, write: set, owner: this }));
                defProp(this, key, { get: computed, set: computed });
                return computed();
            },
            set: function (value) {
                var computed = applyDecorators(this, key, ko.pureComputed({ read: get, write: set, owner: this }));
                defProp(this, key, { get: computed, set: computed });
                computed(value);
            },
        });
    }
}
/**
 * Subscribe to observable or computed by name or by specifying callback explicitely
 * @param targetOrCallback { String | Function } name of callback or callback itself
 * when observable is decorated and name of observable property when callback is decorated
 * @param autoDispose { boolean } if true then subscription will be disposed when entire ViewModel is disposed
 */
function subscribe(targetOrCallback, autoDispose) {
    if (autoDispose === void 0) { autoDispose = true; }
    return function (prototype, key) {
        var _a = getDescriptor(prototype, key), value = _a.value, get = _a.get;
        var target, callback;
        if (typeof value === "function") {
            if (typeof targetOrCallback === "string" || typeof targetOrCallback === "symbol") {
                target = targetOrCallback; // @subscribe("target")
                callback = value; // callback(value) {}    
            }
            else {
                throw new Error("Subscription target should be a key in decorated ViewModel");
            }
        }
        else if (typeof get === "function") {
            if (typeof targetOrCallback === "function") {
                target = key; // @subscribe(ViewModel.prototype.callback)
                callback = targetOrCallback; // @observable target;
            }
            else if (typeof targetOrCallback === "string" || typeof targetOrCallback === "symbol") {
                target = key; // @subscribe("callback")
                callback = prototype[targetOrCallback]; // @observable target;
            }
            else {
                throw new Error("Subscription callback should be a function or key in decorated ViewModel");
            }
        }
        getDecorators(getMetaData(prototype), target).push({
            type: DecoratorType.Subscribe,
            value: callback,
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
exports.subscribe = subscribe;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=knockout-decorators.js.map
