import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { registerClient } from '#/utils/oauth-store'

const registrationSchema = z.object({
  redirect_uris: z.array(z.string()).min(1),
  client_name: z.string().optional(),
})

export const Route = createFileRoute('/oauth/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let json: unknown
        try {
          json = await request.json()
        } catch {
          return Response.json({ error: 'invalid_client_metadata' }, { status: 400 })
        }

        const parsed = registrationSchema.safeParse(json)
        if (!parsed.success) {
          return Response.json(
            { error: 'invalid_client_metadata', error_description: 'redirect_uris is required' },
            { status: 400 },
          )
        }

        const client = registerClient({
          redirectUris: parsed.data.redirect_uris,
          clientName: parsed.data.client_name,
        })

        return Response.json(
          {
            client_id: client.clientId,
            redirect_uris: client.redirectUris,
            client_name: client.clientName,
            token_endpoint_auth_method: 'none',
            grant_types: ['authorization_code'],
            response_types: ['code'],
          },
          { status: 201 },
        )
      },
    },
  },
})
