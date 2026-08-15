import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import {
    AutoProcessor,
    AutoTokenizer,
    CLIPTextModelWithProjection,
    CLIPVisionModelWithProjection,
    RawImage,
    env,
} from "@xenova/transformers";
import type {
    CatalogFile,
    EmbeddingRecord,
    EmbeddingsFile,
    MappingAuditFile,
    MappingPairScore,
    IconProvider,
} from "../src/shared/types";
import { averageVectors, cosineSimilarity, l2Normalize } from "../src/shared/math";

env.allowLocalModels = false;
env.useBrowserCache = false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "public", "data");
const iconsDir = path.join(root, "public", "icons");

const MODEL = "Xenova/clip-vit-base-patch32";
const PROVIDERS: IconProvider[] = ["blueprint", "lucide", "material", "salesforce", "sfsymbols"];

async function loadCatalog(): Promise<CatalogFile> {
    return JSON.parse(await readFile(path.join(dataDir, "catalog.json"), "utf8")) as CatalogFile;
}

async function svgToPngFile(svg: string, outPath: string, size = 224): Promise<void> {
    let normalized = svg.trim();
    if (!normalized.includes("xmlns")) {
        normalized = normalized.replace("<svg", `<svg xmlns="http://www.w3.org/2000/svg"`);
    }
    normalized = normalized
        .replace(/\swidth="[^"]*"/g, "")
        .replace(/\sheight="[^"]*"/g, "")
        .replace("<svg", `<svg width="${size}" height="${size}"`);
    if (!/<rect[^>]*fill="#f8fafc"/.test(normalized)) {
        normalized = normalized.replace(
            /<svg([^>]*)>/,
            `<svg$1><rect width="100%" height="100%" fill="#f8fafc"/>`
        );
    }
    const resvg = new Resvg(normalized, {
        fitTo: { mode: "width", value: size },
        background: "white",
    });
    await writeFile(outPath, resvg.render().asPng());
}

function tensorToVector(tensor: { data: Float32Array | number[]; dims: number[] }): number[] {
    return l2Normalize(Array.from(tensor.data as Float32Array));
}

