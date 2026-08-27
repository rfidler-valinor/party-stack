import { describe, expect, it } from "vitest";
import { convertFoundryMetaObjectType } from "./convertMetaObjectType.js";
import type { ObjectTypeFullMetadata, ObjectTypeV2 } from "@osdk/foundry.ontologies";

function objectType(): ObjectTypeV2 {
    return {
        apiName: "Employee",
        displayName: "Employee",
        pluralDisplayName: "Employees",
        status: "ACTIVE",
        description: "An employee",
        primaryKey: "id",
        titleProperty: "fullName",
        icon: { type: "blueprint", name: "person", color: "#2d72d2" },
        properties: {
            id: {
                dataType: { type: "string" },
                rid: "ri.ontology.main.property.employee-id",
                status: { type: "active" },
                typeClasses: [],
            },
            fullName: {
                dataType: { type: "string" },
                rid: "ri.ontology.main.property.employee-name",
                displayName: "Full name",
                status: { type: "active" },
                typeClasses: [],
            },
        },
        rid: "ri.ontology.main.object-type.employee",
    } as unknown as ObjectTypeV2;
}

describe("convertFoundryMetaObjectType", () => {
    it("maps runtime identifiers and the title property", () => {
        const result = convertFoundryMetaObjectType({
            objectType: objectType(),
            linkTypes: [],
            implementsInterfaces: [],
            implementsInterfaces2: {},
            sharedPropertyTypeMapping: {},
        } as ObjectTypeFullMetadata);

        expect(result).toMatchObject({
            id: "ri.ontology.main.object-type.employee",
            name: "Employee",
            primaryKey: "id",
            title: "fullName",
            icon: {
                name: "person",
                meta: {
                    blueprint: {
                        name: "person",
                    },
                },
            },
            color: "#2d72d2",
        });
        expect(result.properties).toEqual([
            expect.objectContaining({
                id: "ri.ontology.main.property.employee-id",
                name: "id",
            }),
            expect.objectContaining({
                id: "ri.ontology.main.property.employee-name",
                name: "fullName",
                displayName: "Full name",
            }),
        ]);
    });

    it("preserves unknown Blueprint icons without inventing a semantic match", () => {
        const source = objectType();
        source.icon = {
            type: "blueprint",
            name: "vendor-only-icon",
            color: "#000000",
        };

        expect(
            convertFoundryMetaObjectType({
                objectType: source,
                linkTypes: [],
                implementsInterfaces: [],
                implementsInterfaces2: {},
                sharedPropertyTypeMapping: {},
            } as ObjectTypeFullMetadata)
        ).toMatchObject({
            icon: {
                meta: {
                    blueprint: {
                        name: "vendor-only-icon",
                    },
                },
            },
            color: "#000000",
        });
    });
});
