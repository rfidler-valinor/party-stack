import { describe, expect, it } from "vitest";
import { getLucideIconName, getLucideSvg, loadLucideIcon } from "./index.js";

describe("Lucide icon adapter", () => {
    it("maps universal concepts to typed Lucide names", () => {
        expect(getLucideIconName("airplane")).toBe("plane");
        expect(getLucideIconName("ticket")).toBe("ticket");
    });

    it("loads raw icon data and builds SVG without React", async () => {
        const icon = await loadLucideIcon("ticket");
        expect(icon.name).toBe("ticket");

        const svg = await getLucideSvg("ticket");
        expect(svg).toContain("<svg");
        expect(svg).toContain('stroke="currentColor"');
    });
});
