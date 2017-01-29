/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 * Version: 0.9.0-dev
 */
import * as ko from "knockout";
import { extendObject, defineProperty, hasOwnProperty, getOwnPropertyDescriptor, arraySlice } from "./common-functions";
import { defineExtenders, applyExtenders } from "./property-extenders";
import { defineObservableProperty, prepareReactiveObject } from "./observable-property";
import { defineObservableArray } from "./observable-array";

/**
 * Property decorator that creates hidden (shallow) ko.observable with ES6 getter and setter for it
 * If initialized by Array then hidden (shallow) ko.observableArray will be created
 */
export function observable(prototype: Object, key: string | symbol) {
    defineProperty(prototype, key, {
        configurable: true,
        get() {
            throw new Error("@observable property '" + key.toString() + "' was not initialized");
        },
        set(value: any) {
            if (Array.isArray(value)) {
                defineObservableArray(this, key, value, false);
            } else {
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
export function reactive(prototype: Object, key: string | symbol) {
    defineProperty(prototype, key, {
        configurable: true,
        get() {
            throw new Error("@reactive property '" + key.toString() + "' was not initialized");
        },
        set(value: any) {
            if (Array.isArray(value)) {
                defineObservableArray(this, key, value, true);
            } else {
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
}

/*---------------------------------------------------------------------------*/

/**
 * Property decorator that creates hidden (shallow) ko.observableArray with ES6 getter and setter for it
 */
export function observableArray(prototype: Object, key: string | symbol) {
    defineProperty(prototype, key, {
        configurable: true,
        get() {
            throw new Error("@observableArray property '" + key.toString() + "' was not initialized");
        },
        set(value: any[]) {
            defineObservableArray(this, key, value, false);
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

    /**
     * Run mutator function that can write to array at some index (`array[index] = value;`)
     * Then notify about observableArray changes
     */
    mutate(mutator: (arrayValue: T[]) => void): void;

    /**
     * Replace value at some index and return old value
     */
    set(index: number, value: T): T;
}

/*---------------------------------------------------------------------------*/

/**
 * Apply extenders to decorated @observable
 */
export function extend(extenders: Object): PropertyDecorator;
/**
 * Apply extenders to decorated @observable
 */
export function extend(extendersFactory: () => Object): PropertyDecorator;
/**
 * Apply extenders to decorated @observable
 * @extendersOrFactory { Object | Function } Knockout extenders definition or factory that produces definition
 */
export function extend(extendersOrFactory: Object | Function) {
    return function (prototype: Object, key: string | symbol) {
        defineExtenders(prototype, key, extendersOrFactory);
    }
}

/*---------------------------------------------------------------------------*/

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
/**
 * Register Knockout component by decorating ViewModel class
 */
export function component(
    name: string,
    template: TemplateConfig,
    options?: Object
): ComponentDecorator;
/**
 * Register Knockout component by decorating ViewModel class
 */
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
        ko.components.register(name, extendObject({
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

/*---------------------------------------------------------------------------*/

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

/*---------------------------------------------------------------------------*/

/**
 * Define hidden ko.subscribable, that notifies subscribers when decorated method is invoked
 */
export function event(prototype: Object, key: string | symbol, desc: PropertyDescriptor) {
    const { value } = desc || (desc = getOwnPropertyDescriptor(prototype, key));
    return {
        configurable: false,
        get() {
            const subscribable = new ko.subscribable();
            
            function eventNotifier () {
                const eventArgs = arraySlice(arguments);
                subscribable.notifySubscribers(eventArgs);
            }

            eventNotifier["subscribable"] = subscribable;

            defineProperty(this, key, {
                configurable: true,
                value: eventNotifier,
            });

            return eventNotifier;
        }
    } as PropertyDescriptor;
}

/*---------------------------------------------------------------------------*/

/**
 * Subscribe callback to dependency changes
 */
export function subscribe<T>(
    getDependency: () => T, 
    callback: (value: T) => void,
    options?: { once?: boolean, event?: string }
): KnockoutSubscription;
/**
 * Subscribe callback to  some `@event`
 */
export function subscribe(
    event: () => void, 
    callback: () => void,
    options?: { once?: boolean }
): KnockoutSubscription;
/**
 * Subscribe callback to  some `@event`
 */
export function subscribe<T>(
    event: (arg: T) => void, 
    callback: (arg: T) => void,
    options?: { once?: boolean }
): KnockoutSubscription;
/**
 * Subscribe callback to  some `@event`
 */
export function subscribe<T1, T2>(
    event: (arg1: T1, arg2: T2) => void, 
    callback: (arg1: T1, arg2: T2) => void,
    options?: { once?: boolean }
): KnockoutSubscription;
/**
 * Subscribe callback to  some `@event`
 */
export function subscribe<T1, T2>(
    event: (arg1: T1, arg2: T2, ...args: any[]) => void, 
    callback: (arg1: T1, arg2: T2, ...args: any[]) => void,
    options?: { once?: boolean }
): KnockoutSubscription;
/**
 * Subscribe callback to dependency changes
 */
export function subscribe<T>(
    dependencyOrEvent: Function,
    callback: (...args: any[]) => void,
    options?: { once?: boolean, event?: string }
): KnockoutSubscription {
    const once = options && options.once || false;
    const event = options && options.event || "change";

    if (hasOwnProperty(dependencyOrEvent, "subscribable")) {
        // subscribe to @event
        const subscribable = dependencyOrEvent["subscribable"] as KnockoutSubscribable<any[]>;

        const subscription = subscribable.subscribe(eventArgs => {
            callback.apply(null, eventArgs);
        });

        if (once) {
            subscribable.subscribe(() => {
                subscription.dispose();
            });
        }
        return subscription;
    } else {
        // subscribe to @observable, @reactive or @computed
        const computed = ko.computed(dependencyOrEvent as () => T);
        
        const subscription = computed.subscribe(callback, null, event);
        
        const originalDispose = subscription.dispose;
        // dispose hidden computed with subscription
        subscription.dispose = function () {
            originalDispose.call(this);
            computed.dispose();
        };

        if (once) {
            computed.subscribe(() => {
                subscription.dispose();
            });
        }
        return subscription;
    }
}

/*---------------------------------------------------------------------------*/

/**
 * Get internal ko.observable() for object property decodated by @observable
 */
export function unwrap(instance: Object, key: string | symbol): any;
/**
 * Get internal ko.observable() for object property decodated by @observable
 */
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