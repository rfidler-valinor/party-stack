import { describe, expect, it } from "vitest";
import { fromBlueprintIconName } from "./blueprint.js";
import { createExpoSymbolResolver, getExpoSymbol } from "./expo.js";
import { getHeroIconSource } from "./heroicons.js";
import { iconNames, isIconName } from "./index.js";

describe("standard icon catalog", () => {
    it("exposes the complete Heroicons outline vocabulary", () => {
        expect(iconNames.length).toBeGreaterThan(300);
        expect(isIconName("ticket")).toBe(true);
        expect(isIconName("not-an-icon")).toBe(false);
    });

    it("returns framework-independent Heroicons SVG source", () => {
        const source = getHeroIconSource("ticket");

        expect(source?.viewBox).toBe("0 0 24 24");
        expect(source?.body).toContain('stroke="currentColor"');
        expect(source?.svg).toMatch(/^<svg /);
        expect(source?.svg).toContain(source?.body);
    });
});

describe("runtime mappings", () => {
    it("maps Blueprint-specific and shared names", () => {
        expect(fromBlueprintIconName("issue")).toBe("ticket");
        expect(fromBlueprintIconName("folder-open")).toBe("folder-open");
        expect(fromBlueprintIconName("UNKNOWN_VENDOR_ICON")).toBeUndefined();
    });

    it("returns Expo platform symbols without importing Expo or React", () => {
        expect(getExpoSymbol("ticket")).toEqual({
            ios: "ticket",
            android: "confirmation_number",
            web: "confirmation_number",
        });
        expect(getExpoSymbol("academic-cap")).toBeUndefined();
    });

    it("allows applications to override Expo mappings", () => {
        const resolver = createExpoSymbolResolver({
            ticket: { ios: "tag", android: "sell", web: "sell" },
        });

        expect(resolver("ticket")?.ios).toBe("tag");
        expect(resolver("folder")?.ios).toBe("folder");
    });
});
