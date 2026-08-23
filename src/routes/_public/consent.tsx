import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_public/consent")({ component: Consent })

function Consent() {
    const [clientId, setClientId] = useState("Unknown application")
    const [scope, setScope] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        setClientId(params.get("client_id") ?? "Unknown application")
        setScope(params.get("scope") ?? "")
    }, [])

    async function respond(accept: boolean) {
        setIsSubmitting(true)
        setError(null)

        const res = await fetch("/api/auth/oauth2/consent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ accept, oauth_query: window.location.search.slice(1) }),
        })

        const data = await res.json()

        if (!res.ok) {
            setIsSubmitting(false)
            setError(data.message ?? "Something went wrong")
            return
        }

        window.location.href = data.url
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-8">
            <div className="w-full max-w-sm space-y-4">
                <h1 className="text-2xl font-bold">Authorize access</h1>

                <p className="text-sm text-gray-700">
                    <strong>{clientId}</strong> is requesting access to your account.
                </p>

                {scope && (
                    <div className="space-y-1">
                        <p className="text-sm font-medium">This will allow it to:</p>
                        <ul className="list-inside list-disc text-sm text-gray-700">
                            {scope.split(" ").map((s) => (
                                <li key={s}>{s}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-3">
                    <button
                        onClick={() => respond(false)}
                        disabled={isSubmitting}
                        className="flex-1 rounded border border-gray-300 px-3 py-2 disabled:opacity-50"
                    >
                        Deny
                    </button>
                    <button
                        onClick={() => respond(true)}
                        disabled={isSubmitting}
                        className="flex-1 rounded bg-black px-3 py-2 text-white disabled:opacity-50"
                    >
                        Allow
                    </button>
                </div>
            </div>
        </div>
    )
}
