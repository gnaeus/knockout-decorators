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
import { component } from "../knockout-decorators";

interface ComponentConfig extends KnockoutComponentTypes.ComponentConfig {
    synchronous?: boolean;
}

/** mock for require() */
function reuqire(path: string) { return path; }

describe("@component decorator", () => {
    it("should register components", () => {
        @component("my-component")
        class MyComponent {}

        expect(ko.components.isRegistered("my-component")).toBeTruthy();
    });

    it("should register synchoronous by default", () => {
        @component("my-component")
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ synchronous }: ComponentConfig) => {
            expect(synchronous).toBe(true);
        });
    });

    it("should register constructor as view model if it has 0 or 1 args", () => {
        @component("my-component")
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ viewModel }) => {
            expect(viewModel).toBe(MyComponent);
        });
    });

    it("should create view model factory if constructor has 2 or 3 args", () => {
        @component("my-component")
        class MyComponent {
            constructor(public params: any, public element: any, public templateNodes: any) {}
        }

        ko.components.defaultLoader.getConfig("my-component", ({ viewModel }) => {
            expect(viewModel).toBeDefined();
            if (viewModel !== void 0) {
                expect(viewModel.constructor).toBe(Object);
            }

            let { createViewModel } = viewModel as any;
            expect(createViewModel instanceof Function).toBeTruthy();

            let vm = createViewModel(1, { element: 2, templateNodes: 3 });
            expect(vm.params).toBe(1);
            expect(vm.element).toBe(2);
            expect(vm.templateNodes).toBe(3);
        });
    });

    it("should extend config options", () => {
        @component("my-component", {
            template: "<div></div>",
            synchronous: false,
        })
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ template, synchronous }: ComponentConfig) => {
            expect(template).toBe("<div></div>");
            expect(synchronous).toBe(false);
        });
    });

    it("should work with (name, template) overload", () => {
        @component("my-component", "<div></div>")
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ template }) => {
            expect(template).toBe("<div></div>");
        });
    });

    it("should work with (name, template, options) overload", () => {
        @component("my-component", { require: "my-template" }, { synchronous: false })
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ template, synchronous }: ComponentConfig) => {
            expect(template).toEqual({ require: "my-template" });
            expect(synchronous).toBe(false);
        });
    });

    it("should work with (name, template, styles) overload", () => {
        @component("my-component", "<div></div>", reuqire("./my-component.css"))
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", ({ template }) => {
            expect(template).toBe("<div></div>");
        });
    });

    it("should work with (name, template, styles, options) overload", () => {
        @component("my-component", "<div></div>", reuqire("./my-component.css"), {
            additionalData: { foo: "bar" },
        })
        class MyComponent {}

        ko.components.defaultLoader.getConfig("my-component", (config) => {
            expect(config.template).toBe("<div></div>");
            expect(config["additionalData"]).toEqual({ foo: "bar" });
        });
    });

    afterEach(() => {
        if (ko.components.isRegistered("my-component")) {
            ko.components.unregister("my-component");
        }
    });
});
