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

export function defineObservableProperty(instance: Object, key: string | symbol) {
    defineProperty(instance, key, {
        configurable: true,
        get() {
            const observable = ko.observable();
            defineProperty(this, key, {
                configurable: true,
                enumerable: true,
                get: observable,
                set(value: any) {
                    observable(prepareObservableValue(value));
                },
            });
            return observable();
        },
        set(value) {
            const observable = ko.observable();
            defineProperty(this, key, {
                configurable: true,
                enumerable: true,
                get: observable,
                set(value: any) {
                    observable(prepareObservableValue(value));
                },
            });
            this[key] = value;
        },
    });
}

function prepareObservableValue(value: any) {
    if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
            return new ObservableArray(value);
        } else if (value.constructor === Object) {
            return prepareObservableObject(value);
        } else if (hasOwnProperty(value, "constructor")) {
            const prototype = getPrototypeOf(value);
            // if value is plain object
            if (prototype === Object.prototype || prototype === null) {
                return prepareObservableObject(value);
            }
        }
    }
    return value;
}

const REACTIVE_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators_reactive") : "__ko_decorators_reactive__";

export function prepareObservableObject(instance: Object) {
    if (!hasOwnProperty(instance, REACTIVE_KEY)) {
        objectForEach(instance, (key, value) => {
            defineObservableProperty(instance, key);
            instance[key] = value;
        });
        // mark instance as ObservableObject
        instance[REACTIVE_KEY] = void 0;
    }
    return instance;
}

export class ObservableArray {
    _observableArray: KnockoutObservableArray<any>;
    
    constructor(value: any[]) {
        this._defineArrayIndexAccessors(value.length);
        this._observableArray = ko.observableArray(value);
    }

    push() {
        const args = slice(arguments);
        for (let i = 0; i < args.length; ++i) {
            args[i] = prepareObservableValue(args[i]);
        }
        this._defineArrayIndexAccessors(this._observableArray.length + args.length);
        this._observableArray.push.apply(this._observableArray, args);
    }

    unshift() {
        const args = slice(arguments);
        for (let i = 0; i < args.length; ++i) {
            args[i] = prepareObservableValue(args[i]);
        }
        this._defineArrayIndexAccessors(this._observableArray.length + args.length);
        this._observableArray.unshift.apply(this._observableArray, args);
    }

    splice(start: number, remove: number) {
        const args = slice(arguments);
        for (let i = 2; i < args.length; ++i) {
            args[i] = prepareObservableValue(args[i]);
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
        this._observableArray.splice.apply(this._observableArray, args);
    }

    // ko.observableArray.fn
    replace(oldItem: any, newItem: any) {
        this._observableArray.replace(oldItem, prepareObservableValue(newItem));
    }

    toJSON() {
        return this._observableArray();
    }

    _defineArrayIndexAccessors(length: number) {
        if (ObservableArray._maxLength < length) {
            const from = ObservableArray._maxLength;

            for (let i = from; i < length; i++) {
                defineProperty(ObservableArray.prototype, i.toString(), {
                    configurable: true,
                    enumerable: true,
                    get: function () {
                        return this._observableArray()[i];
                    },
                    set: function (value: any) {
                        this._observableArray.splice(i, 1, prepareObservableValue(value));
                    },
                });
            }
            ObservableArray._maxLength = length;
        }
    }

    static _maxLength = 0;
}

defineProperty(ObservableArray.prototype, "length", {
    configurable: true,
    enumerable: false,
    get(this: ObservableArray) {
        return this._observableArray().length;
    },
});

[
    "constructor",
    "push",
    "unshift",
    "splice",
    "replace",
    "toJSON",
    "_defineArrayIndexAccessors",
].forEach(key => {
    defineProperty(ObservableArray.prototype, key, {
        configurable: true,
        enumerable: false,
        value: ObservableArray.prototype[key],
    }); 
});

[
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
    defineProperty(ObservableArray.prototype, fnName, {
        configurable: true,
        enumerable: false,
        value(this: ObservableArray) {
            const nativeArray = this._observableArray();
            nativeArray[fnName].apply(nativeArray, arguments);
        }
    });
});

[
    // redefined Array methods
    "pop",
    "reverse",
    "shift",
    "sort",
    // observableArray methods
    "remove",
    "removeAll",
    "destroy",
    "destroyAll",
    "subscribe"
].forEach(fnName => {
    defineProperty(ObservableArray.prototype, fnName, {
        configurable: true,
        enumerable: false,
        value(this: ObservableArray) {
            const observableArray = this._observableArray as any;
            observableArray[fnName].apply(observableArray, arguments);
        }
    });
});