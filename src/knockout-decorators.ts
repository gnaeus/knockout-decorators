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
const objectForEach = ko.utils.objectForEach;
const defProp = Object.defineProperty.bind(Object);
const getDescriptor = Object.getOwnPropertyDescriptor.bind(Object);

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

const DECORATORS_KEY = typeof Symbol !== "undefined"
    ? Symbol("knockout_decorators") : "__knockout_decorators_";

const SUBSCRIPTIONS_KEY = typeof Symbol !== "undefined"
    ? Symbol("knockout_decorators_subscriptions") : "__knockout_decorators_subscriptions_";

const DISPOSABLE_KEY = typeof Symbol !== "undefined"
    ? Symbol("knockout_decorators_disposable") : "__knockout_decorators_disposable_";

const enum DecoratorType {
    Extend, Subscribe,
}

interface Decorator {
    type: DecoratorType,
    value: any,
    dispose?: boolean,
}

interface MetaData {
    [propName: string]: Decorator[],
}

interface Disposable {
    dispose(): void,
}

function getMetaData(prototype: Object) {
    let metaData: MetaData = prototype[DECORATORS_KEY];
    if (!prototype.hasOwnProperty(DECORATORS_KEY)) {
        prototype[DECORATORS_KEY] = metaData = extend({}, metaData);
        objectForEach(metaData, (key, decorators) => {
            metaData[key] = [...decorators];
        });
    }
    return metaData;
}

function getDecorators(metaData: MetaData, key: string | symbol) {
    return metaData[key] || (metaData[key] = []);
}

function getSubscriptions(instance: Object): Disposable[] {
    return instance[SUBSCRIPTIONS_KEY] || (instance[SUBSCRIPTIONS_KEY] = []);
}

function applyDecorators(
    instance: Object, key: string | symbol,
    target: ko.Observable<any> | ko.PureComputed<any>
) {
    let metaData: MetaData = instance[DECORATORS_KEY];
    let decorators = metaData && metaData[key];
    if (decorators) {
        decorators.forEach(d => {
            switch (d.type) {
                case DecoratorType.Extend:
                    let extender = d.value as Object;
                    target = target.extend(extender);
                    break;
                case DecoratorType.Subscribe:
                    let callback = d.value as Function;
                    let subscription = target.subscribe(callback.bind(instance));
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

    let original = prototype['dispose'];
    prototype['dispose'] = function dispose() {
        let disposables = this[SUBSCRIPTIONS_KEY] as Disposable[];
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
        get() {
            const observable = applyDecorators(this, key, ko.observable());
            defProp(this, key, { get: observable, set: observable });
            return observable();
        },
        set(value) {
            const observable = applyDecorators(this, key, ko.observable(value));
            defProp(this, key, { get: observable, set: observable });
        },
    });
}

/**
 * Accessor decorator that wraps ES6 getter and setter to hidden ko.pureComputed
 */
export function computed(prototype: Object, key: string | symbol) {
    const { get, set } = getDescriptor(prototype, key);
    if (!set) {
        defProp(prototype, key, {
            get() {
                const computed = applyDecorators(this, key, ko.pureComputed(get, this));
                defProp(this, key, { get: computed });
                return computed();
            }
        });
    } else {
        defProp(prototype, key, {
            get() {
                const computed = applyDecorators(this, key,
                    ko.pureComputed({ read: get, write: set, owner: this })
                );
                defProp(this, key, { get: computed, set: computed });
                return computed();
            },
            set(value) {
                const computed = applyDecorators(this, key,
                    ko.pureComputed({ read: get, write: set, owner: this })
                );
                defProp(this, key, { get: computed, set: computed });
                computed(value);
            },
        });
    }
}

/**
 * 
 * @param autoDispose { boolean } if true then subscription will be disposed when entire ViewModel is disposed
 */
export function observer(autoDispose = true) {
    return function (prototype: Object, key: string | symbol) {
        let original = prototype[key] as Function;
        prototype[key] = function (...args) {
            let computed = ko.computed(() => original.apply(this, args));
            if (autoDispose) {
                getSubscriptions(this).push(computed);
            }
            return computed;
        }
        if (autoDispose) {
            redefineDispose(prototype);
        }
    }
}

/**
 * Subscribe to observable or computed by name or by specifying callback explicitely
 */
export function subscribe(callback: (value: any) => void, autoDispose?: boolean): PropertyDecorator;
export function subscribe(targetOrCallback: string | symbol, autoDispose?: boolean): PropertyDecorator;
export function subscribe(targetOrCallback: string | symbol, autoDispose?: boolean): MethodDecorator;

/**
 * Subscribe to observable or computed by name or by specifying callback explicitely
 * @param targetOrCallback { String | Function } name of callback or callback itself
 * when observable is decorated and name of observable property when callback is decorated
 * @param autoDispose { boolean } if true then subscription will be disposed when entire ViewModel is disposed
 */
export function subscribe(targetOrCallback: string | symbol | Function, autoDispose = true) {
    return function (prototype: Object, key: string | symbol) {
        let { value, get } = getDescriptor(prototype, key);
        let target: string | symbol, callback: Function;
        if (typeof value === "function") {
            if (typeof targetOrCallback === "string" || typeof targetOrCallback === "symbol") {
                target = targetOrCallback;                      // @subscribe("target")
                callback = value;                               // callback(value) {}    
            } else {
                throw new Error("Subscription target should be a key in decorated ViewModel");
            }
        } else if (typeof get === "function") {
            if (typeof targetOrCallback === "function") {
                target = key;                                   // @subscribe(ViewModel.prototype.callback)
                callback = targetOrCallback;                    // @observable target;
            } else if (typeof targetOrCallback === "string" || typeof targetOrCallback === "symbol") {
                target = key;                                   // @subscribe("callback")
                callback = prototype[targetOrCallback];         // @observable target;
            } else {
                throw new Error("Subscription callback should be a function or key in decorated ViewModel");
            }
        }
        getDecorators(getMetaData(prototype), target).push({
            type: DecoratorType.Subscribe,
            value: callback,
            dispose: autoDispose,
        });
        if (autoDispose) {
            redefineDispose(prototype);
        }
    }
}