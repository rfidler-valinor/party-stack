import { describe, expect, it } from "vitest";
import { convertFoundryMetaActionType } from "./convertMetaActionType.js";
import type { ActionParameterV2, ActionTypeFullMetadata } from "@osdk/foundry.ontologies";

function actionType(parameters: Record<string, ActionParameterV2>): ActionTypeFullMetadata {
    return {
        actionType: {
            apiName: "validated-action",
            displayName: "Validated action",
            status: "EXPERIMENTAL",
            parameters,
            rid: "ri.actions.main.action-type.example",
            operations: [],
        },
        fullLogicRules: [],
    };
}

describe("convertFoundryMetaActionType parameter validation", () => {
    it("maps the Foundry action type RID to the runtime metadata ID", () => {
        expect(convertFoundryMetaActionType(actionType({}))).toMatchObject({
            id: "ri.actions.main.action-type.example",
            name: "validatedAction",
        });
    });

    it("converts closed one-of string validation to an enum constraint", () => {
        const result = convertFoundryMetaActionType(
            actionType({
                status: {
                    displayName: "Status",
                    dataType: { type: "string" },
                    required: true,
                    typeClasses: [],
                    validation: {
                        defaultValidation: {
                            allowedValues: {
                                type: "oneOf",
                                options: [
                                    { displayName: "Open", value: "open" },
                                    { displayName: "Closed", value: "closed" },
                                ],
                                otherValuesAllowed: false,
                            },
                        },
                    },
                },
            })
        );

        expect(result.parameters[0]?.type).toEqual({
            kind: "string",
            value: {
                constraint: {
                    kind: "enum",
                    value: {
                        options: [
                            { value: "open", label: "Open" },
                            { value: "closed", label: "Closed" },
                        ],
                    },
                },
            },
        });
    });

    it("does not constrain one-of validation that permits other values", () => {
        const result = convertFoundryMetaActionType(
            actionType({
                status: {
                    displayName: "Status",
                    dataType: { type: "string" },
                    required: true,
                    typeClasses: [],
                    validation: {
                        defaultValidation: {
                            allowedValues: {
                                type: "oneOf",
                                options: [{ displayName: "Open", value: "open" }],
                                otherValuesAllowed: true,
                            },
                        },
                    },
                },
            })
        );

        expect(result.parameters[0]?.type).toEqual({
            kind: "string",
            value: {},
        });
    });

    it("converts text regex validation to a regex constraint", () => {
        const result = convertFoundryMetaActionType(
            actionType({
                postalCode: {
                    displayName: "Postal code",
                    dataType: { type: "string" },
                    required: false,
                    typeClasses: [],
                    validation: {
                        defaultValidation: {
                            allowedValues: {
                                type: "text",
                                regex: "^\\d{5}$",
                            },
                        },
                    },
                },
            })
        );

        expect(result.parameters[0]?.type).toEqual({
            kind: "optional",
            value: {
                type: {
                    kind: "string",
                    value: {
                        constraint: {
                            kind: "regex",
                            value: { regex: "^\\d{5}$" },
                        },
                    },
                },
            },
        });
    });

    it("references value types so their existing constraints are reused", () => {
        const result = convertFoundryMetaActionType(
            actionType({
                postalCode: {
                    displayName: "Postal code",
                    dataType: { type: "string" },
                    required: true,
                    typeClasses: [],
                    validation: {
                        defaultValidation: {
                            allowedValues: {
                                type: "valueType",
                                apiName: "PostalCode",
                                rid: "ri.ontology.main.value-type.example",
                                versionId: "1",
                            },
                        },
                    },
                },
            })
        );

        expect(result.parameters[0]?.type).toEqual({
            kind: "ref",
            value: { name: "PostalCode" },
        });
    });

    it("maps Foundry current user arguments to the canonical user context", () => {
        const metadata = actionType({});
        metadata.fullLogicRules = [
            {
                type: "createObject",
                objectTypeApiName: "Task",
                propertyArguments: {
                    createdBy: {
                        type: "currentUser",
                    },
                },
                structPropertyArguments: {},
            } as never,
        ];

        expect(
            convertFoundryMetaActionType(
                metadata
            ).logic
        ).toEqual([
            {
                kind: "createObject",
                value: {
                    objectType: "Task",
                    values: [
                        {
                            property: [
                                "createdBy",
                            ],
                            value: {
                                kind: "contextReference",
                                value: {
                                    path: [
                                        "user",
                                    ],
                                },
                            },
                        },
                    ],
                },
            },
        ]);
    });

    it("converts identity-mapped struct-list fields to a whole-list assignment", () => {
        const metadata = actionType({
            objectTypes: {
                displayName: "Object types",
                dataType: {
                    type: "array",
                    subType: {
                        type: "struct",
                        fields: [],
                    },
                },
                required: false,
                typeClasses: [],
            },
        } as never);
        metadata.fullLogicRules = [
            {
                type: "modifyObject",
                objectTypeApiName: "Workspace",
                objectToModify: "workspace",
                propertyArguments: {},
                structPropertyArguments: {
                    objectTypes: {
                        objectTypeRid: {
                            type: "structListParameterFieldValue",
                            parameterId: "objectTypes",
                            structParameterFieldApiName: "objectTypeRid",
                        },
                        displayName: {
                            type: "structListParameterFieldValue",
                            parameterId: "objectTypes",
                            structParameterFieldApiName: "displayName",
                        },
                    },
                },
            } as never,
        ];

        expect(convertFoundryMetaActionType(metadata).logic[0]).toMatchObject({
            kind: "updateObject",
            value: {
                values: [
                    {
                        property: ["objectTypes"],
                        value: {
                            kind: "valueReference",
                            value: { path: ["objectTypes"] },
                        },
                    },
                ],
            },
        });
    });

    it("rejects ambiguous element-wise struct-list mappings", () => {
        const metadata = actionType({});
        metadata.fullLogicRules = [
            {
                type: "createObject",
                objectTypeApiName: "Workspace",
                propertyArguments: {},
                structPropertyArguments: {
                    objectTypes: {
                        objectTypeRid: {
                            type: "structListParameterFieldValue",
                            parameterId: "objectTypes",
                            structParameterFieldApiName: "rid",
                        },
                    },
                },
            } as never,
        ];

        expect(() =>
            convertFoundryMetaActionType(metadata)
        ).toThrow(
            'Unsupported Foundry struct-list field mapping for property "objectTypes".'
        );
    });
});
