import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/v1/.well-known/oauth-protected-resource")({
    server: {
        handlers: {
            GET: ({ request }) => {
                const origin = new URL(request.url).origin
                return Response.json({
                    resource: `${origin}/api/v1/mcp`,
                    authorization_servers: [origin],
                })
            },
        },
    },
})