import { betterAuth } from "better-auth"
import { jwt } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
// import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp"
// import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { db } from "../db"
import * as schema from "#/lib/db/schema/index"
import { env } from "#/env"

export const MCP_RESOURCE = `${env.SERVER_URL}/mcp`

export const auth = betterAuth({
    baseURL: env.SERVER_URL,
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [
        jwt(),
        mcp({
            loginPage: "/login",
            consentPage: "/consent",
            resource: MCP_RESOURCE,
            allowDynamicClientRegistration: true,
            allowUnauthenticatedClientRegistration: true,
        }),
        // cimd({
        //     fetchClientMetadataResource,
        //     metadataProfile: "mcp-2026-07-28",
        // }),
        tanstackStartCookies(),
    ],
})
