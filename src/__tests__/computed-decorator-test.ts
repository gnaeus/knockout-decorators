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
import { observable, reactive, observableArray, computed } from "../knockout-decorators";

describe("@computed decorator", () => {
    ko.options.deferUpdates = false;

    it("should lazily create properties on instance", () => {
        class Calc {
            @observable number: number = 0;

            @computed get square() {
                return this.number * this.number;
            }
        }
        
        let calc = new Calc();
        let temp = calc.square;

        expect(Object.hasOwnProperty.call(calc, "square")).toBeTruthy();
    });

    it("should throw when trying to redefine @computed without setter", () => {
        class Calc {
            @observable number: number = 0;

            @computed get square() {
                return this.number * this.number;
            }
        }
        
        let calc: any = new Calc();
        // get @computed property
        calc.square;

        // get @computed property
        expect(() => { calc.square = 123; }).toThrow();
    });

    it("should track @observable changes", () => {
        class Calc {
            @observable number: number = 0;

            @computed get square() {
                return this.number * this.number;
            }
        }
        
        let calc = new Calc();
        let result: number;

        // subscribe to .square changes
        ko.computed(() => { result = calc.square; });

        // change observable
        calc.number = 15;

        expect(result).toBe(225);
    });

    it("should track @observableArray changes", () => {
        class Calc {
            @observableArray numbers = [];

            @computed get squares() {
                return this.numbers.map(x => x * x);
            }
        }
        
        let calc = new Calc();
        let result: number[];

        // subscribe to .squares changes
        ko.computed(() => { result = calc.squares; });

        // change observableArray
        calc.numbers.push(7, 8, 9);

        expect(result).toEqual([49, 64, 81]);
    });

    it("should track @reactive (deep observable) changes", () => {
        class Calc {
            @reactive object = {
                number: 0,
            };

            @computed get square() {
                return this.object.number * this.object.number;
            }
        }
        
        let calc = new Calc();
        let result: number;

        // subscribe to .square changes
        ko.computed(() => { result = calc.square; });

        // change observable
        calc.object.number = 15;

        expect(result).toBe(225);
    });

    it("should work with writeable computed", () => {
        class User {
            @observable firstName = "";
            @observable lastName = "";

            @computed
            get name() { return this.firstName + " " + this.lastName; }
            set name(value) { [this.firstName, this.lastName] = value.trim().split(/\s+/g); }
        }

        let user = new User();
        
        let fullName;
        ko.computed(() => { fullName = user.name; });

        user.name = " John Smith ";

        expect(fullName).toBe("John Smith");
        expect(user.firstName).toBe("John");
        expect(user.lastName).toBe("Smith");
        expect(user.name).toBe("John Smith");
    });
});