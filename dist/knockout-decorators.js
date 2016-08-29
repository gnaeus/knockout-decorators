(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('knockout')) :
    typeof define === 'function' && define.amd ? define(['exports', 'knockout'], factory) :
    (factory((global.KnockoutDecorators = global.KnockoutDecorators || {}),global.ko));
}(this, (function (exports,ko) { 'use strict';

var extend = ko.utils.extend;
/**
 * Register Knockout component by decorating ViewModel class
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
var defProp = Object.defineProperty.bind(Object);
/**
 * Property decorator that creates hidden ko.observable with ES6 getter and setter for it
 */
function observable(target, key) {
    defProp(target, key, {
        get: function () {
            var observable = ko.observable();
            defProp(this, key, {
                get: observable,
                set: observable,
            });
            return observable();
        },
        set: function (value) {
            var observable = ko.observable(value);
            defProp(this, key, {
                get: observable,
                set: observable,
            });
        },
    });
}
/**
 * Accessor decorator that wraps ES6 getter and setter to hidden ko.pureComputed
 */
function computed(target, key) {
    var _a = Object.getOwnPropertyDescriptor(target, key), get = _a.get, set = _a.set;
    if (!set) {
        defProp(target, key, {
            get: function () {
                var computed = ko.pureComputed(get, this);
                defProp(this, key, {
                    get: computed,
                });
                return computed();
            }
        });
    }
    else {
        defProp(target, key, {
            get: function () {
                var computed = ko.pureComputed({
                    read: get,
                    write: set,
                    owner: this,
                });
                defProp(this, key, {
                    get: computed,
                    set: computed,
                });
                return computed();
            },
            set: function (value) {
                var computed = ko.pureComputed({
                    read: get,
                    write: set,
                    owner: this,
                });
                defProp(this, key, {
                    get: computed,
                    set: computed,
                });
                computed(value);
            },
        });
    }
}

exports.component = component;
exports.observable = observable;
exports.computed = computed;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=knockout-decorators.js.map
