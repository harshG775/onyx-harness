import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/.well-known/oauth-protected-resource')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin
        return Response.json({
          resource: `${origin}/mcp`,
          authorization_servers: [origin],
        })
      },
    },
  },
})
