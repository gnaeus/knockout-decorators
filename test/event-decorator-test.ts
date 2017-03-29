/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import { autobind, event, EventType, subscribe } from "../src/knockout-decorators";

describe("@event decorator", () => {
    it("should lazily create properties on instance", () => {
        class Publisher {
            @event myEvent: () => void;
        }

        let publisher = new Publisher();

        // tslint:disable-next-line:no-unused-expression
        publisher.myEvent;

        expect(Object.hasOwnProperty.call(publisher, "myEvent")).toBeTruthy();
    });

    it("should handle events without arguments", () => {
        class Publisher {
            @event simpleEvent: () => void;
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
            @event complexEvent: (sender: Publisher, argument: string) => void;
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
            @event simpleEvent: () => void;
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
            @event simpleEvent: () => void;
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

    it("should dispose recursive subscriptions after first run", () => {
        class Publisher {
            @event simpleEvent: () => void;
        }

        class Subscriber {
            runningCount = 0;

            @autobind
            onSimpleEvent() {
                publisher.simpleEvent();
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
            @event untypedEvent: any;
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
            @event untypedEvent: any;
        }

        let publisher = new Publisher();

        expect(() => { publisher.untypedEvent = null; }).toThrow();
    });

    it("should create subscribable events", () => {
        class Publisher {
            @event myEvent: EventType;
        }

        class Subscriber {
            passedArguments: any[] = [];

            @autobind
            onEvent(arg: any) {
                this.passedArguments.push(arg);
            }
        }

        let publisher = new Publisher();
        let subscriber = new Subscriber();

        publisher.myEvent.subscribe(subscriber.onEvent);

        publisher.myEvent();
        publisher.myEvent(123);
        publisher.myEvent("test");

        expect(subscriber.passedArguments).toEqual([void 0, 123, "test"]);
    });
});
