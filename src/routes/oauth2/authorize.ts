import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { oauth2Store } from "#/lib/oauth2-store"

const AUTHORIZE_FIELDS = [
    "response_type",
    "client_id",
    "redirect_uri",
    "code_challenge",
    "code_challenge_method",
    "state",
] as const

const authorizeQuerySchema = z.object({
    response_type: z.literal("code"),
    client_id: z.string(),
    redirect_uri: z.string(),
    code_challenge: z.string(),
    code_challenge_method: z.literal("S256"),
    state: z.string().optional(),
})

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

function renderForm(params: URLSearchParams, error?: string): Response {
    const hiddenFields = AUTHORIZE_FIELDS.map((key) => {
        const value = params.get(key)
        return value !== null ? `<input type="hidden" name="${key}" value="${escapeHtml(value)}">` : ""
    }).join("\n      ")

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Authorize access</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; }
      input[type="password"] { width: 100%; padding: 0.5rem; font-size: 1rem; box-sizing: border-box; }
      button { margin-top: 1rem; padding: 0.5rem 1rem; font-size: 1rem; }
      .error { color: #b91c1c; margin-top: 0.5rem; }
    </style>
  </head>
  <body>
    <h1>Authorize access to your vault</h1>
    <p>Enter your MCP access token to allow this client to connect.</p>
    <form method="post">
      ${hiddenFields}
      <input type="password" name="token" placeholder="Access token" autofocus required>
      <button type="submit">Authorize</button>
    </form>
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
  </body>
</html>`

    return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    })
}

function extractParams(source: URLSearchParams): Record<string, string> {
    const result: Record<string, string> = {}
    for (const key of AUTHORIZE_FIELDS) {
        const value = source.get(key)
        if (value !== null) result[key] = value
    }
    return result
}

export const Route = createFileRoute("/oauth2/authorize")({
    server: {
        handlers: {
            GET: ({ request }) => {
                const url = new URL(request.url)
                const parsed = authorizeQuerySchema.safeParse(extractParams(url.searchParams))
                if (!parsed.success) {
                    return Response.json({ error: "invalid_request" }, { status: 400 })
                }

                const client = oauth2Store.getClient(parsed.data.client_id)
                if (!client || !client.redirectUris.includes(parsed.data.redirect_uri)) {
                    return Response.json({ error: "invalid_client" }, { status: 400 })
                }

                return renderForm(url.searchParams)
            },
            POST: async ({ request }) => {
                const formData = await request.formData()
                const params = new URLSearchParams()
                for (const key of AUTHORIZE_FIELDS) {
                    const value = formData.get(key)
                    if (typeof value === "string") params.set(key, value)
                }

                const parsed = authorizeQuerySchema.safeParse(extractParams(params))
                if (!parsed.success) {
                    return Response.json({ error: "invalid_request" }, { status: 400 })
                }

                const client = oauth2Store.getClient(parsed.data.client_id)
                if (!client || !client.redirectUris.includes(parsed.data.redirect_uri)) {
                    return Response.json({ error: "invalid_client" }, { status: 400 })
                }

                const token = formData.get("token")
                if (typeof token !== "string" || !oauth2Store.isValidStaticToken(token)) {
                    return renderForm(params, "Invalid access token. Try again.")
                }

                const code = oauth2Store.createAuthorizationCode({
                    clientId: parsed.data.client_id,
                    redirectUri: parsed.data.redirect_uri,
                    codeChallenge: parsed.data.code_challenge,
                })

                const redirectUrl = new URL(parsed.data.redirect_uri)
                redirectUrl.searchParams.set("code", code)
                if (parsed.data.state) redirectUrl.searchParams.set("state", parsed.data.state)

                return Response.redirect(redirectUrl.toString(), 302)
            },
        },
    },
})
