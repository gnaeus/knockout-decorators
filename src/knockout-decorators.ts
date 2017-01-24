/**
 * Copyright (c) 2016 Dmitry Panyushkin
 * Available under MIT license
 * Version: 0.8.0
 */
import * as ko from "knockout";

const assign = ko.utils.extend;
const objectForEach = ko.utils.objectForEach;
const defineProperty = Object.defineProperty.bind(Object);
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
const hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
const slice = Function.prototype.call.bind(Array.prototype.slice);

/*===========================================================================*/

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
 * @param name { String } Name of component
 * @param template { Any } Knockout template definition
 * @param styles { Any } Ignored parameter (used for `require()` styles by webpack etc.)
 * @param options { Object } Another options that passed directly to `ko.components.register()`
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
        ko.components.register(name, assign({
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

/*===========================================================================*/

/**
 * Property decorator that creates hidden ko.observable with ES6 getter and setter for it
 */
export function observable(prototype: Object, key: string | symbol) {
    defineProperty(prototype, key, {
        configurable: true,
        get() {
            const observable = applyExtenders(this, key, ko.observable());
            defineProperty(this, key, {
                configurable: true,
                enumerable: true,
                get: observable,
                set: observable,
            });
            return observable();
        },
        set(value) {
            const observable = applyExtenders(this, key, ko.observable());
            defineProperty(this, key, {
                configurable: true,
                enumerable: true,
                get: observable,
                set: observable,
            });
            observable(value);
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
export function computed(prototype: Object, key: string | symbol, desc: PropertyDescriptor) {
    const { get, set } = desc || (desc = getOwnPropertyDescriptor(prototype, key));
    desc.get = function () {
        const computed = applyExtenders(this, key, ko.pureComputed(get, this));
        defineProperty(this, key, {
            configurable: true,
            get: computed,
            set: set
        });
        return computed();
    };
    return desc;
    // TODO: make @computed extendable (by @extend decorator)
}

/*===========================================================================*/

type ObsArray = KnockoutObservableArray<any> & { [fnName: string]: Function };

const arrayMethods = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];
const observableArrayMethods = ["remove", "removeAll", "destroy", "destroyAll", "replace", "subscribe"];

function defineObservableArray(instance: Object, key: string | symbol) {
    const obsArray = applyExtenders(instance, key, ko.observableArray()) as ObsArray;
    
    let insideObsArray = false;

    defineProperty(instance, key, {
        configurable: true,
        enumerable: true,
        get: obsArray,
        set(value: any[]) {
            const lastValue = obsArray.peek();
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

    function patchArrayMethods(array: any[]) {
        arrayMethods.forEach(fnName => defineProperty(array, fnName, {
            configurable: true,
            value() {
                if (insideObsArray) {
                    return Array.prototype[fnName].apply(array, arguments);
                }
                insideObsArray = true;
                const result = obsArray[fnName].apply(obsArray, arguments);
                insideObsArray = false;
                return result;
            }
        }));
        observableArrayMethods.forEach(fnName => defineProperty(array, fnName, {
            configurable: true,
            value() {
                insideObsArray = true;
                const result = obsArray[fnName].apply(obsArray, arguments);
                insideObsArray = false;
                return result;
            }
        }));
    }
}

// moved outside of defineObservableArray function to prevent creation of unnecessary closure
function clearArrayMethods(array: any[]) {
    arrayMethods.forEach(fnName => {
        delete array[fnName]; 
    });
    observableArrayMethods.forEach(fnName => {
        delete array[fnName]; 
    });
}

/**
 * Property decorator that creates hidden ko.observableArray with ES6 getter and setter for it
 */
export function observableArray(prototype: Object, key: string | symbol) {
    defineProperty(prototype, key, {
        configurable: true,
        get() {
            defineObservableArray(this, key);
            this[key] = [];
            return this[key];
        },
        set(value: any[]) {
            defineObservableArray(this, key);
            this[key] = value;
        },
    });
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
}

/*===========================================================================*/

const EXTENDERS_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators_extenders") : "__ko_decorators_extenders__";

type Extender = Object | Function;

interface ExtendersDictionary {
    [propName: string]: Extender[];
}

function applyExtenders(
    instance: Object, key: string | symbol,
    target: KnockoutObservable<any> | KnockoutComputed<any>
) {
    const dictionary = instance[EXTENDERS_KEY] as ExtendersDictionary;
    const extenders = dictionary && dictionary[key];
    if (extenders) {
        extenders.forEach(extender => {
            const koExtender = extender instanceof Function
                ? extender.call(instance) : extender;

            target = target.extend(koExtender);
        });
    }
    return target;
}

/**
 * Apply extenders to decorated @observable
 */
export function extend(extenders: Object): PropertyDecorator;
export function extend(extendersFactory: () => Object): PropertyDecorator;

/**
 * Apply extenders to decorated @observable
 * @extendersOrFactory { Object | Function } Knockout extenders definition or factory that produces definition
 */
export function extend(extendersOrFactory: Object | Function) {
    return function (prototype: Object, key: string | symbol) {
        let dictionary = prototype[EXTENDERS_KEY] as ExtendersDictionary;
        // if there is no ExtendersDictionary or ExtendersDictionary lives in base class prototype
        if (!hasOwnProperty(prototype, EXTENDERS_KEY)) {
            // clone ExtendersDictionary from base class prototype or create new ExtendersDictionary
            prototype[EXTENDERS_KEY] = dictionary = assign({}, dictionary) as ExtendersDictionary;
            // clone Extenders arrays for each property key
            objectForEach(dictionary, (key, extenders) => {
                dictionary[key] = [...extenders];
            });
        }
        // get existing Extenders array or create new array
        const extenders = dictionary[key] || (dictionary[key] = []);
        // add new Extender
        extenders.push(extendersOrFactory);
    }
}

/*===========================================================================*/

/**
 * Like https://github.com/jayphelps/core-decorators.js @autobind but less smart and complex
 * Do NOT use with ES6 inheritance!
 */
export function autobind(prototype: Object, key: string | symbol, desc: PropertyDescriptor) {
    const { value, configurable, enumerable } = desc || (desc = getOwnPropertyDescriptor(prototype, key));
    return {
        configurable: configurable,
        enumerable: enumerable,
        get() {
            if (this === prototype) {
                return value;
            }
            const bound = value.bind(this);
            defineProperty(this, key, {
                configurable: true,
                value: bound,
            });
            return bound;
        }
    } as PropertyDescriptor;
}

/*===========================================================================*/

/**
 * Subscribe callback to dependency changes
 */
export function subscribe<T>(
    getDependency: () => T, 
    callback: (value: T) => void,
    options?: { once?: boolean, event?: string }
): KnockoutSubscription {
    const once = options && options.once || false;
    const event = options && options.event || "change";

    const dependency = ko.computed(getDependency);
    
    const subscription = dependency.subscribe(callback, null, event);
    
    const originalDispose = subscription.dispose;
    // dispose hidden computed with subscription
    subscription.dispose = function () {
        originalDispose.call(this);
        dependency.dispose();
    };

    if (once) {
        dependency.subscribe(() => {
            subscription.dispose();
        });
    }
    return subscription;
}

/*===========================================================================*/

/**
 * Get internal ko.observable() for object property decodated by @observable
 */
export function unwrap(instance: Object, key: string | symbol): any;
export function unwrap<T>(instance: Object, key: string | symbol): KnockoutObservable<T>;

/**
 * Get internal ko.observable() for object property decodated by @observable
 */
export function unwrap(instance: Object, key: string | symbol) {
    if (!hasOwnProperty(instance, key)) {
        // invoke getter on instance.__proto__ that defines property on instance
        instance[key];
    }
    return getOwnPropertyDescriptor(instance, key).get;
}