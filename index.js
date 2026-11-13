/**
 * Host half of `dsh-workspace-search`.
 *
 * Serves bounded JSON APIs for a Codex-style workspace explorer: directory and
 * file-name discovery, safe file previews, full-text search, and search across
 * the Harness sessions that belong to the current working directory. Full-text
 * search prefers ripgrep and falls back to a bounded JavaScript walk.
 *
 * The directory comes from the calling session's recorded working directory.
 * An optional root may narrow that directory but can never escape it. Nothing
 * is written.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { open, readdir, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'

export const ROUTE_PATH = '/workspace-search.json'
export const FILES_ROUTE_PATH = '/workspace-files.json'
export const CHATS_ROUTE_PATH = '/workspace-chats.json'

const DEFAULTS = {
  /** Files read in one fallback walk. */
  maxFiles: 12000,
  /** Matching lines returned for the whole search. */
  maxMatches: 400,
  /** Matching lines returned per file. */
  maxMatchesPerFile: 50,
  /** Files larger than this are skipped. */
  maxFileBytes: 1_500_000,
  /** Wall-clock budget for one search. */
  budgetMs: 20000,
  /** Files returned by one file-name search. */
  maxFileResults: 500,
  /** Entries returned by one directory listing. */
  maxDirectoryEntries: 2000,
  /** Bytes returned by the built-in file preview. */
  maxPreviewBytes: 4_000_000,
  /** Chat results returned by unified search. */
  maxChatResults: 50,
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', '.venv', 'venv', '__pycache__',
  'dist', 'build', 'out', 'target', '.next', '.nuxt', '.cache', '.idea',
  '.vscode', 'coverage', 'vendor',
])

const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp',
  '.zip', '.gz', '.7z', '.rar', '.xz', '.zst', '.tgz',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.class', '.jar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.mp3', '.mp4', '.mov', '.wav', '.ttf', '.otf', '.woff', '.woff2',
])

/**
 * Directories ripgrep must not walk: dependency trees, repositories, and the
 * generated artifacts of common toolchains (Unity, .NET, Python, JS bundlers).
 */
const IGNORE_GLOBS = [
  '!**/node_modules/**',
  '!**/.git/**',
  '!**/.svn/**',
  '!**/.hg/**',
  '!**/.venv/**',
  '!**/venv/**',
  '!**/__pycache__/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/out/**',
  '!**/target/**',
  '!**/.next/**',
  '!**/.nuxt/**',
  '!**/.cache/**',
  '!**/coverage/**',
  '!**/vendor/**',
  '!**/Library/**',
  '!**/Temp/**',
  '!**/Logs/**',
  '!**/obj/**',
  '!**/.vs/**',
]

export function apply(ctx, config) {
  const options = normalizeOptions(config)

  ctx.inject(['webServer', 'sessionQuery'], (scoped) => {
    scoped.effect(() => {
      const disposeSearch = scoped.webServer.register({
        kind: 'exact',
        path: ROUTE_PATH,
        resource: async (request) => {
          let body
          try {
            body = await handle(scoped.sessionQuery, request, options)
          } catch (error) {
            body = { ok: false, error: { code: 'search-failed', message: errorMessage(error) } }
          }
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
              'x-content-type-options': 'nosniff',
            },
          })
        },
      })
      const disposeFiles = scoped.webServer.register({
        kind: 'exact',
        path: FILES_ROUTE_PATH,
        resource: async (request) => {
          let body
          try {
            body = await handleFiles(scoped.sessionQuery, request, options)
          } catch (error) {
            body = { ok: false, error: { code: 'files-failed', message: errorMessage(error) } }
          }
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
              'x-content-type-options': 'nosniff',
            },
          })
        },
      })
      const disposeChats = scoped.webServer.register({
        kind: 'exact',
        path: CHATS_ROUTE_PATH,
        resource: async (request) => {
          let body
          try {
            body = await handleChats(scoped.sessionQuery, request, options)
          } catch (error) {
            body = { ok: false, error: { code: 'chats-failed', message: errorMessage(error) } }
          }
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
              'x-content-type-options': 'nosniff',
            },
          })
        },
      })
      return () => {
        if (typeof disposeChats === 'function') disposeChats()
        if (typeof disposeFiles === 'function') disposeFiles()
        if (typeof disposeSearch === 'function') disposeSearch()
      }
    })
  })
}

