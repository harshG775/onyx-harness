import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

function createServer(): McpServer {
    const server = new McpServer({
        name: "obsidian-vault-server",
        version: "1.0.0",
    })

    server.registerTool(
        "ping",
        {
            title: "Ping",
            description: "Health check tool. Echoes back the provided message.",
            inputSchema: { message: z.string().optional().describe("Message to echo back") },
        },
        ({ message }) => {
            return { content: [{ type: "text", text: message ? `pong: ${message}` : "pong" }] }
        },
    )

    return server
}

export const Route = createFileRoute("/mcp")({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const transport = new WebStandardStreamableHTTPServerTransport({
                    sessionIdGenerator: undefined,
                })
                const server = createServer()
                await server.connect(transport)
                return transport.handleRequest(request)
            },
        },
    },
})
