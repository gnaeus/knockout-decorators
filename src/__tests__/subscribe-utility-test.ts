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
import { observable, reactive, observableArray, computed, subscribe } from "../knockout-decorators";

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

    it("should subscribe given callback to decorated @reactive", () => {
        class ViewModel {
            plainField: number;
            
            @reactive object = {
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
            
            @observableArray observableArray = [];

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

    it("should subscribe to decorated @observable with given event", () => {
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

        let givenSubscription = subscribe(() => koObservable(), () => {});
        let koSubscription = koObservable.subscribe(() => {});

        expect(Object.hasOwnProperty.call(givenSubscription, "dispose")).toBeTruthy();

        expect(Object.getPrototypeOf(givenSubscription)).toBe(Object.getPrototypeOf(koSubscription));
    });

    it("should dispose hidden ko.computed with returned subscription", () => {
        let koObservable = ko.observable();

        let sideEffectValue;

        let subscription = subscribe(() => {
            return sideEffectValue = koObservable();
        }, () => {});
        
        koObservable(123);
        subscription.dispose();
        koObservable(456);

        expect(sideEffectValue).toBe(123);
    });
});