/* ------------------------------------------------------------------ request */

/**
 * Repeated keystrokes re-issue the same query (the panel debounces at 250 ms,
 * a backspace returns to the previous text). A very short-lived cache keeps
 * those repeats off the disk without ever serving a stale tree for long.
 */
const QUERY_CACHE = new Map()
const CACHE_TTL_MS = 8000
const CACHE_MAX_ENTRIES = 64

function readCache(key) {
  const hit = QUERY_CACHE.get(key)
  if (hit === undefined) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    QUERY_CACHE.delete(key)
    return null
  }
  QUERY_CACHE.delete(key)
  QUERY_CACHE.set(key, hit)
  return hit.result
}

function writeCache(key, result) {
  QUERY_CACHE.set(key, { at: Date.now(), result })
  while (QUERY_CACHE.size > CACHE_MAX_ENTRIES) {
    const oldest = QUERY_CACHE.keys().next()
    if (oldest.done === true) break
    QUERY_CACHE.delete(oldest.value)
  }
}

async function handle(query, request, options) {
  const url = new URL(request.url)
  const text = (url.searchParams.get('q') || '').trim()
  if (text === '') return { ok: true, empty: true, query: '', files: [], total: 0, scanned: 0 }

  const flags = {
    caseSensitive: url.searchParams.get('case') === '1',
    wholeWord: url.searchParams.get('word') === '1',
    useRegex: url.searchParams.get('regex') === '1',
    types: url.searchParams.get('types') || '',
  }
  flags.typeFilter = createTypeFilter(flags.types)

  if (!flags.useRegex) {
    try {
      new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    } catch {
      return { ok: false, error: { code: 'invalid-pattern', message: 'The search text is not valid.' } }
    }
  } else {
    try {
      new RegExp(text)
    } catch {
      return { ok: false, error: { code: 'invalid-pattern', message: 'The regular expression is not valid.' } }
    }
  }

  const root = await resolveRoot(query, url.searchParams.get('root'), url.searchParams.get('session'))
  if (root === null) {
    return { ok: false, error: { code: 'root-missing', message: 'No working directory could be resolved for this session.' } }
  }

  const started = Date.now()
  const cacheKey = [
    root,
    flags.caseSensitive ? '1' : '0',
    flags.wholeWord ? '1' : '0',
    flags.useRegex ? '1' : '0',
    flags.types.toLowerCase(),
    text,
  ].join('\u0000')

  const cached = readCache(cacheKey)
  if (cached !== null) {
    return { ok: true, root, query: text, elapsedMs: 0, cached: true, ...cached }
  }

  const rg = await searchWithRipgrep(root, text, flags, options, started)
  const result = rg !== null ? rg : await searchWithWalker(root, text, flags, options, started)
  if (result.truncated !== true) writeCache(cacheKey, result)
  return { ok: true, root, query: text, elapsedMs: Date.now() - started, cached: false, ...result }
}

async function resolveRoot(query, explicit, sessionId) {
  const wanted = sessionId === null ? null : normalizeId(sessionId)

  try {
    const records = await query.listSessions()
    let fallback = null
    let sessionRoot = null
    const knownRoots = []
    for (const record of records) {
      const header = (record && record.header) || {}
      const cwd = typeof header.cwd === 'string' ? header.cwd : ''
      if (cwd === '') continue
      knownRoots.push(resolve(cwd))
      if (wanted !== null && normalizeId(header.id) === wanted) sessionRoot = cwd
      if (fallback === null) fallback = cwd
    }
    // A caller that named a session must never silently search another one.
    const base = wanted !== null ? sessionRoot : fallback
    if (base === null) return null
    if (typeof explicit !== 'string' || explicit === '') return base

    const explicitPath = resolve(explicit)
    const explicitKey = process.platform === 'win32' ? explicitPath.toLocaleLowerCase() : explicitPath
    const known = knownRoots.some((root) => (process.platform === 'win32' ? root.toLocaleLowerCase() : root) === explicitKey)
    if (known) {
      try {
        const info = await stat(explicitPath)
        if (info.isDirectory()) return explicitPath
      } catch { /* fall back to the current session root */ }
    }

    const scoped = safeWorkspacePath(base, explicit)
    if (scoped === null) return base
    try {
      const info = await stat(scoped.full)
      return info.isDirectory() ? scoped.full : base
    } catch {
      return base
    }
  } catch {
    return null
  }
}

