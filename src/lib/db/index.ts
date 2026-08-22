import { env } from "#/env"
import { drizzle } from "drizzle-orm/node-sqlite"
import { DatabaseSync } from "node:sqlite"
import { relations } from "./relations"

const sqlite = new DatabaseSync(env.DB_FILE_NAME)
export const db = drizzle({ client: sqlite, relations })
