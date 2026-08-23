import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/.well-known/oauth-authorization-server")({
    server: {
        handlers: {
            GET: ({ request }) => {
                const issuer = new URL(request.url).origin
                return Response.json({
                    issuer: issuer,
                    authorization_endpoint: `${issuer}/api/auth/oauth2/authorize`,
                    token_endpoint: `${issuer}/api/auth/oauth2/token`,
                    response_types_supported: ["code"],
                    grant_types_supported: ["authorization_code"],
                    code_challenge_methods_supported: ["S256"],
                    token_endpoint_auth_methods_supported: ["none"],

                    registration_endpoint: `${issuer}/api/auth/oauth2/register`,
                })
            },
        },
    },
})
