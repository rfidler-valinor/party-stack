import { describe, expect, it } from "vitest";
import {
    fromBlueprintIconName,
    getBlueprintIconName,
    getBlueprintIconSource,
    toBlueprintIconName,
} from "./index.js";

describe("Blueprint icon adapter", () => {
    it("maps universal concepts to typed Blueprint names and assets", () => {
        expect(getBlueprintIconName("airplane")).toBe("airplane");
        const source = getBlueprintIconSource("ticket");
        expect(source.viewBox).toBe("0 0 20 20");
        expect(source.paths.length).toBeGreaterThan(0);
    });

    it("preserves unknown source names for lossless round trips", () => {
        const icon = fromBlueprintIconName("future-blueprint-icon");
        expect(icon).toEqual({
            meta: {
                blueprint: { name: "future-blueprint-icon" },
            },
        });
        expect(toBlueprintIconName(icon)).toBe("future-blueprint-icon");
    });

    it("maps known source names to universal concepts", () => {
        const icon = fromBlueprintIconName("issue");
        expect(icon.name).toBe("ticket");
        expect(toBlueprintIconName(icon)).toBe("issue");
    });
});
