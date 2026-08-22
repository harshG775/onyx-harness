import { config } from "dotenv"
import { drizzle } from "drizzle-orm/node-sqlite"
import { DatabaseSync } from "node:sqlite"

import { relations } from "./relations"

config({ path: [".env", ".env.local"] })
const sqlite = new DatabaseSync(process.env.DB_FILE_NAME!)
export const db = drizzle({ client: sqlite, relations })
