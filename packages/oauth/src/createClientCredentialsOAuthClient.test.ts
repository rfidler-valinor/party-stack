import { describe, expect, it, vi } from "vitest";
import { createClientCredentialsOAuthClient } from "./createClientCredentialsOAuthClient.js";

describe("createClientCredentialsOAuthClient", () => {
    it("obtains and caches a client credentials token", async () => {
        let requestBody:
            | URLSearchParams
            | undefined;
        const fetch = vi.fn<
            typeof globalThis.fetch
        >(async (input, init) => {
            const request = new Request(
                input,
                init
            );
            requestBody = new URLSearchParams(
                await request.text()
            );
            return Response.json({
                access_token: "access-token",
                expires_in: 3600,
                token_type: "Bearer",
            });
        });
        const client =
            createClientCredentialsOAuthClient({
                clientId: "client",
                clientSecret: "secret",
                tokenEndpoint:
                    "https://auth.example/token",
                scopes: ["api"],
                fetch,
                resolveUserId: () => "user-1",
            });

        await expect(
            client.getAccessToken()
        ).resolves.toBe("access-token");
        await expect(
            client.getAccessToken()
        ).resolves.toBe("access-token");
        await expect(
            client.getSession()
        ).resolves.toMatchObject({
            userId: "user-1",
            expiration: {
                refreshable: true,
            },
        });

        expect(fetch).toHaveBeenCalledOnce();
        expect(
            requestBody?.get("grant_type")
        ).toBe("client_credentials");
        expect(
            requestBody?.get("client_id")
        ).toBe("client");
        expect(
            requestBody?.get("client_secret")
        ).toBe("secret");
        expect(requestBody?.get("scope")).toBe(
            "api"
        );
    });
});