/* --------------------------------------------------------------- files */

async function handleFiles(query, request, options) {
  const url = new URL(request.url)
  if (url.searchParams.get('action') === 'roots') return await listWorkspaceRoots(query)
  const root = await resolveRoot(query, url.searchParams.get('root'), url.searchParams.get('session'))
  if (root === null) {
    return { ok: false, error: { code: 'root-missing', message: 'No working directory could be resolved for this session.' } }
  }

  const requestedAction = url.searchParams.get('action')
  const action = requestedAction === 'search' || requestedAction === 'read' || requestedAction === 'recent' ? requestedAction : 'list'
  if (action === 'search') return await searchFileNames(root, url, options)
  if (action === 'recent') return await listRecentFiles(root, url, options)
  if (action === 'read') return await readPreviewFile(root, url.searchParams.get('path') || '', options)
  return await listDirectory(root, url.searchParams.get('dir') || '', options)
}

async function listWorkspaceRoots(query) {
  const records = await query.listSessions()
  const seen = new Set()
  const roots = []
  for (const record of records) {
    const cwd = record && record.header && record.header.cwd
    if (typeof cwd !== 'string' || cwd === '') continue
    const resolved = resolve(cwd)
    const key = process.platform === 'win32' ? resolved.toLocaleLowerCase() : resolved
    if (seen.has(key)) continue
    seen.add(key)
    roots.push({ path: resolved, name: basename(resolved) || resolved })
  }
  return { ok: true, action: 'roots', roots }
}

async function listRecentFiles(root, url, options) {
  const typeFilter = createTypeFilter(url.searchParams.get('types') || '')
  const started = Date.now()
  const queue = [root]
  const files = []
  let scanned = 0
  let truncated = false

  for (let index = 0; index < queue.length; index += 1) {
    if (Date.now() - started > options.budgetMs || scanned >= options.maxFiles) {
      truncated = true
      break
    }
    let entries
    try { entries = await readdir(queue[index], { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) queue.push(join(queue[index], entry.name))
        continue
      }
      if (!entry.isFile()) continue
      scanned += 1
      const full = join(queue[index], entry.name)
      const rel = toPosix(relative(root, full))
      if (!typeFilter(entry.name, rel)) continue
      try {
        const info = await stat(full)
        files.push({ name: entry.name, path: rel, file: full, extension: extname(entry.name).toLowerCase(), modifiedAt: info.mtimeMs })
      } catch { /* file changed while scanning */ }
    }
  }

  files.sort((a, b) => b.modifiedAt - a.modifiedAt || a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }))
  const limit = Math.min(options.maxFileResults, 50)
  return {
    ok: true,
    action: 'recent',
    root,
    rootName: basename(resolve(root)) || root,
    files: files.slice(0, limit),
    total: Math.min(files.length, limit),
    scanned,
    truncated: truncated || files.length > limit,
    elapsedMs: Date.now() - started,
  }
}

