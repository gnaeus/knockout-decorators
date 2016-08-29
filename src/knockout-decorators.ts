import * as ko from "knockout";

export interface ComponentConstructor {
    new (
        params?: any,
        element?: Node,
        templateNodes?: Node[]
    ): any;
}

export type ComponentDecorator = (constructor: ComponentConstructor) => void;

export type TemplateConfig = (
    string
    | Node[] 
    | DocumentFragment 
    | { require: string }
    | { element: string | Node }
);

const extend = ko.utils.extend;

/**
 * Register Knockout component by decorating ViewModel class
 */
export function component(
    name: string,
    options?: Object
): ComponentDecorator;
export function component(
    name: string,
    template: TemplateConfig,
    options?: Object
): ComponentDecorator;
export function component(
    name: string,
    template: TemplateConfig,
    styles: string | string[],
    options?: Object
): ComponentDecorator;

/**
 * Register Knockout component by decorating ViewModel class
 */
export function component(
    name: string,
    template?: any,
    styles?: any,
    options?: Object
) {
    if (options === void 0) {
        if (styles === void 0) {
            if (typeof template === "object"
                && template.constructor === Object
                && !("require" in template)
                && !("element" in template)
            ) {
                options = template;
                template = void 0;
            }
        } else if (typeof styles === "object") {
            options = styles;
            styles = void 0;
        }
    }

    return function (constructor: ComponentConstructor) {
        ko.components.register(name, extend({
            viewModel: constructor.length < 2 ? constructor : {
                createViewModel(params, { element, templateNodes }) {
                    return new constructor(params, element, templateNodes);
                }
            },
            template: template || "<!---->",
            synchronous: true,
        }, options));
    }
}

const defProp = Object.defineProperty.bind(Object);

/**
 * Property decorator that creates hidden ko.observable with ES6 getter and setter for it
 */
export function observable(target: Object, key: string | symbol) {
    defProp(target, key, {
        get() {
            const observable = ko.observable();
            defProp(this, key, {
                get: observable,
                set: observable,
            });
            return observable();
        },
        set(value) {
            const observable = ko.observable(value);
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
export function computed(target: Object, key: string | symbol) {
    const { get, set } = Object.getOwnPropertyDescriptor(target, key);
    if (!set) {
        defProp(target, key, {
            get() {
                const computed = ko.pureComputed(get, this);
                defProp(this, key, {
                    get: computed,
                });
                return computed();
            }
        });
    } else {
        defProp(target, key, {
            get() {
                const computed = ko.pureComputed({
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
            set(value) {
                const computed = ko.pureComputed({
                    read: get,
                    write: set,
                    owner: this,
                });
                defProp(this, key,  {
                    get: computed,
                    set: computed,
                });
                computed(value);
            },
        });
    }
}