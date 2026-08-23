import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto"

/**
 * In-memory OAuth 2.1 state (dynamically registered clients, single-use
 * authorization codes, issued access tokens). This is a POC: state resets
 * on every server restart, so a restart forces clients to re-authorize.
 */

type Client = {
    clientId: string
    redirectUris: Array<string>
    clientName?: string
}

type AuthorizationCode = {
    clientId: string
    redirectUri: string
    codeChallenge: string
    expiresAt: number
}

type AccessToken = {
    clientId: string
    expiresAt: number
}

const clients = new Map<string, Client>()
const authorizationCodes = new Map<string, AuthorizationCode>()
const accessTokens = new Map<string, AccessToken>()

const AUTH_CODE_TTL_MS = 5 * 60 * 1000
const ACCESS_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000

function generateToken(prefix: string): string {
    return `${prefix}_${randomBytes(32).toString("base64url")}`
}

export const oauth2Store = {
    registerClient(input: { redirectUris: Array<string>; clientName?: string }): Client {
        const client: Client = {
            clientId: randomUUID(),
            redirectUris: input.redirectUris,
            clientName: input.clientName,
        }
        clients.set(client.clientId, client)
        return client
    },

    getClient(clientId: string): Client | undefined {
        return clients.get(clientId)
    },

    createAuthorizationCode(input: { clientId: string; redirectUri: string; codeChallenge: string }): string {
        const code = generateToken("code")
        authorizationCodes.set(code, {
            clientId: input.clientId,
            redirectUri: input.redirectUri,
            codeChallenge: input.codeChallenge,
            expiresAt: Date.now() + AUTH_CODE_TTL_MS,
        })
        return code
    },

    /** One-time use: the code is deleted whether or not it was valid. */
    consumeAuthorizationCode(code: string): AuthorizationCode | null {
        const entry = authorizationCodes.get(code)
        authorizationCodes.delete(code)
        if (!entry || entry.expiresAt < Date.now()) return null
        return entry
    },

    verifyCodeVerifier(codeVerifier: string, codeChallenge: string): boolean {
        const computed = Buffer.from(createHash("sha256").update(codeVerifier).digest("base64url"))
        const expected = Buffer.from(codeChallenge)
        if (computed.length !== expected.length) return false
        return timingSafeEqual(computed, expected)
    },

    createAccessToken(clientId: string): {
        accessToken: string
        expiresIn: number
    } {
        const accessToken = generateToken("at")
        accessTokens.set(accessToken, {
            clientId,
            expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
        })
        return { accessToken, expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000) }
    },

    isValidAccessToken(token: string): boolean {
        const entry = accessTokens.get(token)
        if (!entry) return false
        if (entry.expiresAt < Date.now()) {
            accessTokens.delete(token)
            return false
        }
        return true
    },

    /** Checks the vault owner's login credential (MCP_AUTH_TOKEN) presented on the authorize form. */
    isValidStaticToken(token: string): boolean {
        const expected = process.env.MCP_AUTH_TOKEN
        if (!expected) return false
        const provided = Buffer.from(token)
        const target = Buffer.from(expected)
        if (provided.length !== target.length) return false
        return timingSafeEqual(provided, target)
    },
}
