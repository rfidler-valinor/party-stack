import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { iconNames, type IconName } from "@party-stack/icons";
import { blueprintIconNames, getBlueprintIconSource, IconSize } from "@party-stack/icons-blueprint";
import { expoSymbolNames } from "@party-stack/icons-expo";
import { getLucideSvg, lucideIconNames } from "@party-stack/icons-lucide";
import { IconNames as BlueprintAllNames } from "@blueprintjs/icons";
import { lucideDynamicIconImports } from "@lucide/icons/dynamic";
import { icons as materialSymbols } from "@iconify-json/material-symbols";
import { createRequire } from "node:module";
import { salesforceUtilityIconNames } from "./salesforce-map";
import type { CatalogFile, CatalogIcon, IconProvider } from "../src/lib/types";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");
const dataDir = path.join(publicDir, "data");

const salesforcePackageRoot = path.dirname(require.resolve("@salesforce-ux/icons/package.json"));
const salesforceUtilityDir = path.join(
    salesforcePackageRoot,
    "dist/salesforce-lightning-design-system-icons/utility"
);

function humanize(name: string): string {
    return name
        .replaceAll(/[._-]+/g, " ")
        .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase()
        .trim();
}

function materialIconifyName(androidName: string): string | undefined {
    const base = androidName.replaceAll("_", "-");
    const candidates = [base, `${base}-outline`, `${base}-rounded`, `${base}-sharp`];
    for (const candidate of candidates) {
        if (candidate in materialSymbols.icons) {
            return candidate;
        }
    }
    // Fuzzy: first icon that starts with the base name.
    const match = Object.keys(materialSymbols.icons).find(
        (key) => key === base || key.startsWith(`${base}-`) || key.startsWith(`${base}_`)
    );
    return match;
}

