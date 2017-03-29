/// <reference types="knockout" />
/**
 * Property decorator that creates hidden (shallow) ko.observable with ES6 getter and setter for it
 * If initialized by Array then hidden (shallow) ko.observableArray will be created
 */
export declare function observable(prototype: Object, key: string | symbol): void;
/**
 * Property decorator that creates hidden (deep) ko.observable with ES6 getter and setter for it
 * If initialized by Array then hidden (deep) ko.observableArray will be created
 */
export declare function reactive(prototype: Object, key: string | symbol): void;
/**
 * Accessor decorator that wraps ES6 getter to hidden ko.pureComputed
 *
 * Setter is not wrapped to hidden ko.pureComputed and stays unchanged
 *
 * But we can still extend getter @computed by extenders like { rateLimit: 500 }
 */
export declare function computed(prototype: Object, key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor;
/**
 * Property decorator that creates hidden (shallow) ko.observableArray with ES6 getter and setter for it
 */
export declare function observableArray(prototype: Object, key: string | symbol): void;
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
/**
 * Apply extenders to decorated @observable
 */
export declare function extend(extenders: Object): PropertyDecorator;
/**
 * Apply extenders to decorated @observable
 */
export declare function extend(extendersFactory: () => Object): PropertyDecorator;
export interface ComponentConstructor {
    new (params?: any, element?: Node, templateNodes?: Node[]): any;
}
export declare type ComponentDecorator = (constructor: ComponentConstructor) => void;
export declare type TemplateConfig = (string | Node[] | DocumentFragment | {
    require: string;
} | {
    element: string | Node;
});
/**
 * Register Knockout component by decorating ViewModel class
 */
export declare function component(name: string, options?: Object): ComponentDecorator;
/**
 * Register Knockout component by decorating ViewModel class
 */
export declare function component(name: string, template: TemplateConfig, options?: Object): ComponentDecorator;
/**
 * Register Knockout component by decorating ViewModel class
 */
export declare function component(name: string, template: TemplateConfig, styles: string | string[], options?: Object): ComponentDecorator;
/**
 * Like https://github.com/jayphelps/core-decorators.js @autobind but less smart and complex
 * Do NOT use with ES6 inheritance!
 */
export declare function autobind(prototype: Object, key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor;
/**
 * Define hidden ko.subscribable, that notifies subscribers when decorated method is invoked
 */
export declare function event(prototype: Object, key: string | symbol): void;
export declare type EventType = Function & {
    subscribe(callback: Function): KnockoutSubscription;
};
/**
 * Subscribe callback to `@observable` or `@computed` dependency changes or to some `@event` property
 */
export declare function subscribe<T>(dependencyOrEvent: () => T, callback: (value: T) => void, options?: {
    once?: boolean;
    event?: "change" | "beforeChange";
}): KnockoutSubscription;
/**
 * Subscribe callback to `@observableArray` dependency "arrayChange" event
 */
export declare function subscribe<T>(dependency: () => T[], callback: (value: {
    status: "added" | "deleted";
    value: T;
    index: number;
}[]) => void, options: {
    once?: boolean;
    event: "arrayChange";
}): KnockoutSubscription;
/**
 * Subscribe callback to some `@event` property
 */
export declare function subscribe<T>(event: (arg: T) => void, callback: (arg: T) => void, options?: {
    once?: boolean;
}): KnockoutSubscription;
/**
 * Subscribe callback to some `@event` property
 */
export declare function subscribe<T1, T2>(event: (arg1: T1, arg2: T2) => void, callback: (arg1: T1, arg2: T2) => void, options?: {
    once?: boolean;
}): KnockoutSubscription;
/**
 * Subscribe callback to some `@event` property
 */
export declare function subscribe<T1, T2, T3>(event: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => void, callback: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => void, options?: {
    once?: boolean;
}): KnockoutSubscription;
/**
 * Get internal ko.observable() for object property decodated by @observable
 */
export declare function unwrap(instance: Object, key: string | symbol): any;
/**
 * Get internal ko.observable() for object property decodated by @observable
 */
export declare function unwrap<T>(instance: Object, key: string | symbol): KnockoutObservable<T>;
/**
 * Mixin which add `subscribe()` instance method and implement `dispose()` method,
 * that disposes all subscription created by `subscribe()`
 */
export interface Disposable {
    /** Dispose all subscriptions from this class */
    dispose(): void;
    /** Subscribe callback to `@observable` or `@computed` dependency changes or to some `@event` property */
    subscribe<T>(dependencyOrEvent: () => T, callback: (value: T) => void, options?: {
        once?: boolean;
        event?: "change" | "beforeChange";
    }): KnockoutSubscription;
    /** Subscribe callback to `@observableArray` dependency "arrayChange" event */
    subscribe<T>(dependency: () => T[], callback: (value: {
        status: "added" | "deleted";
        value: T;
        index: number;
    }[]) => void, options: {
        once?: boolean;
        event: "arrayChange";
    }): KnockoutSubscription;
    /** Subscribe callback to some `@event` property */
    subscribe<T>(event: (arg: T) => void, callback: (arg: T) => void, options?: {
        once?: boolean;
    }): KnockoutSubscription;
    /** Subscribe callback to some `@event` property */
    subscribe<T1, T2>(event: (arg1: T1, arg2: T2) => void, callback: (arg1: T1, arg2: T2) => void, options?: {
        once?: boolean;
    }): KnockoutSubscription;
    /** Subscribe callback to some `@event` property */
    subscribe<T1, T2, T3>(event: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => void, callback: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => void, options?: {
        once?: boolean;
    }): KnockoutSubscription;
    /** Get internal ko.observable() for class property decodated by `@observable` */
    unwrap(key: string | symbol): any;
    /** Get internal ko.observable() for class property decodated by `@observable` */
    unwrap<T>(key: string | symbol): KnockoutObservable<T>;
}
/**
 * Mixin which add `subscribe()` instance method and implement `dispose()` method,
 * that disposes all subscription created by `subscribe()`
 * @param Base {Function} Base class to extend
 */
export declare function Disposable<T extends new (...args: any[]) => {}>(Base?: T): (new (...args: any[]) => Disposable) & T;
export as namespace KnockoutDecorators;