async function readPreviewFile(root, requestedPath, options) {
  const safe = safeWorkspacePath(root, requestedPath)
  if (safe === null || safe.relative === '') {
    return { ok: false, error: { code: 'invalid-path', message: 'The requested file is outside the workspace.' } }
  }

  let handle
  try {
    handle = await open(safe.full, 'r')
    const info = await handle.stat()
    if (!info.isFile()) return { ok: false, error: { code: 'not-file', message: 'The requested path is not a file.' } }
    const length = Math.min(info.size, options.maxPreviewBytes)
    const buffer = Buffer.alloc(length)
    let offset = 0
    while (offset < length) {
      const part = await handle.read(buffer, offset, length - offset, offset)
      if (part.bytesRead === 0) break
      offset += part.bytesRead
    }
    const bytes = buffer.subarray(0, offset)
    const extension = extname(safe.relative).toLowerCase()
    const imageMime = IMAGE_MIME.get(extension)
    if (imageMime !== undefined) {
      return {
        ok: true,
        action: 'read',
        root,
        path: safe.relative,
        file: safe.full,
        name: basename(safe.full),
        kind: 'image',
        mime: imageMime,
        data: bytes.toString('base64'),
        size: info.size,
        truncated: info.size > offset,
      }
    }
    const decoded = decodeTextBuffer(bytes)
    if (decoded === null) {
      return {
        ok: true,
        action: 'read',
        root,
        path: safe.relative,
        file: safe.full,
        name: basename(safe.full),
        kind: 'binary',
        size: info.size,
        truncated: info.size > offset,
      }
    }
    return {
      ok: true,
      action: 'read',
      root,
      path: safe.relative,
      file: safe.full,
      name: basename(safe.full),
      kind: 'text',
      language: languageFor(extension),
      content: decoded,
      size: info.size,
      truncated: info.size > offset,
    }
  } catch (error) {
    return { ok: false, error: { code: 'read-file-failed', message: errorMessage(error) } }
  } finally {
    if (handle !== undefined) {
      try {
        await handle.close()
      } catch {
        /* best-effort close */
      }
    }
  }
}

function decodeTextBuffer(bytes) {
  if (bytes.length === 0) return ''
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return bytes.subarray(3).toString('utf8')
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return bytes.subarray(2).toString('utf16le')
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const body = Buffer.from(bytes.subarray(2))
    for (let index = 0; index + 1 < body.length; index += 2) {
      const first = body[index]
      body[index] = body[index + 1]
      body[index + 1] = first
    }
    return body.toString('utf16le')
  }

  let evenNuls = 0
  let oddNuls = 0
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0) continue
    if (index % 2 === 0) evenNuls += 1
    else oddNuls += 1
  }
  const pairs = Math.max(1, Math.floor(bytes.length / 2))
  if (oddNuls / pairs > 0.35 && evenNuls / pairs < 0.05) return bytes.toString('utf16le')
  if (evenNuls / pairs > 0.35 && oddNuls / pairs < 0.05) {
    const swapped = Buffer.from(bytes)
    for (let index = 0; index + 1 < swapped.length; index += 2) {
      const first = swapped[index]
      swapped[index] = swapped[index + 1]
      swapped[index + 1] = first
    }
    return swapped.toString('utf16le')
  }
  if (evenNuls + oddNuls > 0) return null
  return bytes.toString('utf8')
}

async function listDirectory(root, requestedDir, options) {
  const safe = safeWorkspacePath(root, requestedDir)
  if (safe === null) {
    return { ok: false, error: { code: 'invalid-path', message: 'The requested directory is outside the workspace.' } }
  }

  let entries
  try {
    entries = await readdir(safe.full, { withFileTypes: true })
  } catch (error) {
    return { ok: false, error: { code: 'read-directory-failed', message: errorMessage(error) } }
  }

  // The explorer is lazy, so it can show ignored folders just like a normal
  // file tree without paying the cost of recursively searching them.
  const visible = entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    })

  const truncated = visible.length > options.maxDirectoryEntries
  const items = visible.slice(0, options.maxDirectoryEntries).map((entry) => {
    const path = safe.relative === '' ? entry.name : `${safe.relative}/${entry.name}`
    return {
      name: entry.name,
      path: toPosix(path),
      file: join(safe.full, entry.name),
      kind: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
      extension: entry.isFile() ? extname(entry.name).toLowerCase() : '',
    }
  })

  return {
    ok: true,
    action: 'list',
    root,
    rootName: basename(resolve(root)) || root,
    dir: safe.relative,
    entries: items,
    truncated,
  }
}

