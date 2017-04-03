/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import * as ko from "knockout";
import { computed, observable, observableArray } from "../src/knockout-decorators";

describe("@computed decorator", () => {
    it("should throw on properties without getter", () => {
        expect(() => {
            class ViewModel {
                @computed set onlySetter(_: any) {
                    // ...
                }
            }
            // tslint:disable-next-line:no-unused-new
            new ViewModel();
        }).toThrowError("@computed property 'onlySetter' has no getter");
    });

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
        // tslint:disable-next-line:no-unused-expression
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
            @observableArray numbers: number[] = [];

            @computed get squares() {
                return this.numbers.map((x) => x * x);
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

    it("should track deep @observable changes", () => {
        class Calc {
            @observable({ deep: true })
            object = {
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

    it("should define hidden ko.computed", () => {
        class Model {
            @computed({ pure: false })
            get property() {
                return 0;
            }
        }

        let model = new Model();
        // tslint:disable-next-line:no-unused-expression
        model.property;

        let hidden = Object.getOwnPropertyDescriptor(model, "property").get;

        expect(ko.isComputed(hidden)).toBeTruthy();
        expect(ko["isPureComputed"](hidden)).toBeFalsy();
    });

    it("should define hidden ko.pureComputed", () => {
        class Model {
            @computed({ pure: true })
            get property() {
                return 0;
            }
        }

        let model = new Model();
        // tslint:disable-next-line:no-unused-expression
        model.property;

        let hidden = Object.getOwnPropertyDescriptor(model, "property").get;

        expect(ko["isPureComputed"](hidden)).toBeTruthy();
    });

    it("should define hidden ko.pureComputed by default", () => {
        class Model {
            @computed get property() {
                return 0;
            }
        }

        let model = new Model();
        // tslint:disable-next-line:no-unused-expression
        model.property;

        let hidden = Object.getOwnPropertyDescriptor(model, "property").get;

        expect(ko["isPureComputed"](hidden)).toBeTruthy();
    });
});
