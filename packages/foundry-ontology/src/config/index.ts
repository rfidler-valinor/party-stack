import { performLocalOAuthFlow } from "@bobbyfidz/local-oauth-flow";
import { invariant } from "@bobbyfidz/panic";
import { createOntologyClient, type OntologyClient } from "@party-stack/foundry-client";
import type { OntologyConfig, OntologyConfigAdapter } from "@party-stack/ontology";
import { createFoundryMetaOntologyBackendAdapter } from "../meta/createFoundryMetaOntologyBackendAdapter.js";
import {
    applyAttachmentConstraintOverrides,
    type FoundryAttachmentConstraintOverride,
} from "./applyAttachmentConstraintOverrides.js";

export type { FoundryAttachmentConstraintOverride } from "./applyAttachmentConstraintOverrides.js";

const DEFAULT_FOUNDRY_SCOPES = ["api:use-ontologies-read", "offline_access"];

export interface FoundryOntologyClientOpts {
    foundryUrl: string;
    foundryOntologyRid: string;
    foundryClientId: string;
    foundryRedirectUrl: string;
    /** Skips the interactive OAuth flow, which browserless environments cannot complete. */
    foundryToken?: string;
}

export interface FoundryOntologyConfigAdapterOpts
    extends Partial<FoundryOntologyClientOpts> {
    attachmentConstraints?: FoundryAttachmentConstraintOverride[];
}

export async function createFoundryOntologyClient(
    config: FoundryOntologyClientOpts
): Promise<OntologyClient> {
    const accessToken =
        config.foundryToken ??
        (
            await performLocalOAuthFlow({
                issuerUrl: `${config.foundryUrl}/multipass/api`,
                authorizationUrl: `${config.foundryUrl}/multipass/api/oauth2/authorize`,
                tokenUrl: `${config.foundryUrl}/multipass/api/oauth2/token`,
                clientId: config.foundryClientId,
                redirectUrl: config.foundryRedirectUrl,
                scopes: DEFAULT_FOUNDRY_SCOPES,
            })
        ).accessToken;

    return createOntologyClient({
        baseUrl: config.foundryUrl,
        ontologyRid: config.foundryOntologyRid,
        tokenProvider: () => Promise.resolve(accessToken),
    });
}

function findEnvValue(key: string): string | undefined {
    return (
        process.env[key] ??
        process.env[`NEXT_PUBLIC_${key}`] ??
        process.env[`VITE_PUBLIC_${key}`] ??
        process.env[`EXPO_PUBLIC_${key}`]
    );
}

function getDefaultEnvValue(key: string): string {
    const value = findEnvValue(key);
    invariant(value);
    return value;
}

export const foundryOntologyConfigAdapter: OntologyConfigAdapter<
    FoundryOntologyConfigAdapterOpts | undefined
> = {
    createAdapter: async (opts) => {
        const foundryToken = opts?.foundryToken ?? findEnvValue("FOUNDRY_TOKEN");
        const client = await createFoundryOntologyClient({
            foundryUrl: opts?.foundryUrl ?? getDefaultEnvValue("FOUNDRY_URL"),
            foundryOntologyRid: opts?.foundryOntologyRid ?? getDefaultEnvValue("FOUNDRY_ONTOLOGY_RID"),
            foundryClientId:
                opts?.foundryClientId ??
                (foundryToken ? "" : getDefaultEnvValue("FOUNDRY_CLIENT_ID")),
            foundryRedirectUrl:
                opts?.foundryRedirectUrl ??
                (foundryToken ? "" : getDefaultEnvValue("FOUNDRY_REDIRECT_URL")),
            foundryToken,
        });
        return createFoundryMetaOntologyBackendAdapter({ client });
    },
    transformOntology: (ontology, opts) =>
        applyAttachmentConstraintOverrides(
            ontology,
            opts?.attachmentConstraints ?? []
        ),
};

export type FoundryOntologyConfig = OntologyConfig<FoundryOntologyConfigAdapterOpts>;