async function main(): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    const tmpDir = path.join(root, ".tmp-embeds");
    await mkdir(tmpDir, { recursive: true });

    const catalog = await loadCatalog();

    console.log(`Loading CLIP model ${MODEL}…`);
    const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
    const textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL);
    const processor = await AutoProcessor.from_pretrained(MODEL);
    const visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL);

    async function embedText(text: string): Promise<number[]> {
        const inputs = tokenizer(text, { padding: true, truncation: true });
        const { text_embeds } = await textModel(inputs);
        return tensorToVector(text_embeds);
    }

    async function embedImagePng(pngPath: string): Promise<number[]> {
        const image = await RawImage.read(pngPath);
        const inputs = await processor(image);
        const { image_embeds } = await visionModel(inputs);
        return tensorToVector(image_embeds);
    }

    const embeddings: EmbeddingRecord[] = [];
    const mappedIcons = catalog.icons.filter((icon) => icon.concept);
    const textOnlyExtras = catalog.icons.filter((icon) => !icon.concept);

    console.log(`Embedding ${mappedIcons.length} mapped icons (image+text when possible)…`);

    let index = 0;
    for (const icon of mappedIcons) {
        index += 1;
        if (index % 25 === 0 || index === mappedIcons.length) {
            console.log(`  mapped ${index}/${mappedIcons.length}`);
        }

        const label = `an icon named ${icon.labels[0]} representing ${icon.concept}`;
        const textVector = await embedText(label);
        let vector = textVector;
        let modality: EmbeddingRecord["modality"] = "text";

        if (icon.hasSvg && icon.svgPath) {
            try {
                const svg = await readFile(path.join(iconsDir, icon.svgPath), "utf8");
                const pngPath = path.join(tmpDir, `${icon.id.replaceAll(":", "__")}.png`);
                await svgToPngFile(svg, pngPath);
                const imageVector = await embedImagePng(pngPath);
                vector = averageVectors([textVector, imageVector]);
                modality = "multimodal";
            } catch (error) {
                console.warn(`  image embed failed for ${icon.id}:`, error);
            }
        }

        embeddings.push({
            id: icon.id,
            vector,
            dims: vector.length,
            modality,
        });
    }

    const EXTRA_LIMIT_PER_PROVIDER = 200;
    const extrasByProvider = new Map<string, typeof textOnlyExtras>();
    for (const icon of textOnlyExtras) {
        const list = extrasByProvider.get(icon.provider) ?? [];
        if (list.length < EXTRA_LIMIT_PER_PROVIDER) {
            list.push(icon);
            extrasByProvider.set(icon.provider, list);
        }
    }
    const extras = [...extrasByProvider.values()].flat();
    console.log(`Embedding ${extras.length} unmapped catalog icons (text only)…`);

    index = 0;
    for (const icon of extras) {
        index += 1;
        if (index % 50 === 0 || index === extras.length) {
            console.log(`  extras ${index}/${extras.length}`);
        }
        const label = `an icon named ${icon.labels.slice(0, 3).join(", ")}`;
        const vector = await embedText(label);
        embeddings.push({
            id: icon.id,
            vector,
            dims: vector.length,
            modality: "text",
        });
    }

    const dims = embeddings[0]?.dims ?? 512;
    const file: EmbeddingsFile = {
        generatedAt: new Date().toISOString(),
        model: MODEL,
        dims,
        embeddings,
    };
    await writeFile(path.join(dataDir, "embeddings.json"), JSON.stringify(file));

    const byId = new Map(embeddings.map((item) => [item.id, item]));
    const pairs: MappingPairScore[] = [];
    const conceptScores: MappingAuditFile["conceptScores"] = [];

    for (const concept of catalog.concepts) {
        const conceptIcons = catalog.icons.filter((icon) => icon.concept === concept && byId.has(icon.id));
        const conceptPairs: MappingPairScore[] = [];
        for (let i = 0; i < conceptIcons.length; i++) {
            for (let j = i + 1; j < conceptIcons.length; j++) {
                const left = conceptIcons[i]!;
                const right = conceptIcons[j]!;
                const leftEmb = byId.get(left.id)!;
                const rightEmb = byId.get(right.id)!;
                const score = cosineSimilarity(leftEmb.vector, rightEmb.vector);
                const pair: MappingPairScore = {
                    concept,
                    left: { provider: left.provider, name: left.name, id: left.id },
                    right: { provider: right.provider, name: right.name, id: right.id },
                    score,
                };
                conceptPairs.push(pair);
                pairs.push(pair);
            }
        }
        if (conceptPairs.length > 0) {
            const scores = conceptPairs.map((pair) => pair.score);
            conceptScores.push({
                concept,
                meanScore: scores.reduce((a, b) => a + b, 0) / scores.length,
                minScore: Math.min(...scores),
                pairCount: scores.length,
            });
        }
    }

    conceptScores.sort((a, b) => a.minScore - b.minScore);
    pairs.sort((a, b) => a.score - b.score);

    const audit: MappingAuditFile = {
        generatedAt: new Date().toISOString(),
        pairs,
        conceptScores,
    };
    await writeFile(path.join(dataDir, "mapping-audit.json"), JSON.stringify(audit, null, 2));

    console.log(`Wrote ${embeddings.length} embeddings (${dims}d)`);
    console.log("Weakest mapped concepts:");
    for (const row of conceptScores.slice(0, 10)) {
        console.log(`  ${row.concept.padEnd(18)} min=${row.minScore.toFixed(3)} mean=${row.meanScore.toFixed(3)}`);
    }

    for (const provider of PROVIDERS) {
        const count = embeddings.filter((item) => item.id.startsWith(`${provider}:`)).length;
        console.log(`  embeddings ${provider}: ${count}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
