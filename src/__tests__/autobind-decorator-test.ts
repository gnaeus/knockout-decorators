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
import { autobind } from "../knockout-decorators";

describe("@autobind decorator", () => {
    it("should lazily create instance props", () => {
        class Test {
            @autobind method() { return this; }
        }

        let instance = new Test();
        let method = instance.method;

        expect(method()).toBe(instance);
    });

    it("should return original method when it accesses through prototype", () => {
        class Test {
            @autobind method() { return this; }
        }

        let instance = new Test();

        expect(instance.method).not.toBe(Test.prototype.method);
        expect(Test.prototype.method()).toBe(Test.prototype);
    });
});