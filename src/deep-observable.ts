/**
 * Copyright (c) 2016 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";

const objectForEach = ko.utils.objectForEach;
const defineProperty = Object.defineProperty.bind(Object);
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
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
    })
}

function prepareObservableValue(value: any) {
    if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
            return new ObservableArray(value);
        } else {
            const prototype = getPrototypeOf(value);
            // if value is plain object
            if (prototype === Object.prototype || prototype === null) {
                return prepareObservableObject(value);
            }
        }
    }
    return value;
}

const OBJECT_KEY = typeof Symbol !== "undefined"
    ? Symbol("ko_decorators_object") : "__ko_decorators_object__";

export function prepareObservableObject(instance: Object) {
    if (!hasOwnProperty(instance, OBJECT_KEY)) {
        objectForEach(instance, (key, value) => {
            defineObservableProperty(instance, key);
            instance[key] = value;
        });
        // mark instance as ObservableObject
        instance[OBJECT_KEY] = void 0;
    }
    return instance;
}

class ObservableArray {
    _observableArray: KnockoutObservableArray<any>;
    
    get length() {
        return this._observableArray().length;
    }

    constructor(value: any[]) {
        this._defineArrayIndexAccessors(value.length);
        this._observableArray = ko.observableArray(value);
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

objectForEach(Array.prototype, (fnName, fnBody) => {
    ObservableArray.prototype[fnName] = function (this: ObservableArray) {
        fnBody.call(this._observableArray(), arguments);
    }
});

objectForEach(ko.observableArray.fn, (fnName, fnBody) => {
    ObservableArray.prototype[fnName] = function (this: ObservableArray) {
        fnBody.call(this._observableArray, arguments);
    }
});

ObservableArray.prototype["push"] = function (this: ObservableArray) {
    this._defineArrayIndexAccessors(this._observableArray.length + arguments.length);
    this._observableArray.push.apply(this._observableArray, arguments);
};

ObservableArray.prototype["unshift"] = function (this: ObservableArray) {
     this._defineArrayIndexAccessors(this._observableArray.length + arguments.length);
     this._observableArray.unshift.apply(this._observableArray, arguments);
};

ObservableArray.prototype["splice"] = function (this: ObservableArray, start: number, remove: number) {
    const length = this._observableArray.length;
    const append = Math.max(arguments.length - 2, 0);
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
    this._observableArray.splice.apply(this._observableArray, arguments);
};