function iconifyToSvg(iconName: string): string | undefined {
    const icon = materialSymbols.icons[iconName];
    if (!icon) {
        return undefined;
    }
    const width = icon.width ?? materialSymbols.width ?? 24;
    const height = icon.height ?? materialSymbols.height ?? 24;
    const body = icon.body;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="currentColor">${body}</svg>`;
}

function blueprintPathsToSvg(paths: string[], viewBox: string): string {
    const pathMarkup = paths.map((d) => `<path d="${d}" fill="currentColor"/>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${pathMarkup}</svg>`;
}

async function exists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function writeIconSvg(provider: IconProvider, name: string, svg: string): Promise<string> {
    const dir = path.join(iconsDir, provider);
    await mkdir(dir, { recursive: true });
    const safeName = name.replaceAll(/[^a-zA-Z0-9._-]+/g, "_");
    const rel = `${provider}/${safeName}.svg`;
    await writeFile(path.join(iconsDir, rel), svg, "utf8");
    return rel;
}

async function loadSalesforceUtilityNames(): Promise<string[]> {
    const metadataPath = path.join(salesforcePackageRoot, "dist/utility-icons-metadata.json");
    const raw = JSON.parse(await readFile(metadataPath, "utf8")) as Record<string, { synonyms?: string[] }>;
    return Object.keys(raw).sort();
}

async function main(): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    await mkdir(iconsDir, { recursive: true });

    const icons: CatalogIcon[] = [];
    const seen = new Set<string>();

    const push = (icon: CatalogIcon) => {
        if (seen.has(icon.id)) {
            return;
        }
        seen.add(icon.id);
        icons.push(icon);
    };

    console.log("Extracting mapped universal concepts…");

    for (const concept of iconNames) {
        // Lucide
        {
            const lucideName = lucideIconNames[concept];
            const svg = await getLucideSvg(concept);
            const svgPath = await writeIconSvg("lucide", lucideName, svg);
            push({
                id: `lucide:${lucideName}`,
                provider: "lucide",
                name: lucideName,
                concept,
                svgPath,
                hasSvg: true,
                labels: [humanize(lucideName), humanize(concept), "lucide icon"],
            });
        }

        // Blueprint / Foundry
        {
            const blueprintName = blueprintIconNames[concept];
            const source = getBlueprintIconSource(concept, IconSize.LARGE);
            const svg = blueprintPathsToSvg(source.paths, source.viewBox);
            const svgPath = await writeIconSvg("blueprint", blueprintName, svg);
            push({
                id: `blueprint:${blueprintName}`,
                provider: "blueprint",
                name: blueprintName,
                concept,
                svgPath,
                hasSvg: true,
                labels: [humanize(blueprintName), humanize(concept), "blueprint icon", "foundry icon"],
            });
        }

        // Material Symbols (Android side of expo mapping)
        {
            const androidName = expoSymbolNames[concept].android;
            const iconifyName = materialIconifyName(androidName);
            if (iconifyName) {
                const svg = iconifyToSvg(iconifyName);
                if (svg) {
                    const svgPath = await writeIconSvg("material", androidName, svg);
                    push({
                        id: `material:${androidName}`,
                        provider: "material",
                        name: androidName,
                        concept,
                        svgPath,
                        hasSvg: true,
                        labels: [humanize(androidName), humanize(iconifyName), humanize(concept), "material symbols"],
                    });
                }
            } else {
                push({
                    id: `material:${androidName}`,
                    provider: "material",
                    name: androidName,
                    concept,
                    hasSvg: false,
                    textOnly: true,
                    labels: [humanize(androidName), humanize(concept), "material symbols"],
                });
            }
        }

        // SF Symbols — Apple glyphs are not redistributable; text-only + labels.
        {
            const iosName = expoSymbolNames[concept].ios;
            push({
                id: `sfsymbols:${iosName}`,
                provider: "sfsymbols",
                name: iosName,
                concept,
                hasSvg: false,
                textOnly: true,
                labels: [humanize(iosName), humanize(concept), "sf symbol", "apple symbol"],
            });
        }

        // Salesforce utility (provisional)
        {
            const sfName = salesforceUtilityIconNames[concept as IconName];
            const filePath = path.join(salesforceUtilityDir, `${sfName}.svg`);
            if (await exists(filePath)) {
                const svg = await readFile(filePath, "utf8");
                const svgPath = await writeIconSvg("salesforce", sfName, svg);
                push({
                    id: `salesforce:${sfName}`,
                    provider: "salesforce",
                    name: sfName,
                    concept,
                    svgPath,
                    hasSvg: true,
                    labels: [humanize(sfName), humanize(concept), "salesforce lightning", "slds utility"],
                });
            } else {
                push({
                    id: `salesforce:${sfName}`,
                    provider: "salesforce",
                    name: sfName,
                    concept,
                    hasSvg: false,
                    textOnly: true,
                    labels: [humanize(sfName), humanize(concept), "salesforce lightning"],
                });
            }
        }
    }

    console.log("Indexing broader provider catalogs (names + extras)…");

    // Full Lucide catalog (text for unmapped; skip re-writing mapped SVGs)
    for (const lucideName of Object.keys(lucideDynamicIconImports)) {
        const id = `lucide:${lucideName}`;
        if (seen.has(id)) {
            continue;
        }
        push({
            id,
            provider: "lucide",
            name: lucideName,
            hasSvg: false,
            textOnly: true,
            labels: [humanize(lucideName), "lucide icon"],
        });
    }

    // Full Blueprint catalog
    for (const blueprintName of Object.values(BlueprintAllNames) as string[]) {
        const id = `blueprint:${blueprintName}`;
        if (seen.has(id)) {
            continue;
        }
        push({
            id,
            provider: "blueprint",
            name: blueprintName,
            hasSvg: false,
            textOnly: true,
            labels: [humanize(blueprintName), "blueprint icon", "foundry icon"],
        });
    }

    // Salesforce utility catalog
    const salesforceNames = await loadSalesforceUtilityNames();
    const salesforceSynonyms = JSON.parse(
        await readFile(path.join(salesforcePackageRoot, "dist/utility-icons-metadata.json"), "utf8")
    ) as Record<string, { synonyms?: string[] }>;
    for (const name of salesforceNames) {
        const id = `salesforce:${name}`;
        if (seen.has(id)) {
            continue;
        }
        const synonyms = salesforceSynonyms[name]?.synonyms ?? [];
        push({
            id,
            provider: "salesforce",
            name,
            hasSvg: false,
            textOnly: true,
            labels: [humanize(name), ...synonyms.map(humanize), "salesforce lightning"],
        });
    }

    // Material symbols: include mapped android names already; add a sample of common outline icons for neighbors
    const materialKeys = Object.keys(materialSymbols.icons);
    for (const key of materialKeys) {
        if (!key.endsWith("-outline") && !key.includes("-outline-")) {
            continue;
        }
        const androidish = key.replace(/-outline.*$/, "").replaceAll("-", "_");
        const id = `material:${androidish}`;
        if (seen.has(id)) {
            continue;
        }
        // Cap catalog size for the lab — keep outline set manageable.
        if (icons.filter((icon) => icon.provider === "material").length > 800) {
            break;
        }
        push({
            id,
            provider: "material",
            name: androidish,
            hasSvg: false,
            textOnly: true,
            labels: [humanize(androidish), humanize(key), "material symbols"],
        });
    }

    // SF Symbols: add unique ios names from our mapping only (full Apple catalog isn't redistributable).
    // Already added via concepts.

    const catalog: CatalogFile = {
        generatedAt: new Date().toISOString(),
        providers: ["blueprint", "lucide", "material", "salesforce", "sfsymbols"],
        concepts: [...iconNames],
        icons,
    };

    await writeFile(path.join(dataDir, "catalog.json"), JSON.stringify(catalog, null, 2));

    const byProvider = catalog.providers.map((provider) => ({
        provider,
        total: icons.filter((icon) => icon.provider === provider).length,
        withSvg: icons.filter((icon) => icon.provider === provider && icon.hasSvg).length,
        mapped: icons.filter((icon) => icon.provider === provider && icon.concept).length,
    }));

    console.log("Catalog summary:");
    for (const row of byProvider) {
        console.log(
            `  ${row.provider.padEnd(12)} total=${row.total} svg=${row.withSvg} mapped=${row.mapped}`
        );
    }
    console.log(`Wrote ${icons.length} icons → public/data/catalog.json`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
