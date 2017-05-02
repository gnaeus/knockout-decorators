/**
 * Copyright (c) 2016-2017 Dmitry Panyushkin
 * Available under MIT license
 */
import { autobind } from "../src/knockout-decorators";

describe("@autobind decorator", () => {
    it("should lazily create instance props", () => {
        class Test {
            @autobind method() { return this; }
        }

        const instance = new Test();
        const method = instance.method;

        expect(method()).toBe(instance);
    });

    it("should return original method when it accesses through prototype", () => {
        class Test {
            @autobind method() { return this; }
        }

        const instance = new Test();

        expect(instance.method).not.toBe(Test.prototype.method);
        expect(Test.prototype.method()).toBe(Test.prototype);
    });
});
