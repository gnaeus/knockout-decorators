Symbol = undefined as any;

import * as ko from "knockout";
import * as common from "../../src/common-functions";
import { autobind, computed } from "../../src/knockout-decorators";

describe("legacy environments", () => {
  describe("common-functions", () => {
    it("should work without Symbol", () => {
      expect(typeof Symbol).toBe("undefined");
      expect(typeof common.PATCHED_KEY).toBe("string");
      expect(typeof common.EXTENDERS_KEY).toBe("string");
      expect(typeof common.SUBSCRIPTIONS_KEY).toBe("string");
    });
  });

  describe("@computed decorator", () => {
    it("should work without property descriptor", () => {
      class ViewModel {
        get property() {
          return 0;
        }
      }
      Object.defineProperty(
        ViewModel.prototype, "property",
        computed(ViewModel.prototype, "property", void 0),
      );

      const vm = new ViewModel();
      // tslint:disable-next-line:no-unused-expression
      vm.property;

      expect(ko.isComputed(Object.getOwnPropertyDescriptor(vm, "property")!.get)).toBeTruthy();
    });
  });

  describe("@autobind decorator", () => {
    ko.extenders["reverse"] = (target: KnockoutObservable<any>) => {
      return ko.pureComputed({
        read: target,
        write: (value: any) => target(value.split("").reverse().join("")),
      });
    };

    it("should work without property descriptor", () => {
      class ViewModel {
        property = "abcdef";

        getProperty() {
          return this.property;
        }
      }
      Object.defineProperty(
        ViewModel.prototype, "getProperty",
        autobind(ViewModel.prototype, "getProperty", void 0),
      );

      const vm = new ViewModel();
      const getProperty = vm.getProperty;

      expect(getProperty()).toBe(vm.property);
    });
  });
});
