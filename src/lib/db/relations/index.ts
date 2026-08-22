import * as schema from "#/lib/db/schema"
import { defineRelations } from "drizzle-orm"

export const relations = defineRelations(schema, (r) => ({}))
