import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import type { CatalogFile } from "./types";

const appRoot = path.resolve(import.meta.dirname, "../..");

describe("generated full icon catalog", () => {
    it("contains complete provider sets in compact archives", async () => {
        const catalog = JSON.parse(
            await readFile(path.join(appRoot, "public/data/catalog.json"), "utf8")
        ) as CatalogFile;

        expect(catalog.archives.blueprint?.iconCount).toBeGreaterThanOrEqual(700);
        expect(catalog.archives.lucide?.iconCount).toBeGreaterThanOrEqual(2_000);
        expect(catalog.archives.material?.iconCount).toBeGreaterThanOrEqual(16_000);
        expect(catalog.archives.salesforce?.iconCount).toBeGreaterThanOrEqual(1_700);
        expect(catalog.archives.sfsymbols?.iconCount).toBeGreaterThanOrEqual(9_000);

        for (const provider of ["blueprint", "lucide", "material", "salesforce"] as const) {
            const zip = unzipSync(
                new Uint8Array(
                    await readFile(path.join(appRoot, `public/icon-sets/${provider}.zip`))
                )
            );
            expect(Object.keys(zip)).toHaveLength(catalog.archives[provider]!.iconCount);
        }
    });

    it("includes the Salesforce plane glyph and maps airplane to it", async () => {
        const catalog = JSON.parse(
            await readFile(path.join(appRoot, "public/data/catalog.json"), "utf8")
        ) as CatalogFile;
        const plane = catalog.icons.find((icon) => icon.id === "salesforce:utility/plane");

        expect(plane?.concept).toBe("airplane");
        expect(plane?.asset?.path).toBe("utility/plane.svg");
    });
});
