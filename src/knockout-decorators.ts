/**
 * Copyright (c) 2016 Dmitry Panyushkin
 * Available under MIT license
 */
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

const assign = ko.utils.extend;
const objectForEach = ko.utils.objectForEach;
const defProp = Object.defineProperty.bind(Object);
const getDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
const slice = Function.prototype.call.bind(Array.prototype.slice);

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

const DECORATORS_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators") : "__ko_decorators_";

const SUBSCRIPTIONS_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators_subscriptions") : "__ko_decorators_subscriptions_";

const DISPOSABLE_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators_disposable") : "__ko_decorators_disposable_";

export interface Disposable {
    dispose(): void,
}

const enum DecoratorType {
    Extend, Subscribe,
}

interface Decorator {
    type: DecoratorType,
    value: any,
    event?: string,
    dispose?: boolean,
}

interface DecoratorsMetaData {
    [propName: string]: Decorator[],
}

function getMetaData(prototype: Object) {
    let metaData: DecoratorsMetaData = prototype[DECORATORS_KEY];
    if (!prototype.hasOwnProperty(DECORATORS_KEY)) {
        prototype[DECORATORS_KEY] = metaData = assign({}, metaData) as DecoratorsMetaData;
        objectForEach(metaData, (key, decorators) => {
            metaData[key] = [...decorators];
        });
    }
    return metaData;
}

function getDecorators(metaData: DecoratorsMetaData, key: string | symbol) {
    return metaData[key] || (metaData[key] = []);
}

function getSubscriptions(instance: Object): Disposable[] {
    return instance[SUBSCRIPTIONS_KEY] || (instance[SUBSCRIPTIONS_KEY] = []);
}

function applyDecorators(
    instance: Object, key: string | symbol,
    target: KnockoutObservable<any> | KnockoutComputed<any>
) {
    const metaData: DecoratorsMetaData = instance[DECORATORS_KEY];
    const decorators = metaData && metaData[key];
    if (decorators) {
        decorators.forEach(d => {
            switch (d.type) {
                case DecoratorType.Extend:
                    const extenders = d.value instanceof Function
                        ? d.value.call(instance) : d.value;
                    target = target.extend(extenders);
                    break;
                case DecoratorType.Subscribe:
                    const subscription = target.subscribe(d.value, instance, d.event);
                    if (d.dispose) {
                        getSubscriptions(instance).push(subscription);
                    }
                    break;
            }
        });
    }
    return target;
}

function redefineDispose(prototype: Object) {
    if (prototype[DISPOSABLE_KEY]) { return; }
    prototype[DISPOSABLE_KEY] = true;

    const original = prototype["dispose"];
    prototype["dispose"] = function dispose() {
        const disposables = this[SUBSCRIPTIONS_KEY] as Disposable[];
        if (disposables) {
            disposables.forEach(s => { s.dispose(); });
        }
        if (original) {
            return original.apply(this, arguments);
        }
    }
}

/**
 * Property decorator that creates hidden ko.observable with ES6 getter and setter for it
 */
