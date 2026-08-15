import type { LiveOntology, OntologyIR } from "@party-stack/ontology";
import { applyIncludeQuery, nestIncludeRows } from "./applyIncludeQuery.js";
import {
    compileIncludeQuery,
    type IncludeQuerySpec,
    type SelectionNode,
} from "./selection.js";
import type { InitialQueryBuilder } from "@tanstack/db";

export type OntologyQueryBuilderOptions = {
    ir: OntologyIR;
    ontology: LiveOntology;
};

/**
 * Idea B — fluent builder that compiles nested includes into TanStack joins.
 *
 * @example
 * const rows = await ontologyQuery(ontology)
 *   .from("Issue")
 *   .select({
 *     issueId: true,
 *     issueTitle: true,
 *     project: { projectTitle: true, projectColor: true },
 *   })
 *   .buildLive((q) => q); // pass through useLiveQuery's builder
 */
export function ontologyQuery(ontology: LiveOntology): OntologyQueryBuilder {
    return new OntologyQueryBuilder({ ir: ontology.ir, ontology });
}

export class OntologyQueryBuilder {
    #ir: OntologyIR;
    #ontology: LiveOntology;
    #from?: string;
    #select?: SelectionNode;

    constructor(opts: OntologyQueryBuilderOptions) {
        this.#ir = opts.ir;
        this.#ontology = opts.ontology;
    }

    from(objectType: string): this {
        this.#from = objectType;
        return this;
    }

    select(selection: SelectionNode): this {
        this.#select = selection;
        return this;
    }

    /** Compile without executing — useful for tests and fragment stitching. */
    compile() {
        if (!this.#from || !this.#select) {
            throw new Error("ontologyQuery().from().select() are required before compile().");
        }
        return compileIncludeQuery(this.#ir, {
            from: this.#from,
            select: this.#select,
        });
    }

    /**
     * Build a TanStack query inside `useLiveQuery((q) => ...)`.
     * Returns flat joined rows; call {@link nest} after you have the data.
     */
    buildLive(q: InitialQueryBuilder) {
        return applyIncludeQuery(q, this.#ontology, this.compile());
    }

    /** Nest flat live-query rows into the selection tree shape. */
    nest(flatRows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
        return nestIncludeRows(this.compile(), flatRows);
    }
}

/**
 * Idea C — one-shot compile of a nested include spec.
 */
export function includeQuery(
    ontology: LiveOntology,
    spec: IncludeQuerySpec
): {
    compile: () => ReturnType<typeof compileIncludeQuery>;
    buildLive: (q: InitialQueryBuilder) => ReturnType<typeof applyIncludeQuery>;
    nest: (rows: Array<Record<string, unknown>>) => Array<Record<string, unknown>>;
} {
    const compiled = compileIncludeQuery(ontology.ir, spec);
    return {
        compile: () => compiled,
        buildLive: (q) => applyIncludeQuery(q, ontology, compiled),
        nest: (rows) => nestIncludeRows(compiled, rows),
    };
}
