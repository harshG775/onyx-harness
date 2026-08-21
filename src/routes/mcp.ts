import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

import { handleMcpRequest } from '#/utils/mcp-handler'
import {
  VaultError,
  listNotes,
  readNote,
  searchNotes,
  writeNote,
} from '#/utils/vault'

const server = new McpServer({
  name: 'obsidian-vault-server',
  version: '1.0.0',
})

function errorResult(error: unknown) {
  const message =
    error instanceof VaultError ? error.message : 'An unexpected error occurred'
  if (!(error instanceof VaultError)) {
    console.error('vault tool error:', error)
  }
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  }
}

server.registerTool(
  'read_note',
  {
    title: 'Read a note',
    description: 'Read the contents of a markdown note from the vault',
    inputSchema: {
      path: z
        .string()
        .describe('Vault-relative path to the note, e.g. "folder/note.md"'),
    },
  },
  async ({ path }) => {
    try {
      const content = await readNote(path)
      return { content: [{ type: 'text' as const, text: content }] }
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'write_note',
  {
    title: 'Write a note',
    description: 'Create or overwrite a markdown note in the vault',
    inputSchema: {
      path: z
        .string()
        .describe('Vault-relative path to the note, e.g. "folder/note.md"'),
      content: z.string().describe('Full markdown content to write'),
    },
  },
  async ({ path, content }) => {
    try {
      await writeNote(path, content)
      return {
        content: [{ type: 'text' as const, text: `Wrote note: ${path}` }],
      }
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'list_notes',
  {
    title: 'List notes',
    description: 'Recursively list markdown notes in the vault or a subdirectory',
    inputSchema: {
      dir: z
        .string()
        .optional()
        .describe('Vault-relative directory to list, defaults to the vault root'),
    },
  },
  async ({ dir }) => {
    try {
      const notes = await listNotes(dir)
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(notes, null, 2) }],
      }
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'search_notes',
  {
    title: 'Search notes',
    description: 'Search for a substring across all markdown notes in the vault',
    inputSchema: {
      query: z.string().describe('Text to search for'),
    },
  },
  async ({ query }) => {
    try {
      const results = await searchNotes(query)
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(results, null, 2) },
        ],
      }
    } catch (error) {
      return errorResult(error)
    }
  },
)

export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      POST: async ({ request }) => handleMcpRequest(request, server),
    },
  },
})
