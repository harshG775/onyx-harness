import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { createFileRoute } from "@tanstack/react-router"
import { requireMcpAuth } from "@better-auth/mcp"
import { auth, MCP_RESOURCE } from "#/lib/auth"
import * as z from "zod/v4"

function createServer() {
    const server = new McpServer({
        name: "onyx-harness",
        version: "1.0.0",
    })

    server.registerTool(
        "health_check",
        {
            title: "Health Check",
            inputSchema: z.object(),
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

const handleMcpRequest = requireMcpAuth(
    auth,
    async (request) => {
        const server = createServer()
        const transport = new WebStandardStreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        })
        await server.connect(transport)
        return transport.handleRequest(request)
    },
    { resource: MCP_RESOURCE },
)

export const Route = createFileRoute("/mcp")({
    server: {
        handlers: {
            POST: async ({ request }) => handleMcpRequest(request),
        },
    },
})
    