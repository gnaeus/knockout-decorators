import * as ko from 'knockout';

const extend = ko.utils.extend;
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
                createViewModel(params, { element, templateNodes }) {
                    return new constructor(params, element, templateNodes);
                }
            },
            template: template || "<!---->",
            synchronous: true,
        }, options));
    };
}
const defProp = Object.defineProperty.bind(Object);
/**
 * Property decorator that creates hidden ko.observable with ES6 getter and setter for it
 */
function observable(target, key) {
    defProp(target, key, {
        get() {
            const observable = ko.observable();
            defProp(this, key, {
                get() { return observable(); },
                set(value) { observable(value); },
            });
            return observable();
        },
        set(value) {
            const observable = ko.observable(value);
            defProp(this, key, {
                get() { return observable(); },
                set(value) { observable(value); },
            });
        },
    });
}
/**
 * Accessor decorator that wraps ES6 getter and setter to hidden ko.pureComputed
 */
function computed(target, key) {
    const { get, set } = Object.getOwnPropertyDescriptor(target, key);
    if (!set) {
        defProp(target, key, {
            get() {
                const computed = ko.pureComputed(get, this);
                defProp(this, key, {
                    get() { return computed(); }
                });
                return computed();
            }
        });
    }
    else {
        defProp(target, key, {
            get() {
                const computed = ko.pureComputed({
                    read: get,
                    write: set,
                    owner: this,
                });
                defProp(this, key, {
                    get() { return computed(); },
                    set(value) { computed(value); },
                });
                return computed();
            },
            set(value) {
                const computed = ko.pureComputed({
                    read: get,
                    write: set,
                    owner: this,
                });
                defProp(this, key, {
                    get() { return computed(); },
                    set(value) { computed(value); },
                });
                computed(value);
            },
        });
    }
}

export { component, observable, computed };
//# sourceMappingURL=knockout-decorators.js.map
