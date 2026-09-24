import { describe, expect, it } from "vitest";
import { getExpoSymbol } from "./index.js";

describe("Expo icon adapter", () => {
    it("maps universal concepts to typed native symbols only", () => {
        expect(getExpoSymbol("airplane")).toEqual({
            ios: "airplane",
            android: "flight",
        });
        expect(getExpoSymbol("ticket")).toEqual({
            ios: "ticket",
            android: "confirmation_number",
        });
        expect(getExpoSymbol("ticket")).not.toHaveProperty("web");
    });
});
