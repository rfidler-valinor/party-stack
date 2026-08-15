import type { OntologyIR } from "@party-stack/ontology";
import type { ResolvedLink } from "./types.js";

function primaryKeyOf(ir: OntologyIR, objectTypeName: string): string {
    const objectType = ir.objectTypes.find((entry) => entry.name === objectTypeName);
    if (!objectType) {
        throw new Error(`Unknown object type "${objectTypeName}".`);
    }
    return objectType.primaryKey;
}

function hasProperty(ir: OntologyIR, objectTypeName: string, propertyName: string): boolean {
    const objectType = ir.objectTypes.find((entry) => entry.name === objectTypeName);
    return objectType?.properties.some((property) => property.name === propertyName) ?? false;
}

function resolveForeignKeySide(
    ir: OntologyIR,
    link: OntologyIR["linkTypes"][number]
): { foreignKeyObjectType: string; foreignKey: string } {
    const onSource = hasProperty(ir, link.source.objectType, link.foreignKey);
    const onTarget = hasProperty(ir, link.target.objectType, link.foreignKey);

    if (onSource && !onTarget) {
        return { foreignKeyObjectType: link.source.objectType, foreignKey: link.foreignKey };
    }
    if (onTarget && !onSource) {
        return { foreignKeyObjectType: link.target.objectType, foreignKey: link.foreignKey };
    }
    if (onSource && onTarget) {
        // Shared names like Issue.projectId + Project.projectId: the true FK is
        // usually the side where the property is *not* that type's primary key.
        const sourcePk = primaryKeyOf(ir, link.source.objectType);
        const targetPk = primaryKeyOf(ir, link.target.objectType);
        if (link.foreignKey !== sourcePk && link.foreignKey === targetPk) {
            return { foreignKeyObjectType: link.source.objectType, foreignKey: link.foreignKey };
        }
        if (link.foreignKey !== targetPk && link.foreignKey === sourcePk) {
            return { foreignKeyObjectType: link.target.objectType, foreignKey: link.foreignKey };
        }
        // Fall back to IR wording ("foreign key on the source").
        return { foreignKeyObjectType: link.source.objectType, foreignKey: link.foreignKey };
    }
    throw new Error(
        `Foreign key "${link.foreignKey}" not found on "${link.source.objectType}" or "${link.target.objectType}".`
    );
}

function buildResolvedLink(opts: {
    ir: OntologyIR;
    link: OntologyIR["linkTypes"][number];
    linkName: string;
    fromObjectType: string;
    toObjectType: string;
    cardinality: ResolvedLink["cardinality"];
}): ResolvedLink {
    const { foreignKey, foreignKeyObjectType } = resolveForeignKeySide(opts.ir, opts.link);
    const fromPrimaryKey = primaryKeyOf(opts.ir, opts.fromObjectType);
    const toPrimaryKey = primaryKeyOf(opts.ir, opts.toObjectType);

    const fromKey =
        foreignKeyObjectType === opts.fromObjectType ? foreignKey : fromPrimaryKey;
    const toKey = foreignKeyObjectType === opts.toObjectType ? foreignKey : toPrimaryKey;

    return {
        linkName: opts.linkName,
        fromObjectType: opts.fromObjectType,
        toObjectType: opts.toObjectType,
        cardinality: opts.cardinality,
        foreignKey,
        foreignKeyObjectType,
        fromKey,
        toKey,
        fromPrimaryKey,
        toPrimaryKey,
        linkTypeId: opts.link.id,
    };
}

/**
 * Resolve a named link navigation from an object type using IR metadata.
 *
 * @example
 * resolveLink(ir, "Issue", "project")  // → Project (one)
 * resolveLink(ir, "Project", "issues") // → Issue (many)
 */
export function resolveLink(
    ir: OntologyIR,
    fromObjectType: string,
    linkName: string
): ResolvedLink {
    for (const link of ir.linkTypes) {
        if (link.source.objectType === fromObjectType && link.target.name === linkName) {
            // Source → target. IR cardinality is "sources per target", so the
            // forward navigation is the inverse (one source/target ⇒ many targets/source).
            return buildResolvedLink({
                ir,
                link,
                linkName,
                fromObjectType,
                toObjectType: link.target.objectType,
                cardinality: link.cardinality === "one" ? "many" : "one",
            });
        }
        if (link.target.objectType === fromObjectType && link.source.name === linkName) {
            // Target → source. Same cardinality as IR ("sources per target").
            return buildResolvedLink({
                ir,
                link,
                linkName,
                fromObjectType,
                toObjectType: link.source.objectType,
                cardinality: link.cardinality,
            });
        }
    }

    throw new Error(`No link "${linkName}" from object type "${fromObjectType}".`);
}

/** All navigable link names from an object type (both directions). */
export function listLinks(ir: OntologyIR, fromObjectType: string): ResolvedLink[] {
    const links: ResolvedLink[] = [];
    for (const link of ir.linkTypes) {
        if (link.source.objectType === fromObjectType) {
            links.push(resolveLink(ir, fromObjectType, link.target.name));
        }
        if (link.target.objectType === fromObjectType) {
            links.push(resolveLink(ir, fromObjectType, link.source.name));
        }
    }
    return links;
}
