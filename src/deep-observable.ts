/**
 * Copyright (c) 2016 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";

const objectForEach = ko.utils.objectForEach;
const defineProperty = Object.defineProperty.bind(Object);
const getPrototypeOf = Object.getPrototypeOf.bind(Object);
const hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
const slice = Function.prototype.call.bind(Array.prototype.slice);

export function defineReactiveProperty(instance: Object, key: string | symbol, value?: any) {
    const observable = ko.observable(prepareReactiveValue(value));
    defineProperty(instance, key, {
        configurable: true,
        enumerable: true,
        get: observable,
        set(value) {
            observable(prepareReactiveValue(value));
        },
    });
    if (value === void 0) {
        return observable();
    }
}

function prepareReactiveValue(value: any) {
    if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
            return new ReactiveArray(value);
        } else if (value.constructor === Object) {
            return prepareReactiveObject(value);
        } else if (hasOwnProperty(value, "constructor")) {
            const prototype = getPrototypeOf(value);
            // if value is plain object
            if (prototype === Object.prototype || prototype === null) {
                return prepareReactiveObject(value);
            }
        }
    }
    return value;
}

const REACTIVE_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators_reactive") : "__ko_decorators_reactive__";

export function prepareReactiveObject(instance: Object) {
    if (!hasOwnProperty(instance, REACTIVE_KEY)) {
        objectForEach(instance, (key, value) => {
            defineReactiveProperty(instance, key, value);
        });
        // mark instance as ObservableObject
        defineProperty(instance, REACTIVE_KEY, {
            configurable: true,
            enumerable: false,
            value: void 0
        });
    }
    return instance;
}

export class ReactiveArray {
    /** @private */
    _observableArray: KnockoutObservableArray<any>;
    
    constructor(value: any[]) {
        for (let i = 0; i < value.length; ++i) {
            value[i] = prepareReactiveValue(value[i]);
        }

        this._defineArrayIndexAccessors(value.length);

        defineProperty(this, "_observableArray", {
            configurable: true,
            enumerable: false,
            value: ko.observableArray(value)
        });
    }

    /** Array.prototype.push() */
    push() {
        const args = slice(arguments);
        for (let i = 0; i < args.length; ++i) {
            args[i] = prepareReactiveValue(args[i]);
        }
        this._defineArrayIndexAccessors(this._observableArray.length + args.length);
        return this._observableArray.push.apply(this._observableArray, args);
    }

    /** Array.prototype.unshift() */
    unshift() {
        const args = slice(arguments);
        for (let i = 0; i < args.length; ++i) {
            args[i] = prepareReactiveValue(args[i]);
        }
        this._defineArrayIndexAccessors(this._observableArray.length + args.length);
        return this._observableArray.unshift.apply(this._observableArray, args);
    }

    /** Array.prototype.splice() */
    splice(start: number, remove: number) {
        const args = slice(arguments);
        for (let i = 2; i < args.length; ++i) {
            args[i] = prepareReactiveValue(args[i]);
        }

        const append = Math.max(args.length - 2, 0);
        const length = this._observableArray.length;
        if (start === void 0) {
            start = length;
        } else if (start < 0) {
            start = Math.max(length - start, 0);
        } else if (start > length) {
            start = length;
        }
        if (remove === void 0) {
            remove = length - start;
        } else if (remove < 0) {
            remove = 0;
        }
        if (start + remove > length) {
            remove = length - start;
        }
        
        this._defineArrayIndexAccessors(length - remove + append);
        return this._observableArray.splice.apply(this._observableArray, args);
    }

    /** ko.observableArray.fn.replace() */
    replace(oldItem: any, newItem: any) {
        return this._observableArray.replace(oldItem, prepareReactiveValue(newItem));
    }

    /** 
     * ko.observable.fn.peek()
     * 
     * Get native array instance. If called from ko.computed() then dependency will not be registered.
     */
    peek() {
        return this._observableArray.peek();
    }

    /**
     * Get native array instance. If called from ko.computed() then dependency will be registered.
     */
    unwrap() {
        return this._observableArray();
    }

    /** Object.prototype.toJSON() */
    toJSON() {
        return this._observableArray();
    }

    /** @private */
    _defineArrayIndexAccessors(length: number) {
        if (ReactiveArray._maxLength < length) {
            for (let i = ReactiveArray._maxLength; i < length; i++) {
                defineProperty(ReactiveArray.prototype, i.toString(), {
                    configurable: true,
                    enumerable: true,
                    get: function () {
                        return this._observableArray()[i];
                    },
                    set: function (value: any) {
                        this._observableArray.splice(i, 1, prepareReactiveValue(value));
                    },
                });
            }
            ReactiveArray._maxLength = length;
        }
    }

    /** @private */
    static _maxLength = 0;
}

defineProperty(ReactiveArray.prototype, "length", {
    configurable: true,
    enumerable: false,
    get(this: ReactiveArray) {
        return this._observableArray().length;
    },
});

[
    "constructor",
    "push",
    "unshift",
    "splice",
    "replace",
    "peek",
    "unwrap",
    "toJSON",
    "_defineArrayIndexAccessors",
].forEach(key => {
    defineProperty(ReactiveArray.prototype, key, {
        configurable: true,
        enumerable: false,
        value: ReactiveArray.prototype[key],
    }); 
});

[
    // Array.prototype[fnName]
	"concat",
    "every",
    "filter",
    "find",
    "findIndex",
    "forEach",
    "includes",
    "indexOf",
    "join",
    "keys",
    "lastIndexOf",
    "map",
    "reduce",
    "reduceRight",
    "slice",
    "some",
    "toLocaleString",
    "toString",
].forEach(fnName => {
    defineProperty(ReactiveArray.prototype, fnName, {
        configurable: true,
        enumerable: false,
        value(this: ReactiveArray) {
            const nativeArray = this._observableArray();
            return nativeArray[fnName].apply(nativeArray, arguments);
        }
    });
});

[
    // Array.prototype[fnName]
    "pop",
    "reverse",
    "shift",
    "sort",
    // ko.observableArray.fn[fnName]
    "remove",
    "removeAll",
    "destroy",
    "destroyAll",
    "subscribe"
].forEach(fnName => {
    defineProperty(ReactiveArray.prototype, fnName, {
        configurable: true,
        enumerable: false,
        value(this: ReactiveArray) {
            const observableArray = this._observableArray as any;
            return observableArray[fnName].apply(observableArray, arguments);
        }
    });
});