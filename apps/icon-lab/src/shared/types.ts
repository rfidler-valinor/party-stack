export type IconProvider =
    | "blueprint"
    | "lucide"
    | "material"
    | "salesforce"
    | "sfsymbols";

export interface CatalogIcon {
    id: string;
    provider: IconProvider;
    name: string;
    /** Universal concept this icon is mapped to, if any. */
    concept?: string;
    /** Relative path under /icons, when a rasterizable SVG exists. */
    svgPath?: string;
    /** Inline SVG used when not written to disk as a separate concern. */
    hasSvg: boolean;
    /** True when we only have a name (no redistributable glyph). */
    textOnly?: boolean;
    /** Synonyms / alternate labels used for text embedding. */
    labels: string[];
}

export interface CatalogFile {
    generatedAt: string;
    providers: IconProvider[];
    concepts: string[];
    icons: CatalogIcon[];
}

export interface EmbeddingRecord {
    id: string;
    /** L2-normalized multimodal vector (image+text average when both exist). */
    vector: number[];
    dims: number;
    modality: "multimodal" | "text" | "image";
}

export interface EmbeddingsFile {
    generatedAt: string;
    model: string;
    dims: number;
    embeddings: EmbeddingRecord[];
}

export interface MappingPairScore {
    concept: string;
    left: { provider: IconProvider; name: string; id: string };
    right: { provider: IconProvider; name: string; id: string };
    score: number;
}

export interface MappingAuditFile {
    generatedAt: string;
    pairs: MappingPairScore[];
    conceptScores: Array<{
        concept: string;
        meanScore: number;
        minScore: number;
        pairCount: number;
    }>;
}
