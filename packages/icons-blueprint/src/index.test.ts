import { describe, expect, it } from "vitest";
import { fromBlueprintIconName, getBlueprintIconName, toBlueprintIconName } from "./index.js";

describe("Blueprint icon adapter", () => {
    it("maps universal concepts to typed Blueprint names", () => {
        expect(getBlueprintIconName("airplane")).toBe("airplane");
        expect(getBlueprintIconName("add")).toBe("plus");
    });

    it("keeps explicit provider gaps unsupported", () => {
        expect(getBlueprintIconName("ticket")).toBeUndefined();
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
        expect(icon.name).toBe("alert");
        expect(toBlueprintIconName(icon)).toBe("issue");
    });

    it("does not guess when a provider asset maps to multiple concepts", () => {
        expect(fromBlueprintIconName("notifications").name).toBeUndefined();
    });
});
