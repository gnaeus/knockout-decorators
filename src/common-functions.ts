import * as ko from "knockout";

export const extendObject = ko.utils.extend;
export const objectForEach = ko.utils.objectForEach;
export const defineProperty = Object.defineProperty.bind(Object);
export const getPrototypeOf = Object.getPrototypeOf.bind(Object);
export const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
export const hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
export const arraySlice = Function.prototype.call.bind(Array.prototype.slice);
