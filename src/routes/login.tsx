import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { authClient } from "#/lib/auth-client"

export const Route = createFileRoute("/login")({ component: Login })

function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setIsSubmitting(true)

        const { error: signInError } = await authClient.signIn.email({
            email,
            password,
        })

        setIsSubmitting(false)

        if (signInError) {
            setError(signInError.message ?? "Failed to sign in")
            return
        }

        navigate({ to: "/" })
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-8">
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
                <h1 className="text-2xl font-bold">Sign in</h1>

                <div className="space-y-1">
                    <label htmlFor="email" className="block text-sm font-medium">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                </div>

                <div className="space-y-1">
                    <label htmlFor="password" className="block text-sm font-medium">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50"
                >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
            </form>
        </div>
    )
}
