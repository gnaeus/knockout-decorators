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
export interface Disposable {
    dispose(): void;
}
/**
 * Property decorator that creates hidden ko.observable with ES6 getter and setter for it
 */
export declare function observable(prototype: Object, key: string | symbol): void;
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
    subscribe(callback: (val: T[]) => void): Disposable;
    subscribe(callback: (val: T[]) => void, callbackTarget: any): Disposable;
    subscribe(callback: (val: any[]) => void, callbackTarget: any, event: string): Disposable;
}
/**
 * Accessor decorator that wraps ES6 getter and setter to hidden ko.pureComputed
 */
export declare function computed(prototype: Object, key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor;
/**
 * Replace original method with factory that produces ko.computed from original method
 */
export declare function reaction(autoDispose: boolean): MethodDecorator;
export declare function reaction(prototype: Object, key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor;
/**
 * Apply extenders to decorated @observable
 */
export declare function extend(extenders: Object): PropertyDecorator;
export declare function extend(extendersFactory: () => Object): PropertyDecorator;
/**
 * Subscribe to @observable by name or by specifying callback explicitely
 */
export declare function subscribe(callback: (value: any) => void, event?: string, autoDispose?: boolean): PropertyDecorator;
export declare function subscribe(targetOrCallback: string | symbol, event?: string, autoDispose?: boolean): PropertyDecorator;
export declare function subscribe(targetOrCallback: string | symbol, event?: string, autoDispose?: boolean): MethodDecorator;
/**
 * Shorthand for ko.pureComputed(dependency).subscribe(callback)
 */
export declare function subscribe<T>(dependency: () => T, callback: (value: T) => void): KnockoutSubscription;
/**
 * Like https://github.com/jayphelps/core-decorators.js @autobind but less smart and complex
 * Do NOT use with ES6 inheritance!
 */
export declare function autobind(prototype: Object, key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor;
/**
 * Get internal ko.observable() for object property decodated by @observable
 */
export declare function unwrap(instance: Object, key: string | symbol): any;
export declare function unwrap<T>(instance: Object, key: string | symbol): KnockoutObservable<T>;
export as namespace KnockoutDecorators;