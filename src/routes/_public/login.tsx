import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { authClient } from "#/lib/auth/auth-client"
import { db } from "#/lib/db"
import { user } from "#/lib/db/schema"

const checkHasUsers = createServerFn({ method: "GET" }).handler(async () => {
    const existing = await db.select({ id: user.id }).from(user).limit(1)
    return { hasUsers: existing.length > 0 }
})

export const Route = createFileRoute("/_public/login")({
    loader: () => checkHasUsers(),
    component: Login,
})

function Login() {
    const { hasUsers } = Route.useLoaderData()
    const navigate = useNavigate()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setIsSubmitting(true)

        const { error: authError } = hasUsers
            ? await authClient.signIn.email({ email, password })
            : await authClient.signUp.email({ name, email, password })

        setIsSubmitting(false)

        if (authError) {
            setError(authError.message ?? "Something went wrong")
            return
        }

        const query = window.location.search
        if (query) {
            window.location.href = `/api/auth/oauth2/authorize${query}`
            return
        }

        navigate({ to: "/" })
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-8">
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
                <h1 className="text-2xl font-bold">
                    {hasUsers ? "Sign in" : "Set up your account"}
                </h1>
                {!hasUsers && (
                    <p className="text-sm text-gray-600">
                        No account exists yet. Create the owner account to get started.
                    </p>
                )}

                {!hasUsers && (
                    <div className="space-y-1">
                        <label htmlFor="name" className="block text-sm font-medium">
                            Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded border border-gray-300 px-3 py-2"
                        />
                    </div>
                )}

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
                    {isSubmitting
                        ? hasUsers
                            ? "Signing in..."
                            : "Creating account..."
                        : hasUsers
                          ? "Sign in"
                          : "Create account"}
                </button>
            </form>
        </div>
    )
}
