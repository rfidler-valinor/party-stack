import { useMemo, useState } from "react";
import type { CatalogFile, DraftMappingsFile, IconProvider } from "../shared/types";
import { IconTile } from "./IconTile";
import {
    createMappingFeedbackFile,
    loadMappingFeedback,
    mappingFeedbackKey,
    saveMappingFeedback,
    type MappingFeedback,
    type MappingFeedbackDecision,
} from "../shared/mappingFeedback";

const PROVIDER_LABEL: Record<IconProvider, string> = {
    blueprint: "Blueprint / Foundry",
    lucide: "Lucide",
    material: "Material Symbols",
    salesforce: "Salesforce",
    sfsymbols: "SF Symbols",
};

export function DraftMappingBrowser({
    catalog,
    draft,
}: {
    catalog: CatalogFile;
    draft: DraftMappingsFile;
}) {
    const [query, setQuery] = useState("");
    const [show, setShow] = useState<"all" | "existing" | "generated">("all");
    const [selectedConcept, setSelectedConcept] = useState(draft.mappings[0]?.concept ?? "");
    const [feedback, setFeedback] = useState<MappingFeedback[]>(() => loadMappingFeedback());
    const iconById = useMemo(
        () => new Map(catalog.icons.map((icon) => [icon.id, icon])),
        [catalog.icons]
    );
    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return draft.mappings.filter(
            (mapping) =>
                (show === "all" || mapping.status === show) &&
                (!normalized ||
                    mapping.concept.includes(normalized) ||
                    Object.values(mapping.providers).some((provider) =>
                        provider?.name.toLowerCase().includes(normalized)
                    ))
        );
    }, [draft.mappings, query, show]);
    const selected =
        draft.mappings.find((mapping) => mapping.concept === selectedConcept) ?? filtered[0];
    const feedbackByKey = useMemo(
        () =>
            new Map(
                feedback.map((item) => [
                    mappingFeedbackKey(item.concept, item.provider),
                    item,
                ])
            ),
        [feedback]
    );

    function updateFeedback(
        concept: string,
        provider: IconProvider,
        currentName: string,
        update: Partial<Pick<MappingFeedback, "decision" | "replacementName" | "note">>
    ) {
        const key = mappingFeedbackKey(concept, provider);
        const existing = feedbackByKey.get(key);
        const nextItem: MappingFeedback = {
            concept,
            provider,
            currentName,
            decision: update.decision ?? existing?.decision ?? "approve",
            replacementName:
                "replacementName" in update
                    ? update.replacementName
                    : existing?.replacementName,
            note: "note" in update ? update.note : existing?.note,
            updatedAt: new Date().toISOString(),
        };
        const next = [
            ...feedback.filter(
                (item) => mappingFeedbackKey(item.concept, item.provider) !== key
            ),
            nextItem,
        ];
        setFeedback(next);
        saveMappingFeedback(next);
    }

    function exportFeedback() {
        const blob = new Blob([JSON.stringify(createMappingFeedbackFile(feedback), null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "icon-mapping-feedback.json";
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            <aside className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-3 backdrop-blur">
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search 706 Blueprint concepts…"
                    className="w-full rounded-lg border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
                <div className="my-3 flex gap-1">
                    {(["all", "generated", "existing"] as const).map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setShow(value)}
                            className={`rounded-md px-2 py-1 text-[11px] ${
                                show === value
                                    ? "bg-[var(--ink)] text-white"
                                    : "bg-white/70 text-[var(--muted)]"
                            }`}
                        >
                            {value}
                        </button>
                    ))}
                </div>
                <div className="max-h-[68vh] space-y-1 overflow-auto pr-1">
                    {filtered.map((mapping) => (
                        <button
                            key={mapping.blueprintId}
                            type="button"
                            onClick={() => setSelectedConcept(mapping.concept)}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm ${
                                selected?.blueprintId === mapping.blueprintId
                                    ? "bg-[var(--ink)] text-white"
                                    : "hover:bg-white/80"
                            }`}
                        >
                            <span className="truncate font-medium">{mapping.concept}</span>
                            <span
                                className={`ml-2 font-[var(--font-mono)] text-[10px] ${
                                    selected?.blueprintId === mapping.blueprintId
                                        ? "text-white/70"
                                        : mapping.minScore < 0.55
                                          ? "text-[var(--bad)]"
                                          : mapping.minScore < 0.7
                                            ? "text-[var(--warn)]"
                                            : "text-[var(--good)]"
                                }`}
                            >
                                {mapping.minScore.toFixed(2)}
                            </span>
                        </button>
                    ))}
                </div>
            </aside>

            {selected && (
                <section className="space-y-4">
                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 backdrop-blur">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-semibold tracking-tight">
                                        {selected.concept}
                                    </h2>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] tracking-wide uppercase ${
                                            selected.status === "existing"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-amber-100 text-amber-800"
                                        }`}
                                    >
                                        {selected.status}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-[var(--muted)]">
                                    Blueprint-anchored mapping draft. Generated candidates blend CLIP
                                    image/name similarity with lexical overlap.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="font-[var(--font-mono)] text-xs text-[var(--muted)]">
                                    min {selected.minScore.toFixed(3)} · mean{" "}
                                    {selected.meanScore.toFixed(3)}
                                </div>
                                <button
                                    type="button"
                                    disabled={feedback.length === 0}
                                    onClick={exportFeedback}
                                    className="rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Export feedback · {feedback.length}
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            {Object.entries(selected.providers).map(([provider, match]) => {
                                if (!match) {
                                    return null;
                                }
                                const icon = iconById.get(match.id);
                                if (!icon) {
                                    return null;
                                }
                                const providerName = provider as IconProvider;
                                const providerFeedback = feedbackByKey.get(
                                    mappingFeedbackKey(selected.concept, providerName)
                                );
                                const decisions: Array<{
                                    value: MappingFeedbackDecision;
                                    label: string;
                                }> = [
                                    { value: "approve", label: "Approve" },
                                    { value: "reject", label: "Reject" },
                                ];
                                return (
                                    <div
                                        key={provider}
                                        className="rounded-xl border border-[var(--line)] bg-white/70 p-3"
                                    >
                                        <div className="mb-2 text-[11px] tracking-wide text-[var(--muted)] uppercase">
                                            {PROVIDER_LABEL[provider as IconProvider]}
                                        </div>
                                        <IconTile icon={icon} size={56} />
                                        <div className="mt-3 font-[var(--font-mono)] text-xs break-all">
                                            {match.name}
                                        </div>
                                        <div className="mt-1 font-[var(--font-mono)] text-[11px] text-[var(--muted)]">
                                            anchor score {match.score.toFixed(3)}
                                        </div>
                                        {icon.textOnly && (
                                            <div className="mt-1 text-[10px] text-[var(--warn)]">
                                                text-only; provide local licensed SF assets for image
                                                embeddings
                                            </div>
                                        )}
                                        <div className="mt-3 border-t border-[var(--line)] pt-3">
                                            <div className="flex gap-1">
                                                {decisions.map(({ value, label }) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() =>
                                                            updateFeedback(
                                                                selected.concept,
                                                                providerName,
                                                                match.name,
                                                                {
                                                                    decision: value,
                                                                    replacementName:
                                                                        value === "approve"
                                                                            ? undefined
                                                                            : providerFeedback?.replacementName,
                                                                }
                                                            )
                                                        }
                                                        className={`rounded-md px-2 py-1 text-[11px] ${
                                                            providerFeedback?.decision === value
                                                                ? value === "approve"
                                                                    ? "bg-emerald-600 text-white"
                                                                    : "bg-rose-600 text-white"
                                                                : "bg-slate-100 text-slate-600"
                                                        }`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                            <input
                                                aria-label={`Replacement for ${providerName}`}
                                                value={providerFeedback?.replacementName ?? ""}
                                                onChange={(event) =>
                                                    updateFeedback(
                                                        selected.concept,
                                                        providerName,
                                                        match.name,
                                                        {
                                                            decision: "replace",
                                                            replacementName:
                                                                event.target.value || undefined,
                                                        }
                                                    )
                                                }
                                                placeholder="Replacement icon name"
                                                className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-[11px] outline-none focus:border-[var(--accent)]"
                                            />
                                            <input
                                                aria-label={`Note for ${providerName}`}
                                                value={providerFeedback?.note ?? ""}
                                                onChange={(event) =>
                                                    updateFeedback(
                                                        selected.concept,
                                                        providerName,
                                                        match.name,
                                                        { note: event.target.value || undefined }
                                                    )
                                                }
                                                placeholder="Optional note"
                                                className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-[11px] outline-none focus:border-[var(--accent)]"
                                            />
                                            {providerFeedback && (
                                                <div className="mt-2 text-[10px] font-medium tracking-wide text-[var(--muted)] uppercase">
                                                    recorded · {providerFeedback.decision}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 backdrop-blur">
                        <h3 className="text-sm font-semibold tracking-wide uppercase">
                            Full-set coverage
                        </h3>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                            {catalog.providers.map((provider) => {
                                const archive = catalog.archives[provider];
                                return (
                                    <div key={provider} className="rounded-lg bg-white/65 p-3">
                                        <div className="text-xs font-medium">
                                            {PROVIDER_LABEL[provider]}
                                        </div>
                                        <div className="mt-1 font-[var(--font-mono)] text-[11px] text-[var(--muted)]">
                                            {archive?.iconCount.toLocaleString() ?? 0} icons
                                            {archive?.bytes
                                                ? ` · ${(archive.bytes / 1024).toFixed(0)} KiB zip`
                                                : " · names only"}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
