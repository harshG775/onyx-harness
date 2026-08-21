import { createFileRoute } from '@tanstack/react-router'

import {
  consumeAuthorizationCode,
  createAccessToken,
  verifyCodeVerifier,
} from '#/utils/oauth-store'

export const Route = createFileRoute('/oauth/token')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const grantType = formData.get('grant_type')

        if (grantType !== 'authorization_code') {
          return Response.json({ error: 'unsupported_grant_type' }, { status: 400 })
        }

        const code = formData.get('code')
        const codeVerifier = formData.get('code_verifier')
        const redirectUri = formData.get('redirect_uri')
        const clientId = formData.get('client_id')

        if (
          typeof code !== 'string' ||
          typeof codeVerifier !== 'string' ||
          typeof redirectUri !== 'string' ||
          typeof clientId !== 'string'
        ) {
          return Response.json({ error: 'invalid_request' }, { status: 400 })
        }

        const entry = consumeAuthorizationCode(code)
        if (
          !entry ||
          entry.clientId !== clientId ||
          entry.redirectUri !== redirectUri ||
          !verifyCodeVerifier(codeVerifier, entry.codeChallenge)
        ) {
          return Response.json({ error: 'invalid_grant' }, { status: 400 })
        }

        const { accessToken, expiresIn } = createAccessToken(entry.clientId)

        return Response.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: expiresIn,
        })
      },
    },
  },
})
