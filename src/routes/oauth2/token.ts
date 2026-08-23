import { createFileRoute } from "@tanstack/react-router"
import { oauth2Store } from "#/lib/oauth2-store"

export const Route = createFileRoute("/oauth2/token")({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const formData = await request.formData()
                const grantType = formData.get("grant_type")

                if (grantType !== "authorization_code") {
                    return Response.json({ error: "unsupported_grant_type" }, { status: 400 })
                }

                const code = formData.get("code")
                const codeVerifier = formData.get("code_verifier")
                const redirectUri = formData.get("redirect_uri")
                const clientId = formData.get("client_id")

                if (
                    typeof code !== "string" ||
                    typeof codeVerifier !== "string" ||
                    typeof redirectUri !== "string" ||
                    typeof clientId !== "string"
                ) {
                    return Response.json({ error: "invalid_request" }, { status: 400 })
                }

                const entry = oauth2Store.consumeAuthorizationCode(code)
                if (
                    !entry ||
                    entry.clientId !== clientId ||
                    entry.redirectUri !== redirectUri ||
                    !oauth2Store.verifyCodeVerifier(codeVerifier, entry.codeChallenge)
                ) {
                    return Response.json({ error: "invalid_grant" }, { status: 400 })
                }

                const { accessToken, expiresIn } = oauth2Store.createAccessToken(entry.clientId)

                return Response.json({
                    access_token: accessToken,
                    token_type: "Bearer",
                    expires_in: expiresIn,
                })
            },
        },
    },
})
