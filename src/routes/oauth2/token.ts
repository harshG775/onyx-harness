import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/oauth2/token")({
    server: {
        handlers: {
            GET: () => {
                return Response.json({ message: "ok" })
            },
        },
    },
})