async function searchFileNames(root, url, options) {
  const text = (url.searchParams.get('q') || '').trim()
  const scope = safeWorkspacePath(root, url.searchParams.get('dir') || '')
  if (scope === null) {
    return { ok: false, error: { code: 'invalid-path', message: 'The requested search directory is outside the workspace.' } }
  }

  const typeFilter = createTypeFilter(url.searchParams.get('types') || '')
  const needle = text.toLocaleLowerCase()
  const started = Date.now()
  const results = []
  let scanned = 0
  let truncated = false
  const queue = [scope.full]

  for (let index = 0; index < queue.length; index += 1) {
    if (Date.now() - started > options.budgetMs || scanned >= options.maxFiles) {
      truncated = true
      break
    }
    let entries
    try {
      entries = await readdir(queue[index], { withFileTypes: true })
    } catch {
      continue
    }
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) queue.push(join(queue[index], entry.name))
        continue
      }
      if (!entry.isFile()) continue
      scanned += 1
      const full = join(queue[index], entry.name)
      const rel = toPosix(relative(root, full))
      if (!typeFilter(entry.name, rel)) continue
      if (needle !== '' && !entry.name.toLocaleLowerCase().includes(needle) && !rel.toLocaleLowerCase().includes(needle)) continue
      results.push({ name: entry.name, path: rel, file: full, extension: extname(entry.name).toLowerCase() })
      if (results.length >= options.maxFileResults) {
        truncated = true
        break
      }
    }
    if (truncated && results.length >= options.maxFileResults) break
  }

  results.sort((a, b) => {
    const aName = a.name.toLocaleLowerCase()
    const bName = b.name.toLocaleLowerCase()
    const aPrefix = needle !== '' && aName.startsWith(needle) ? 0 : 1
    const bPrefix = needle !== '' && bName.startsWith(needle) ? 0 : 1
    return aPrefix - bPrefix || a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' })
  })

  return {
    ok: true,
    action: 'search',
    root,
    rootName: basename(resolve(root)) || root,
    query: text,
    files: results,
    total: results.length,
    scanned,
    truncated,
    elapsedMs: Date.now() - started,
  }
}

function safeWorkspacePath(root, requested) {
  const rootPath = resolve(root)
  const raw = String(requested || '').replace(/\\/g, '/')
  const candidate = isAbsolute(raw) ? resolve(raw) : resolve(rootPath, raw)
  const rel = relative(rootPath, candidate)
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null
  return { full: candidate, relative: toPosix(rel === '.' ? '' : rel) }
}

