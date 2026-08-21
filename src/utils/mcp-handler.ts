import { createHash, timingSafeEqual } from 'node:crypto'

import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

import { isValidAccessToken } from '#/utils/oauth-store'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

/**
 * Checks a token against the static MCP_AUTH_TOKEN secret. Shared with
 * the OAuth authorize form, which gates issuing OAuth access tokens on
 * this same secret.
 */
export function isValidStaticToken(token: string): boolean {
  const expectedToken = process.env.MCP_AUTH_TOKEN
  if (!expectedToken || !token) return false

  // Compare fixed-length hashes rather than the raw tokens so both the
  // content and the length of the provided token stay timing-safe.
  return timingSafeEqual(hashToken(expectedToken), hashToken(token))
}

function isAuthorized(request: Request): boolean {
  const header = request.headers.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return false

  return isValidStaticToken(token) || isValidAccessToken(token)
}

export async function handleMcpRequest(
  request: Request,
  server: McpServer,
): Promise<Response> {
  if (!isAuthorized(request)) {
    const resourceMetadataUrl = new URL(
      '/.well-known/oauth-protected-resource',
      request.url,
    )
    return new Response(null, {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadataUrl.toString()}"`,
      },
    })
  }

  try {
    const jsonRpcRequest = (await request.json()) as JSONRPCMessage

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair()

    let responseData: JSONRPCMessage | null = null

    clientTransport.onmessage = (message: JSONRPCMessage) => {
      responseData = message
    }

    await server.connect(serverTransport)

    await clientTransport.start()
    await serverTransport.start()

    await clientTransport.send(jsonRpcRequest)

    await new Promise((resolve) => setTimeout(resolve, 10))

    await clientTransport.close()
    await serverTransport.close()

    return Response.json(responseData, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('MCP handler error:', error)

    // Return a JSON-RPC error response
    return Response.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: error instanceof Error ? error.message : String(error),
        },
        id: null,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}
