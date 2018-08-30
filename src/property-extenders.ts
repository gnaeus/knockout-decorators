/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import { EXTENDERS_KEY, extendObject, hasOwnProperty, objectForEach } from "./common-functions";

type Extender = Object | Function;

interface ExtendersDictionary {
  [propName: string]: Extender[];
}

export function applyExtenders(
  instance: Object, key: string | symbol,
  target: KnockoutObservable<any> | KnockoutComputed<any>,
) {
  const dictionary = instance[EXTENDERS_KEY] as ExtendersDictionary;
  const extenders = dictionary && dictionary[key as any];
  if (extenders) {
    extenders.forEach((extender) => {
      const koExtender = extender instanceof Function
        ? extender.call(instance) : extender;

      target = target.extend(koExtender);
    });
  }
  return target;
}

export function defineExtenders(
  prototype: Object, key: string | symbol,
  extendersOrFactory: Object | Function,
) {
  let dictionary = prototype[EXTENDERS_KEY] as ExtendersDictionary;
  // if there is no ExtendersDictionary or ExtendersDictionary lives in base class prototype
  if (!hasOwnProperty(prototype, EXTENDERS_KEY)) {
    // clone ExtendersDictionary from base class prototype or create new ExtendersDictionary
    prototype[EXTENDERS_KEY] = dictionary = extendObject({}, dictionary) as ExtendersDictionary;
    // clone Extenders arrays for each property key
    objectForEach(dictionary, (existingKey, extenders) => {
      dictionary[existingKey] = [...extenders];
    });
  }
  // get existing Extenders array or create new array
  const currentExtenders = dictionary[key as any] || (dictionary[key as any] = []);
  // add new Extenders
  currentExtenders.push(extendersOrFactory);
}
