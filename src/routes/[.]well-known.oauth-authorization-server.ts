import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/.well-known/oauth-authorization-server')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin
        return Response.json({
          issuer: origin,
          authorization_endpoint: `${origin}/oauth/authorize`,
          token_endpoint: `${origin}/oauth/token`,
          registration_endpoint: `${origin}/oauth/register`,
          response_types_supported: ['code'],
          grant_types_supported: ['authorization_code'],
          code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['none'],
        })
      },
    },
  },
})
