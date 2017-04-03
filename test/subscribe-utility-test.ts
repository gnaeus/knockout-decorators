/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";
import {
    computed, observable, observableArray, ObservableArray, subscribe,
} from "../src/knockout-decorators";

describe("subscribe utility function", () => {
    it("should subscribe given callback to decorated @observable", () => {
        class ViewModel {
            plainField: number;

            @observable observableField: number = 0;

            constructor() {
                subscribe(() => this.observableField, (value) => {
                    this.plainField = value;
                });
            }
        }

        let vm = new ViewModel();
        vm.observableField = 123;

        expect(vm.plainField).toBe(123);
    });

    it("should subscribe given callback to decorated deep @observable", () => {
        class ViewModel {
            plainField: number;

            @observable({ deep: true })
            object = {
                field: 0,
            };

            constructor() {
                subscribe(() => this.object.field, (value) => {
                    this.plainField = value;
                });
            }
        }

        let vm = new ViewModel();
        vm.object.field = 123;

        expect(vm.plainField).toBe(123);
    });

    it("should subscribe given callback to decorated @observableArray", () => {
        class ViewModel {
            plainArray: number[];

            @observableArray observableArray: number[] = [];

            constructor() {
                subscribe(() => this.observableArray, (value) => {
                    this.plainArray = value;
                });
            }
        }

        let vm = new ViewModel();
        vm.observableArray.push(1, 2, 3);

        expect(vm.plainArray).toEqual([1, 2, 3]);
    });

    it("should subscribe given callback to decorated @computed", () => {
        class ViewModel {
            plainField: number;

            @observable observableField: number = 0;

            @computed get computedField() {
                return this.observableField;
            }

            constructor() {
                subscribe(() => this.computedField, (value) => {
                    this.plainField = value;
                });
            }
        }

        let vm = new ViewModel();

        vm.observableField = 123;

        expect(vm.plainField).toBe(123);
    });

    it("should subscribe to decorated @observable with 'beforeChange' event", () => {
        class ViewModel {
            plainField: number;

            @observable observableField: number = 0;

            constructor() {
                subscribe(() => this.observableField, (value) => {
                    this.plainField = value;
                }, { event: "beforeChange" });
            }
        }

        let vm = new ViewModel();
        vm.observableField = 123;
        vm.observableField = 456;

        expect(vm.plainField).toBe(123);
    });

    it("should subscribe to decorated @observableArray with 'arrayChange' event", () => {
        class ViewModel {
            @observableArray array = [1, 2, 3, 4, 3, 2, 1] as ObservableArray<number>;
        }

        let vm = new ViewModel();
        let changes: KnockoutArrayChange<number>[] = [];

        subscribe(() => vm.array, (val) => {
            changes.push(...val);
        }, { event: "arrayChange" });

        vm.array.remove((val) => val % 2 === 0);
        vm.array.splice(2, 0, 5);
        vm.array.replace(5, 7);

        expect(vm.array).toEqual([1, 3, 7, 3, 1]);
        expect(changes).toEqual([
            { status: "deleted", value: 2, index: 1 },
            { status: "deleted", value: 4, index: 3 },
            { status: "deleted", value: 2, index: 5 },
            { status: "added", value: 5, index: 2 },
            { status: "added", value: 7, index: 2 },
            { status: "deleted", value: 5, index: 2 },
        ]);
    });

    it("should throw when trying to subscribe to non-@observableArray with 'arrayChange' event", () => {
        class ViewModel {
            array = [1, 2, 3];
        }

        let vm = new ViewModel();

        expect(() => {
            // tslint:disable-next-line:no-empty
            subscribe(() => vm.array, () => {}, { event: "arrayChange" });
        }).toThrow();
    });

    it("should run subscription to decorated @observable once", () => {
        class ViewModel {
            plainField: number;

            @observable observableField: number = 0;

            constructor() {
                subscribe(() => this.observableField, (value) => {
                    this.plainField = value;
                }, { once: true });
            }
        }

        let vm = new ViewModel();
        vm.observableField = 123;
        vm.observableField = 456;

        expect(vm.plainField).toBe(123);
    });

    it("should subscribe to decorated @observableArray with 'arrayChange' event once", () => {
        class ViewModel {
            @observableArray array = [1, 2, 3, 4, 3, 2, 1] as ObservableArray<number>;
        }

        let vm = new ViewModel();
        let changes: KnockoutArrayChange<number>[] = [];

        subscribe(() => vm.array, (val) => {
            changes.push(...val);
        }, { once: true, event: "arrayChange" });

        vm.array.remove((val) => val % 2 === 0);
        vm.array.splice(2, 0, 5);
        vm.array.replace(5, 7);

        expect(vm.array).toEqual([1, 3, 7, 3, 1]);
        expect(changes).toEqual([
            { status: "deleted", value: 2, index: 1 },
            { status: "deleted", value: 4, index: 3 },
            { status: "deleted", value: 2, index: 5 },
        ]);
    });

    it("should run recursive subscription to decorated @observable once", () => {
        class ViewModel {
            plainField: number;

            @observable observableField: number = 0;

            constructor() {
                subscribe(() => this.observableField, (value) => {
                    this.plainField = value;
                    this.observableField = this.observableField + 1;
                }, { once: true });
            }
        }

        let vm = new ViewModel();
        vm.observableField = 123;
        vm.observableField = 456;

        expect(vm.plainField).toBe(123);
    });

    it("should return subscription to hidden ko.computed", () => {
        let koObservable = ko.observable();

        // tslint:disable-next-line:no-empty
        let givenSubscription = subscribe(() => koObservable(), () => {});
        // tslint:disable-next-line:no-empty
        let koSubscription = koObservable.subscribe(() => {});

        expect(Object.hasOwnProperty.call(givenSubscription, "dispose")).toBeTruthy();

        expect(Object.getPrototypeOf(givenSubscription)).toBe(Object.getPrototypeOf(koSubscription));
    });

    it("should dispose hidden ko.computed with returned subscription", () => {
        let koObservable = ko.observable();

        let sideEffectValue;

        let subscription = subscribe(() => {
            return sideEffectValue = koObservable();
        // tslint:disable-next-line:no-empty
        }, () => {});

        koObservable(123);
        subscription.dispose();
        koObservable(456);

        expect(sideEffectValue).toBe(123);
    });
});
