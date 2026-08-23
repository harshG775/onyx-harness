import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
    server: {
        handlers: {
            GET: ({ request }) => {
                const issuer = new URL(request.url).origin
                return Response.json({
                    resource: `${issuer}/mcp`,
                    authorization_servers: [issuer],
                })
            },
        },
    },
})