function createTypeFilter(raw) {
  const tokens = String(raw || '')
    .split(/[\s,;]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
  if (tokens.length === 0 || tokens.includes('*') || tokens.includes('*.*')) return () => true
  const extensions = new Set(tokens.map((token) => {
    const cleaned = token.replace(/^\*+/, '')
    if (cleaned === '') return ''
    return cleaned.startsWith('.') ? cleaned : `.${cleaned}`
  }).filter(Boolean))
  return (name) => extensions.has(extname(name).toLowerCase())
}

/* --------------------------------------------------------------- chats */

async function handleChats(query, request, options) {
  const url = new URL(request.url)
  const text = (url.searchParams.get('q') || '').trim()
  const root = await resolveRoot(query, url.searchParams.get('root'), url.searchParams.get('session'))
  if (root === null) {
    return { ok: false, error: { code: 'root-missing', message: 'No working directory could be resolved for this session.' } }
  }

  const limit = options.maxChatResults
  let hits = []
  let engine = 'titles'
  if (text !== '' && typeof query.searchSessions === 'function') {
    try {
      const page = await query.searchSessions({
        query: text,
        sessionFilters: [{ kind: 'cwd', values: [root] }],
        limit,
      })
      hits = (page.items || []).map((item) => ({
        record: item,
        id: item.header && item.header.id,
        snippet: item.bestMatch && item.bestMatch.snippet,
        eventType: item.bestMatch && item.bestMatch.type,
        eventTime: item.bestMatch && item.bestMatch.time,
      })).filter((item) => typeof item.id === 'string')
      engine = 'fts'
    } catch {
      hits = []
    }
  }

  const records = await query.listSessions()
  const workspaceRecords = records.filter((record) => sameWorkspace(record && record.header && record.header.cwd, root))
  if (hits.length === 0) {
    hits = workspaceRecords.slice(0, limit).map((record) => ({ record, id: record.header.id }))
  }

  const ids = hits.map((item) => item.id)
  const titles = new Map()
  if (typeof query.readTitleSnapshots === 'function' && ids.length > 0) {
    try {
      const snapshots = await query.readTitleSnapshots(ids)
      for (let index = 0; index < snapshots.length; index += 1) {
        const result = snapshots[index]
        if (result && result.status === 'fulfilled' && result.value && result.value.title) {
          titles.set(ids[index], result.value.title.title || result.value.title)
        }
      }
    } catch {
      /* title fallback below */
    }
  }

  const needle = text.toLocaleLowerCase()
  const chats = hits.map((item) => {
    const header = (item.record && item.record.header) || {}
    const title = String(titles.get(item.id) || `Chat ${item.id.slice(0, 8)}`)
    return {
      id: item.id,
      title,
      cwd: header.cwd || root,
      createdAt: header.createdAt || 0,
      snippet: typeof item.snippet === 'string' ? item.snippet : '',
      eventType: item.eventType || '',
      eventTime: item.eventTime || 0,
    }
  }).filter((item) => text === '' || engine === 'fts' || item.title.toLocaleLowerCase().includes(needle))

  chats.sort((a, b) => {
    if (engine === 'fts' && text !== '') return 0
    return b.createdAt - a.createdAt || a.id.localeCompare(b.id)
  })
  return {
    ok: true,
    root,
    rootName: basename(resolve(root)) || root,
    query: text,
    chats: chats.slice(0, limit),
    total: Math.min(chats.length, limit),
    truncated: chats.length > limit,
    engine,
  }
}

function sameWorkspace(candidate, root) {
  if (typeof candidate !== 'string' || candidate === '') return false
  const a = resolve(candidate)
  const b = resolve(root)
  return process.platform === 'win32' ? a.toLocaleLowerCase() === b.toLocaleLowerCase() : a === b
}

const IMAGE_MIME = new Map([
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'], ['.webp', 'image/webp'], ['.svg', 'image/svg+xml'],
  ['.bmp', 'image/bmp'], ['.ico', 'image/x-icon'],
])

function languageFor(extension) {
  return ({
    '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.jsx': 'javascript',
    '.ts': 'typescript', '.tsx': 'typescript', '.json': 'json', '.md': 'markdown',
    '.py': 'python', '.cs': 'csharp', '.cpp': 'cpp', '.cc': 'cpp', '.c': 'c',
    '.h': 'c', '.hpp': 'cpp', '.java': 'java', '.go': 'go', '.rs': 'rust',
    '.html': 'html', '.css': 'css', '.scss': 'scss', '.xml': 'xml', '.yaml': 'yaml',
    '.yml': 'yaml', '.sh': 'shell', '.ps1': 'powershell', '.sql': 'sql', '.lua': 'lua',
  })[extension] || 'text'
}

function normalizeId(value) {
  return String(value ?? '')
    .trim()
    .replace(/^session[-_]/, '')
    .replace(/^ses[-_]/, '')
    .toLowerCase()
}

/* --------------------------------------------------------------- ripgrep */

function ripgrepCandidates() {
  const paths = []
  const env = process.env.DSH_RG_PATH
  if (typeof env === 'string' && env !== '') paths.push(env)
  const resources = process.resourcesPath
  if (typeof resources === 'string' && resources !== '') {
    paths.push(join(resources, 'app.asar.unpacked', 'dsh', 'node_modules', '@vscode', 'ripgrep-win32-x64', 'bin', 'rg.exe'))
    paths.push(join(resources, 'app.asar.unpacked', 'dsh', 'node_modules', '@vscode', 'ripgrep', 'bin', 'rg.exe'))
  }
  paths.push(join(process.cwd(), 'node_modules', '@vscode', 'ripgrep', 'bin', 'rg.exe'))
  return paths.filter((path) => {
    try {
      return existsSync(path)
    } catch {
      return false
    }
  })
}

function searchWithRipgrep(root, text, flags, options, started) {
  const binary = ripgrepCandidates()[0]
  if (binary === undefined) return Promise.resolve(null)

  const args = [
    '--json',
    '--no-heading',
    '--max-filesize',
    String(options.maxFileBytes),
    '--max-columns',
    '400',
    '--max-columns-preview',
    '--max-count',
    String(options.maxMatchesPerFile),
    ...IGNORE_GLOBS.flatMap((pattern) => ['--glob', pattern]),
    flags.caseSensitive ? '-s' : '-i',
  ]
  if (flags.wholeWord) args.push('-w')
  if (!flags.useRegex) args.push('-F')
  args.push('-e', text, root)

  return new Promise((resolve) => {
    let child
    try {
      child = spawn(binary, args, { windowsHide: true })
    } catch {
      resolve(null)
      return
    }

    const files = new Map()
    let total = 0
    let truncated = false
    let pending = ''
    let settled = false

    const finish = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        child.kill()
      } catch {
        /* the child may already have exited */
      }
      resolve(value)
    }

    const timer = setTimeout(() => {
      truncated = true
      finish({ files: sortedFiles(files), total, scanned: files.size, truncated, engine: 'rg' })
    }, options.budgetMs)

    child.on('error', () => finish(null))

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      pending += chunk
      let index = pending.indexOf('\n')
      while (index >= 0) {
        const line = pending.slice(0, index)
        pending = pending.slice(index + 1)
        index = pending.indexOf('\n')
        if (line === '') continue

        let event
        try {
          event = JSON.parse(line)
        } catch {
          continue
        }
        if (event.type !== 'match') continue

        const entry = toMatchEntry(event.data, root, flags.typeFilter)
        if (entry === null) continue

        const bucket = files.get(entry.path) || { path: entry.path, file: entry.file, matches: [], count: 0 }
        bucket.matches.push(entry.match)
        bucket.count += 1
        total += 1
        files.set(entry.path, bucket)

        if (total >= options.maxMatches) {
          truncated = true
          finish({ files: sortedFiles(files), total, scanned: files.size, truncated, engine: 'rg' })
          return
        }
      }
    })

    child.on('close', () => {
      finish({ files: sortedFiles(files), total, scanned: files.size, truncated, engine: 'rg' })
    })
  })
}

