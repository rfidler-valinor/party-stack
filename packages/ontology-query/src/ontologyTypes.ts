import type { LiveOntology, OntologyIR } from "@party-stack/ontology";

/**
 * App-generated ontologies are narrower than `OntologyDefinition`'s index
 * signature; accept any live ontology for query helpers in this prototype.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLiveOntology = LiveOntology<any>;

export type { OntologyIR };
