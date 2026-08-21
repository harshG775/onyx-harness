import { promises as fs } from 'node:fs'
import path from 'node:path'

export class VaultError extends Error {}

const OBSIDIAN_CONFIG_DIR = '.obsidian'

function getVaultRoot(): string {
  const vaultRoot = process.env.OBSIDIAN_VAULT_PATH
  if (!vaultRoot) {
    throw new VaultError('OBSIDIAN_VAULT_PATH is not configured')
  }
  return vaultRoot
}

let realVaultRootPromise: Promise<string> | null = null
function getRealVaultRoot(): Promise<string> {
  if (!realVaultRootPromise) {
    realVaultRootPromise = fs.realpath(getVaultRoot()).catch((error) => {
      realVaultRootPromise = null
      throw new VaultError(
        `Vault root does not exist or is inaccessible: ${(error as Error).message}`,
      )
    })
  }
  return realVaultRootPromise
}

function escapesRoot(relativeToRoot: string): boolean {
  return (
    relativeToRoot === '..' ||
    relativeToRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToRoot)
  )
}

function assertValidRelativePath(relativePath: string): void {
  if (typeof relativePath !== 'string' || relativePath.trim() === '') {
    throw new VaultError('Path must be a non-empty string')
  }
  if (relativePath.includes('\0')) {
    throw new VaultError('Path is invalid')
  }
}

/**
 * Resolves a vault-relative path to a real, symlink-resolved absolute path,
 * rejecting anything that escapes the vault root via `..` segments or
 * symlinks. Works for paths that don't exist yet (e.g. a note being
 * written for the first time) by validating the deepest existing ancestor
 * directory and re-appending the remaining segments literally.
 */
async function resolveSafePath(relativePath: string): Promise<string> {
  assertValidRelativePath(relativePath)

  const vaultRoot = getVaultRoot()
  const realVaultRoot = await getRealVaultRoot()

  const candidate = path.resolve(vaultRoot, relativePath)
  if (escapesRoot(path.relative(vaultRoot, candidate))) {
    throw new VaultError('Path resolves outside the vault root')
  }

  let existingAncestor = candidate
  const remaining: Array<string> = []
  while (true) {
    try {
      await fs.access(existingAncestor)
      break
    } catch {
      const parent = path.dirname(existingAncestor)
      if (parent === existingAncestor) {
        throw new VaultError('Path resolves outside the vault root')
      }
      remaining.unshift(path.basename(existingAncestor))
      existingAncestor = parent
    }
  }

  const realAncestor = await fs.realpath(existingAncestor)
  if (escapesRoot(path.relative(realVaultRoot, realAncestor))) {
    throw new VaultError('Path resolves outside the vault root')
  }

  return path.join(realAncestor, ...remaining)
}

export async function readNote(notePath: string): Promise<string> {
  const resolved = await resolveSafePath(notePath)
  try {
    return await fs.readFile(resolved, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new VaultError(`Note not found: ${notePath}`)
    }
    throw error
  }
}

export async function writeNote(
  notePath: string,
  content: string,
): Promise<{ success: boolean }> {
  if (typeof content !== 'string') {
    throw new VaultError('Content must be a string')
  }
  const resolved = await resolveSafePath(notePath)
  await fs.mkdir(path.dirname(resolved), { recursive: true })
  await fs.writeFile(resolved, content, 'utf8')
  return { success: true }
}

export async function listNotes(dir = '.'): Promise<Array<string>> {
  const realVaultRoot = await getRealVaultRoot()
  const resolved = await resolveSafePath(dir)
  const results: Array<string> = []

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === OBSIDIAN_CONFIG_DIR) continue
      const full = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(path.relative(realVaultRoot, full).split(path.sep).join('/'))
      }
    }
  }

  try {
    const stat = await fs.stat(resolved)
    if (!stat.isDirectory()) {
      throw new VaultError(`Not a directory: ${dir}`)
    }
    await walk(resolved)
  } catch (error) {
    if (error instanceof VaultError) throw error
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new VaultError(`Directory not found: ${dir}`)
    }
    throw error
  }

  return results.sort()
}

export async function searchNotes(
  query: string,
): Promise<Array<{ path: string; snippet: string }>> {
  if (typeof query !== 'string' || query.trim() === '') {
    throw new VaultError('Query must be a non-empty string')
  }

  const lowerQuery = query.toLowerCase()
  const notes = await listNotes()
  const results: Array<{ path: string; snippet: string }> = []

  for (const notePath of notes) {
    const content = await readNote(notePath)
    const idx = content.toLowerCase().indexOf(lowerQuery)
    if (idx === -1) continue

    const start = Math.max(0, idx - 40)
    const end = Math.min(content.length, idx + query.length + 40)
    const snippet =
      (start > 0 ? '…' : '') +
      content.slice(start, end).replace(/\s+/g, ' ').trim() +
      (end < content.length ? '…' : '')

    results.push({ path: notePath, snippet })
  }

  return results
}
