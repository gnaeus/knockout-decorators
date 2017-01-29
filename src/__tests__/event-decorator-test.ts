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
import { subscribe } from "../knockout-decorators";

// describe("@event decorator", () => {
//     it("should ", () => {
//         class ViewModel {
            
//         }

//         let vm = new ViewModel();

//         throw new Error("Not Implemented");
//     });
// });