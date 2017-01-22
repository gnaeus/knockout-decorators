/// <reference types="knockout" />
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
export declare function component(name: string, template: TemplateConfig, options?: Object): ComponentDecorator;
export declare function component(name: string, template: TemplateConfig, styles: string | string[], options?: Object): ComponentDecorator;
/**
 * Property decorator that creates hidden ko.observable with ES6 getter and setter for it
 */
export declare function observable(prototype: Object, key: string | symbol): void;
/**
 * Accessor decorator that wraps ES6 getter to hidden ko.pureComputed
 *
 * Setter is not wrapped to hidden ko.pureComputed and stays unchanged
 *
 * But we can still extend getter @computed by extenders like { rateLimit: 500 }
 */
export declare function computed(prototype: Object, key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor;
/**
 * Property decorator that creates hidden ko.observableArray with ES6 getter and setter for it
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
}
/**
 * Apply extenders to decorated @observable
 */
export declare function extend(extenders: Object): PropertyDecorator;
export declare function extend(extendersFactory: () => Object): PropertyDecorator;
/**
 * Like https://github.com/jayphelps/core-decorators.js @autobind but less smart and complex
 * Do NOT use with ES6 inheritance!
 */
export declare function autobind(prototype: Object, key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor;
/**
 * Subscribe callback to dependency changes
 */
export declare function subscribe<T>(getDependency: () => T, callback: (value: T) => void, options?: {
    once?: boolean;
    event?: string;
}): KnockoutSubscription;
/**
 * Get internal ko.observable() for object property decodated by @observable
 */
export declare function unwrap(instance: Object, key: string | symbol): any;
export declare function unwrap<T>(instance: Object, key: string | symbol): KnockoutObservable<T>;
export as namespace KnockoutDecorators;