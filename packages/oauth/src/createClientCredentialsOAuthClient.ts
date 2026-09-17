import type { OAuthSession } from "./types.js";

export interface CreateClientCredentialsOAuthClientOptions {
    clientId: string;
    clientSecret: string;
    tokenEndpoint: string;
    scopes?: readonly string[];
    resolveUserId(
        accessToken: string
    ): string | Promise<string>;
    fetch?: typeof globalThis.fetch;
}

export interface ClientCredentialsOAuthClient {
    getAccessToken(): Promise<string>;
    getSession(): Promise<OAuthSession>;
    refresh(): Promise<OAuthSession>;
    cleanup(): void;
}

interface ClientCredentialsToken {
    accessToken: string;
    expiresAt?: number;
    scope?: string;
    userId: string;
}

export function createClientCredentialsOAuthClient(
    options: CreateClientCredentialsOAuthClientOptions
): ClientCredentialsOAuthClient {
    const fetchImpl =
        options.fetch ??
        globalThis.fetch.bind(globalThis);
    let token:
        | ClientCredentialsToken
        | undefined;
    let tokenRequest:
        | Promise<ClientCredentialsToken>
        | undefined;
    let cleaned = false;

    const requestToken =
        async (): Promise<ClientCredentialsToken> => {
            if (cleaned) {
                throw new Error(
                    "OAuth client has been cleaned up."
                );
            }
            const body = new URLSearchParams({
                grant_type:
                    "client_credentials",
                client_id: options.clientId,
                client_secret:
                    options.clientSecret,
            });
            if (options.scopes?.length) {
                body.set(
                    "scope",
                    options.scopes.join(" ")
                );
            }
            const response = await fetchImpl(
                options.tokenEndpoint,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type":
                            "application/x-www-form-urlencoded",
                    },
                    body,
                }
            );
            const result =
                (await response.json()) as {
                    access_token?: unknown;
                    error?: unknown;
                    error_description?: unknown;
                    expires_in?: unknown;
                    scope?: unknown;
                };
            if (
                !response.ok ||
                typeof result.access_token !==
                    "string"
            ) {
                const message =
                    typeof result.error_description ===
                    "string"
                        ? result.error_description
                        : typeof result.error ===
                              "string"
                          ? result.error
                          : `OAuth client credentials grant failed (${response.status}).`;
                throw new Error(message);
            }
            const userId =
                await options.resolveUserId(
                    result.access_token
                );
            if (
                token &&
                token.userId !== userId
            ) {
                throw new Error(
                    `OAuth client credentials changed user from "${token.userId}" to "${userId}".`
                );
            }
            return {
                accessToken:
                    result.access_token,
                expiresAt:
                    typeof result.expires_in ===
                    "number"
                        ? Date.now() +
                          result.expires_in * 1_000
                        : undefined,
                scope:
                    typeof result.scope ===
                    "string"
                        ? result.scope
                        : undefined,
                userId,
            };
        };

    const refresh =
        async (): Promise<OAuthSession> => {
            tokenRequest ??=
                requestToken().finally(() => {
                    tokenRequest = undefined;
                });
            token = await tokenRequest;
            return token.expiresAt === undefined
                ? { userId: token.userId }
                : {
                      userId: token.userId,
                      expiration: {
                          expiresAt:
                              token.expiresAt,
                          refreshable: true,
                      },
                  };
        };

    return {
        async getAccessToken() {
            if (
                !token ||
                (token.expiresAt !==
                    undefined &&
                    token.expiresAt <=
                        Date.now() + 5_000)
            ) {
                await refresh();
            }
            return token!.accessToken;
        },
        async getSession() {
            if (!token) {
                return refresh();
            }
            return token.expiresAt === undefined
                ? { userId: token.userId }
                : {
                      userId: token.userId,
                      expiration: {
                          expiresAt:
                              token.expiresAt,
                          refreshable: true,
                      },
                  };
        },
        refresh,
        cleanup() {
            cleaned = true;
            token = undefined;
        },
    };
}