export function observable(prototype: Object, key: string | symbol) {
    defProp(prototype, key, {
        configurable: true,
        get() {
            const observable = applyDecorators(this, key, ko.observable());
            defProp(this, key, {
                configurable: true,
                enumerable: true,
                get: observable,
                set: observable,
            });
            return observable();
        },
        set(value) {
            const observable = applyDecorators(this, key, ko.observable());
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

type ObsArray = KnockoutObservableArray<any> & { [fnName: string]: Function };

const arrayMethods = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];
const observableArrayMethods = ["remove", "removeAll", "destroy", "destroyAll", "replace", "subscribe"];

function defObservableArray(instance: Object, key: string | symbol) {
    const obsArray = applyDecorators(instance, key, ko.observableArray()) as ObsArray;
    
    let insideObsArray = false;
    defProp(instance, key, {
        configurable: true,
        enumerable: true,
        get: obsArray,
        set(array: any[]) {
            if (array) {
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
            insideObsArray = true;
            obsArray(array);
            insideObsArray = false;
        }
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
            return this[key];
        },
        set(value: any[]) {
            defObservableArray(this, key);
            return this[key] = value;
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

    subscribe(callback: (val: T[]) => void): Disposable;
    subscribe(callback: (val: T[]) => void, callbackTarget: any): Disposable;
    subscribe(callback: (val: any[]) => void, callbackTarget: any, event: string): Disposable;
}

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

/**
 * Replace original method with factory that produces ko.computed from original method
 */
export function reaction(autoDispose: boolean): MethodDecorator;
export function reaction(prototype: Object, key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor;

/**
 * Replace original method with factory that produces ko.computed from original method
 * @param autoDispose { Boolean } if true then subscription will be disposed when entire ViewModel is disposed
 */
export function reaction(
    prototypeOrAutoDispose: Object | boolean, key?: string | symbol, desc?: PropertyDescriptor
) {
    let autoDispose: boolean;
    if (typeof prototypeOrAutoDispose === "boolean" && key === void 0) {
        autoDispose = prototypeOrAutoDispose;         // @reaction(false)
        return decorator;                             // onSomethingChange() {}
    } else if (typeof prototypeOrAutoDispose === "object" && key !== void 0) {
        autoDispose = true;                           // @reaction
        decorator(prototypeOrAutoDispose, key, desc); // onSomethingChange() {}
    } else {
        throw new Error("Can not use @reaction decorator this way");
    }

    function decorator(prototype: Object, key: string | symbol, desc: PropertyDescriptor) {
        const { value } = desc || (desc = getDescriptor(prototype, key));
        desc.value = function () {
            const args = slice(arguments);
            const computed = ko.computed(() => value.apply(this, args));
            if (autoDispose) {
                getSubscriptions(this).push(computed);
            }
            return computed;
        };
        if (autoDispose) {
            redefineDispose(prototype);
        }
        return desc;
    }
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
        getDecorators(getMetaData(prototype), key).push({
            type: DecoratorType.Extend,
            value: extendersOrFactory,
        });
    }
}

/**
 * Subscribe to @observable by name or by specifying callback explicitely
 */
export function subscribe(callback: (value: any) => void, event?: string, autoDispose?: boolean): PropertyDecorator;
export function subscribe(targetOrCallback: string | symbol, event?: string, autoDispose?: boolean): PropertyDecorator;
export function subscribe(targetOrCallback: string | symbol, event?: string, autoDispose?: boolean): MethodDecorator;

/**
 * Subscribe to @observable by name or by specifying callback explicitely
 * @param targetOrCallback { String | Function } name of callback or callback itself
 * when observable is decorated and name of observable property when callback is decorated
 * @param event { String } Knockout subscription event name
 * @param autoDispose { Boolean } if true then subscription will be disposed when entire ViewModel is disposed
 */
export function subscribe(
    targetOrCallback: string | symbol | Function, event?: string, autoDispose = true
) {
    return function (prototype: Object, key: string | symbol, desc: PropertyDescriptor) {
        const { value, get } = desc || (desc = getDescriptor(prototype, key));
        let targetKey: string | symbol;
        let callback: Function;
        if (typeof value === "function") {
            if (typeof targetOrCallback === "string" || typeof targetOrCallback === "symbol") {
                targetKey = targetOrCallback;                   // @subscribe("target")
                callback = value;                               // callback(value) {}    
            } else {
                throw new Error("Subscription target should be a key in decorated ViewModel");
            }
        } else if (typeof get === "function") {
            if (typeof targetOrCallback === "function") {
                targetKey = key;                                // @subscribe(ViewModel.prototype.callback)
                callback = targetOrCallback;                    // @observable target;
            } else if (typeof targetOrCallback === "string" || typeof targetOrCallback === "symbol") {
                targetKey = key;                                // @subscribe("callback")
                callback = prototype[targetOrCallback];         // @observable target;
            } else {
                throw new Error("Subscription callback should be a function or key in decorated ViewModel");
            }
        }
        getDecorators(getMetaData(prototype), targetKey).push({
            type: DecoratorType.Subscribe,
            value: callback,
            event: event,
            dispose: autoDispose,
        });
        if (autoDispose) {
            redefineDispose(prototype);
        }
        return desc as any;
    }
}

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

/**
 * Get internal ko.observable() for object property decodated by @observable
 */
export function unwrap(instance: Object, key: string | symbol): any;
export function unwrap<T>(instance: Object, key: string | symbol): KnockoutObservable<T>;
export function unwrap(instance: Object, key: string | symbol) {
    return getDescriptor(instance, key).get;
}