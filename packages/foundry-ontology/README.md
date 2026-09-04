# foundry-ontology

Foundry adapter and metadata conversion for Party Stack LiveOntology.

## Link metadata

- Only FK-backed Foundry links are converted into Party Stack IR.
- Non-FK / object-backed links are omitted (unsupported; no synthetic FK).

## Action metadata

Uses public Foundry APIs (`ActionTypesV2` / `ActionTypesFullMetadata`):

- Action parameter and type conversion
- Full logic-rule conversion
- Synthetic UUID / current-time default parameters from public logic metadata

`structListParameterFieldValue` metadata names source and target fields but does not
include an element-mapping operator. Identity mappings of all listed fields from one
list parameter are converted to whole-list replacement. Renamed, partial, mixed, or
multi-parameter mappings are rejected until the ontology IR has explicit list-element
semantics.

OMS UI edit-prefill metadata is not available from public APIs and is not converted.
