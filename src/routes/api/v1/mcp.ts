import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { createFileRoute } from "@tanstack/react-router"

function createServer() {
    const server = new McpServer({
        name: "onyx-harness",
        version: "1.0.0",
    })

    server.registerTool(
        "health_check",
        {
            title: "Health Check",
            description: "Returns the current health status of the server.",
        },
        async () => ({
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
                },
            ],
        }),
    )

    return server
}

export const Route = createFileRoute("/api/v1/mcp")({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const server = createServer()
                const transport = new WebStandardStreamableHTTPServerTransport({
                    sessionIdGenerator: undefined,
                })
                await server.connect(transport)
                return transport.handleRequest(request)
            },
        },
    },
})
