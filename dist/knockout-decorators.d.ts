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
 * Accessor decorator that wraps ES6 getter and setter to hidden ko.pureComputed
 */
export declare function computed(prototype: Object, key: string | symbol): void;
/**
 *
 * @param autoDispose { boolean } if true then subscription will be disposed when entire ViewModel is disposed
 */
export declare function observer(autoDispose?: boolean): (prototype: Object, key: string | symbol) => void;
/**
 * Subscribe to observable or computed by name or by specifying callback explicitely
 */
export declare function subscribe(callback: (value: any) => void, autoDispose?: boolean): PropertyDecorator;
export declare function subscribe(targetOrCallback: string | symbol, autoDispose?: boolean): PropertyDecorator;
export declare function subscribe(targetOrCallback: string | symbol, autoDispose?: boolean): MethodDecorator;
