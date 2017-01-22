/**
 * Copyright (c) 2016 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";

const assign = ko.utils.extend;
const objectForEach = ko.utils.objectForEach;
const defProp = Object.defineProperty.bind(Object);
const getDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
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
    defProp(prototype, key, {
        configurable: true,
        get() {
            const observable = applyExtenders(this, key, ko.observable());
            defProp(this, key, {
                configurable: true,
                enumerable: true,
                get: observable,
                set: observable,
            });
            return observable();
        },
        set(value) {
            const observable = applyExtenders(this, key, ko.observable());
            defProp(this, key, {
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
 * Accessor decorator that wraps ES6 getter and setter to hidden ko.pureComputed
 */
export function computed(prototype: Object, key: string | symbol, desc: PropertyDescriptor) {
    const { get, set } = desc || (desc = getDescriptor(prototype, key));
    desc.get = function () {
        const computed = ko.pureComputed(get, this);
        defProp(this, key, {
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

function defObservableArray(instance: Object, key: string | symbol) {
    const obsArray = applyExtenders(instance, key, ko.observableArray()) as ObsArray;
    
    let insideObsArray = false;

    defProp(instance, key, {
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
        arrayMethods.forEach(fnName => defProp(array, fnName, {
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
        observableArrayMethods.forEach(fnName => defProp(array, fnName, {
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

// moved outside of defObservableArray function to prevent creation of unnecessary closure
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
    defProp(prototype, key, {
        configurable: true,
        get() {
            defObservableArray(this, key);
            this[key] = [];
            return this[key];
        },
        set(value: any[]) {
            defObservableArray(this, key);
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

const DECORATORS_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators") : "__ko_decorators__";

type Extender = Object | Function;

interface MetaData {
    [propName: string]: Extender[];
}

function getOrCreateMetaData(prototype: Object) {
    let metaData: MetaData = prototype[DECORATORS_KEY];
    if (!prototype.hasOwnProperty(DECORATORS_KEY)) {
        // clone MetaData from base class prototype
        prototype[DECORATORS_KEY] = metaData = assign({}, metaData) as MetaData;
        // clone extenders arrays for each property key
        objectForEach(metaData, (key, extenders) => {
            metaData[key] = [...extenders];
        });
    }
    return metaData;
}

function getOrCreateExtenders(metaData: MetaData, key: string | symbol) {
    return metaData[key] || (metaData[key] = []);
}

function applyExtenders(
    instance: Object, key: string | symbol,
    target: KnockoutObservable<any> | KnockoutComputed<any>
) {
    const metaData: MetaData = instance[DECORATORS_KEY];
    const extenders = metaData && metaData[key];
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
        const medaData = getOrCreateMetaData(prototype);
        const extenders = getOrCreateExtenders(medaData, key);
        extenders.push(extendersOrFactory);
    }
}

/*===========================================================================*/

/**
 * Like https://github.com/jayphelps/core-decorators.js @autobind but less smart and complex
 * Do NOT use with ES6 inheritance!
 */
export function autobind(prototype: Object, key: string | symbol, desc: PropertyDescriptor) {
    const { value, configurable, enumerable } = desc || (desc = getDescriptor(prototype, key));
    return {
        configurable: configurable,
        enumerable: enumerable,
        get() {
            if (this === prototype) {
                return value;
            }
            const bound = value.bind(this);
            defProp(this, key, {
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
    return getDescriptor(instance, key).get;
}