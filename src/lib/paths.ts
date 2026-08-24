import { homedir } from "node:os"
import { join } from "node:path"

/** Per-user config/data dir, matching the ~/.claude, ~/.codex, ~/.cline convention. */
export const GLOBAL_CONFIG_DIR = join(homedir(), ".onyx-harness")