function toMatchEntry(data, root, typeFilter = () => true) {
  if (data === null || typeof data !== 'object') return null
  const pathText = data.path && data.path.text
  if (typeof pathText !== 'string') return null

  const raw = (data.lines && data.lines.text) || ''
  const lineText = raw.replace(/\r?\n$/, '')
  const number = Number(data.line_number) || 0
  const sub = Array.isArray(data.submatches) && data.submatches.length > 0 ? data.submatches[0] : null

  const buffer = Buffer.from(lineText, 'utf8')
  const startByte = sub && sub.start !== undefined ? sub.start : 0
  const endByte = sub && sub.end !== undefined ? sub.end : startByte
  const column = buffer.subarray(0, startByte).toString('utf8').length
  const end = buffer.subarray(0, endByte).toString('utf8').length

  const relativePath = toPosix(pathText.startsWith(root) ? relative(root, pathText) : pathText)
  if (!typeFilter(relativePath, relativePath)) return null
  return {
    path: relativePath,
    file: pathText,
    match: {
      line: number,
      column: column + 1,
      length: Math.max(1, end - column),
      text: lineText.trim().slice(0, 400),
    },
  }
}

function sortedFiles(map) {
  return [...map.values()].sort((a, b) => a.path.localeCompare(b.path))
}

/* ---------------------------------------------------------------- fallback */



async function searchWithWalker(root, text, flags, options, started) {
  const pattern = buildPattern(text, flags)
  const files = []
  let total = 0
  let scanned = 0
  let truncated = false

  const queue = [root]
  for (let index = 0; index < queue.length; index += 1) {
    if (Date.now() - started > options.budgetMs) {
      truncated = true
      break
    }
    const dir = queue[index]
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    entries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
        queue.push(join(dir, entry.name))
        continue
      }
      if (!entry.isFile()) continue
      const dot = entry.name.lastIndexOf('.')
      if (dot > 0 && SKIP_EXT.has(entry.name.slice(dot).toLowerCase())) continue
      if (!flags.typeFilter(entry.name, toPosix(relative(root, join(dir, entry.name))))) continue
      if (scanned >= options.maxFiles) {
        truncated = true
        break
      }
      scanned += 1

      const full = join(dir, entry.name)
      const content = await readText(full, options.maxFileBytes)
      if (content === null) continue

      const matches = matchContent(content, pattern, options.maxMatchesPerFile)
      if (matches.length === 0) continue

      const kept = matches.slice(0, Math.max(0, options.maxMatches - total))
      if (kept.length === 0) {
        truncated = true
        break
      }
      total += kept.length
      files.push({ path: toPosix(relative(root, full)), file: full, matches: kept, count: kept.length })
      if (total >= options.maxMatches) {
        truncated = true
        break
      }
    }
    if (total >= options.maxMatches) break
  }

  return { files: files.sort((a, b) => a.path.localeCompare(b.path)), total, scanned, truncated, engine: 'walk' }
}

