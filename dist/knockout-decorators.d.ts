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
 * Accessor decorator that wraps ES6 getter and setter to hidden ko.pureComputed
 */
export declare function computed(prototype: Object, key: string | symbol): void;
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
 * Property decorator that creates hidden ko.observableArray with ES6 getter and setter for it
 */
export declare function observableArray(prototype: Object, key: string | symbol): void;
/**
 * Replace original method with factory that produces ko.computed from original method
 */
export declare function observer(autoDispose: boolean): MethodDecorator;
export declare function observer(prototype: Object, key: string | symbol): void;
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
