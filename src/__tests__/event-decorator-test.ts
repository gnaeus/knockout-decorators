/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
jest.unmock("knockout");
jest.unmock("../knockout-decorators");
jest.unmock("../observable-array");
jest.unmock("../observable-array-proxy");
jest.unmock("../observable-property");
jest.unmock("../property-extenders");

import * as ko from "knockout";
import { event, autobind, subscribe } from "../knockout-decorators";

describe("@event decorator", () => {
    it("should lazily create properties on instance", () => {
        class Publisher {
            @event myEvent() {}
        }
        
        let publisher = new Publisher();
        
        publisher.myEvent;

        expect(Object.hasOwnProperty.call(publisher, "myEvent")).toBeTruthy();
    });

    it("should handle events without arguments", () => {
        class Publisher {
            @event simpleEvent() {}
        }

        class Subscriber {
            eventHandled = false;

            @autobind
            onSimpleEvent() {
                this.eventHandled = true;
            }
        }

        let publisher = new Publisher();

        let subscriber1 = new Subscriber();
        let subscriber2 = new Subscriber();

        subscribe(publisher.simpleEvent, subscriber1.onSimpleEvent);
        subscribe(publisher.simpleEvent, subscriber2.onSimpleEvent);

        publisher.simpleEvent();

        expect(subscriber1.eventHandled).toBe(true);
        expect(subscriber2.eventHandled).toBe(true);
    });

    it("should handle events with arguments", () => {
        class Publisher {
            @event complexEvent(sender: Publisher, argument: string) {}
        }

        class Subscriber {
            eventHandled = false;

            @autobind
            onComplexEvent(sender: Publisher, argument: string) {
                this.eventHandled = true;
                expect(sender).toBe(publisher);
                expect(argument).toBe("event argument");
            }
        }

        let publisher = new Publisher();

        let subscriber1 = new Subscriber();
        let subscriber2 = new Subscriber();

        subscribe(publisher.complexEvent, subscriber1.onComplexEvent);
        subscribe(publisher.complexEvent, subscriber2.onComplexEvent);

        publisher.complexEvent(publisher, "event argument");

        expect(subscriber1.eventHandled).toBe(true);
        expect(subscriber2.eventHandled).toBe(true);
    });

    it("should make disposable subscriptions", () => {
        class Publisher {
            @event simpleEvent() {}
        }

        class Subscriber {
            eventHandled = false;

            @autobind
            onSimpleEvent() {
                this.eventHandled = true;
            }
        }

        let publisher = new Publisher();

        let subscriber1 = new Subscriber();
        let subscriber2 = new Subscriber();

        let subscription1 = subscribe(publisher.simpleEvent, subscriber1.onSimpleEvent);
        let subscription2 = subscribe(publisher.simpleEvent, subscriber2.onSimpleEvent);
        
        subscription1.dispose();

        publisher.simpleEvent();

        expect(subscriber1.eventHandled).toBe(false);
        expect(subscriber2.eventHandled).toBe(true);
    });

    it("should dispose subscriptions after first run", () => {
        class Publisher {
            @event simpleEvent() {}
        }

        class Subscriber {
            runningCount = 0;

            @autobind
            onSimpleEvent() {
                this.runningCount++;
            }
        }

        let publisher = new Publisher();
        let subscriber = new Subscriber();

        subscribe(publisher.simpleEvent, subscriber.onSimpleEvent, { once: true });

        publisher.simpleEvent();
        publisher.simpleEvent();
        publisher.simpleEvent();

        expect(subscriber.runningCount).toBe(1);
    });

    it("should define event without signature", () => {
        class Publisher {
            @event untypedEvent;
        }

        class Subscriber {
            runningCount = 0;

            @autobind
            onUntypedEvent() {
                this.runningCount++;
            }
        }

        let publisher = new Publisher();
        let subscriber = new Subscriber();

        subscribe(publisher.untypedEvent, subscriber.onUntypedEvent);

        publisher.untypedEvent();
        publisher.untypedEvent(123);
        publisher.untypedEvent("test");

        expect(subscriber.runningCount).toBe(3);
    });

    it("should throw when trying to redefine @event property", () => {
        class Publisher {
            @event untypedEvent;
        }

        let publisher = new Publisher();
        
        expect(() => { publisher.untypedEvent = null; }).toThrow();
    });
});