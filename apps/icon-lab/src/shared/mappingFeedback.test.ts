import { describe, expect, it } from "vitest";
import {
    createMappingFeedbackFile,
    loadMappingFeedback,
    MappingFeedbackStorageKey,
    saveMappingFeedback,
    type MappingFeedback,
} from "./mappingFeedback";

const feedback: MappingFeedback = {
    concept: "airplane",
    provider: "salesforce",
    currentName: "utility/plane",
    decision: "approve",
    updatedAt: "2026-09-23T00:00:00.000Z",
};

describe("mapping feedback", () => {
    it("persists feedback in the versioned local storage key", () => {
        const values = new Map<string, string>();
        saveMappingFeedback([feedback], {
            setItem: (key, value) => {
                values.set(key, value);
            },
        });

        expect(
            loadMappingFeedback({
                getItem: (key) => values.get(key) ?? null,
            })
        ).toEqual([feedback]);
        expect(values.has(MappingFeedbackStorageKey)).toBe(true);
    });

    it("creates a deterministic export sorted by concept and provider", () => {
        const file = createMappingFeedbackFile(
            [
                { ...feedback, concept: "warning" },
                feedback,
            ],
            "2026-09-23T01:00:00.000Z"
        );

        expect(file.version).toBe(1);
        expect(file.generatedAt).toBe("2026-09-23T01:00:00.000Z");
        expect(file.feedback.map(({ concept }) => concept)).toEqual(["airplane", "warning"]);
    });
});