function buildPattern(text, flags) {
  let source = flags.useRegex ? text : text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (flags.wholeWord) source = `\\b(?:${source})\\b`
  return new RegExp(source, flags.caseSensitive ? 'g' : 'gi')
}

function matchContent(content, pattern, limit) {
  const matches = []
  const lines = content.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    if (matches.length >= limit) break
    const line = lines[index]
    if (line.length > 4000) continue
    pattern.lastIndex = 0
    const found = pattern.exec(line)
    if (found === null || found[0] === '') continue
    const trimmed = line.trim()
    const lead = line.length - line.trimStart().length
    matches.push({
      line: index + 1,
      column: Math.max(1, found.index - lead + 1),
      length: found[0].length,
      text: trimmed.slice(0, 400),
    })
  }
  return matches
}

async function readText(path, maxBytes) {
  let handle
  try {
    handle = await open(path, 'r')
    const buffer = Buffer.alloc(8192)
    const head = await handle.read(buffer, 0, 8192, 0)
    if (head.bytesRead === 0) return null
    if (buffer.subarray(0, head.bytesRead).includes(0)) return null
    const info = await handle.stat()
    if (info.size > maxBytes) return null
    const whole = Buffer.alloc(info.size)
    let offset = 0
    while (offset < info.size) {
      const read = await handle.read(whole, offset, info.size - offset, offset)
      if (read.bytesRead === 0) break
      offset += read.bytesRead
    }
    return whole.toString('utf8', 0, offset)
  } catch {
    return null
  } finally {
    if (handle !== undefined) {
      try {
        await handle.close()
      } catch {
        /* nothing left to do */
      }
    }
  }
}

/* ------------------------------------------------------------------ helpers */

function normalizeOptions(config) {
  const raw = config && typeof config === 'object' ? config : {}
  return {
    maxFiles: clampInt(raw.maxFiles, DEFAULTS.maxFiles, 1, 200_000),
    maxMatches: clampInt(raw.maxMatches, DEFAULTS.maxMatches, 1, 5000),
    maxMatchesPerFile: clampInt(raw.maxMatchesPerFile, DEFAULTS.maxMatchesPerFile, 1, 500),
    maxFileBytes: clampInt(raw.maxFileBytes, DEFAULTS.maxFileBytes, 1024, 50_000_000),
    budgetMs: clampInt(raw.budgetMs, DEFAULTS.budgetMs, 200, 120_000),
    maxFileResults: clampInt(raw.maxFileResults, DEFAULTS.maxFileResults, 1, 5000),
    maxDirectoryEntries: clampInt(raw.maxDirectoryEntries, DEFAULTS.maxDirectoryEntries, 1, 20_000),
    maxPreviewBytes: clampInt(raw.maxPreviewBytes, DEFAULTS.maxPreviewBytes, 1024, 50_000_000),
    maxChatResults: clampInt(raw.maxChatResults, DEFAULTS.maxChatResults, 1, 500),
  }
}

function clampInt(value, fallback, min, max) {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

function toPosix(path) {
  return sep === '/' ? path : path.split(sep).join('/')
}

function errorMessage(error) {
  if (error instanceof Error) return error.message
  return String(error)
}

export const __testing = {
  handle,
  handleFiles,
  handleChats,
  listDirectory,
  readPreviewFile,
  searchFileNames,
  safeWorkspacePath,
  createTypeFilter,
  QUERY_CACHE,
}
