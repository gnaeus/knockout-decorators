/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";
import { defineProperty, arraySlice } from "./common-functions";
import { EventProperty } from "./knockout-decorators";

export function defineEventProperty(instance: Object, key: string | symbol) {
    const subscribable = new ko.subscribable<any[]>();

    const event: EventProperty = function () {
        const eventArgs = arraySlice(arguments);
        subscribable.notifySubscribers(eventArgs);
    } as any;

    event.subscribe = function (callback: Function) {
        return subscribable.subscribe(function (eventArgs: any[]) {
            callback.apply(null, eventArgs);
        });
    };

    defineProperty(instance, key, {
        configurable: true,
        value: event,
    });

    return event;
}