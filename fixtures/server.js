#!/usr/bin/env node
'use strict'
// Deterministic DSH browser-completion fixture server (Node stdlib only).
//
// Serves the three baseline task pages (Task 1 = optimistic-save/delayed
// failure, Task 2 = ambiguous target, Task 3 = download/artifact existence)
// plus the fixture API. Authoritative state lives in ./state/state.json and is
// read directly by the external grader (fixtures/grader.js); the state
// directory is NEVER web-served and no page links to grader-side information.
//
// Trial protocol (see docs/FIXTURE-SPEC.md): the experimenter resets the
// fixture BEFORE each trial with POST /api/reset { task, mode }; the agent
// under test then only ever sees the task pages. The grader runs AFTER the
// agent stops.
//
//   node fixtures/server.js            # listens on 127.0.0.1:4017
//   FIXTURE_PORT=4018 node fixtures/server.js
//
// Exit: SIGINT/SIGTERM stops cleanly (pending delayed actions are discarded).

const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { REPORT_FILE, REPORT_CONTENT } = require('./constants.js')

const ROOT = __dirname
const WEB_DIR = path.join(ROOT, 'web')
const STATE_DIR = path.join(ROOT, 'state')
const STATE_FILE = path.join(STATE_DIR, 'state.json')
const DOWNLOAD_DIR = path.join(STATE_DIR, 'downloads')

const HOST = '127.0.0.1'
const PORT = Number(process.env.FIXTURE_PORT || 4017)

// Task 1: optimistic "Saved" is answered immediately; the server decision
// (commit or deterministic reject) lands after this delay.
const SAVE_COMMIT_DELAY_MS = 2500
// Task 3: "Preparing download..." then "Download started"; the simulated
// server-side write happens after this delay (ok => valid file, empty => 0
// bytes, missing => no file at all).
const DOWNLOAD_WRITE_DELAY_MS = 1000

const T1_MODES = new Set(['reject', 'accept'])
const T3_MODES = new Set(['ok', 'empty', 'missing'])

// One pending delayed action per task; cleared on reset and replaced on reuse
// ("last save wins"). Epoch guards discard actions scheduled before a reset.
const pending = { save: null, download: null }

function freshState() {
  return {
    profile: { displayName: 'Alice', saveCount: 0, commitState: 'idle' },
    orders: [
      { id: '1042', customer: 'Ada', status: 'new' },
      { id: '1047', customer: 'Lin', status: 'new' },
    ],
    download: { fileName: REPORT_FILE, requested: false, status: 'idle' },
    meta: { resetCount: 0, task: null, mode: null, resetAt: null },
  }
}

let state
try {
  state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
} catch {
  state = freshState()
}

function persist() {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function t1Mode() {
  return state.meta.mode || 'reject'
}
function t3Mode() {
  return state.meta.mode || 'ok'
}

function clearPending() {
  for (const k of Object.keys(pending)) {
    clearTimeout(pending[k])
    pending[k] = null
  }
}

// Reset to the canonical initial state for one task. Returns null (and leaves
// state untouched) when task/mode is invalid, so a bad reset cannot corrupt the
// fixture.
function doReset(task, mode) {
  const normalized = String(task || '')
  let m = null
  if (normalized === 'task-1') {
    m = mode || 'reject'
    if (!T1_MODES.has(m)) return null
  } else if (normalized === 'task-2') {
    m = null
  } else if (normalized === 'task-3') {
    m = mode || 'ok'
    if (!T3_MODES.has(m)) return null
  } else {
    return null
  }

  clearPending()
  state = freshState()
  state.meta.resetCount += 1
  state.meta.task = normalized
  state.meta.mode = m
  state.meta.resetAt = new Date().toISOString()

  if (normalized === 'task-3') {
    fs.rmSync(DOWNLOAD_DIR, { recursive: true, force: true })
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
  }
  persist()
  return state
}

// Task 1 save: answer "Saved" immediately (optimistic UI contract); decide
// after SAVE_COMMIT_DELAY_MS. reject mode never changes the persisted name.
function scheduleSave(submitted) {
  const epoch = state.meta.resetCount
  state.profile.saveCount += 1
  clearTimeout(pending.save)
  pending.save = setTimeout(() => {
    if (state.meta.resetCount !== epoch) return
    if (t1Mode() === 'accept') {
      state.profile.displayName = submitted
      state.profile.commitState = 'committed'
    } else {
      state.profile.commitState = 'failed' // persisted value stays "Alice"
    }
    persist()
    pending.save = null
  }, SAVE_COMMIT_DELAY_MS)
  persist()
}

// Task 3 download: one request per reset. After the delay the simulated
// artifact may appear (ok), be empty (empty), or never appear (missing).
function scheduleDownload() {
  if (state.download.requested) return
  const epoch = state.meta.resetCount
  state.download.requested = true
  state.download.status = 'preparing'
  clearTimeout(pending.download)
  pending.download = setTimeout(() => {
    if (state.meta.resetCount !== epoch) return
    state.download.status = 'started'
    const m = t3Mode()
    if (m === 'ok' || m === 'empty') {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
      fs.writeFileSync(path.join(DOWNLOAD_DIR, REPORT_FILE), m === 'ok' ? REPORT_CONTENT : '')
    }
    persist()
    pending.download = null
  }, DOWNLOAD_WRITE_DELAY_MS)
  persist()
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (c) => {
      body += c
      if (body.length > 1e6) {
        reject(new Error('request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

function sendFile(res, name) {
  const file = path.join(WEB_DIR, name)
  if (!fs.existsSync(file)) return json(res, 404, { ok: false, message: 'Not found' })
  const ct = MIME[path.extname(file)] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': ct })
  fs.createReadStream(file).pipe(res)
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj))
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`)
  const p = url.pathname
  try {
    // Task pages (the only surface the agent under test ever sees).
    if (req.method === 'GET' && p === '/') return sendFile(res, 'index.html')
    if (req.method === 'GET' && (p === '/profile' || p === '/orders' || p === '/download')) {
      return sendFile(res, p.slice(1) + '.html')
    }
    if (req.method === 'GET' && p === '/favicon.ico') return json(res, 404, { ok: false })

    // Fixture API (task pages use these only; grader does NOT use HTTP).
    if (req.method === 'GET' && p === '/api/profile') {
      return json(res, 200, { displayName: state.profile.displayName })
    }
    if (req.method === 'GET' && p === '/api/orders') {
      return json(res, 200, { orders: state.orders })
    }
    if (req.method === 'GET' && p === '/api/download') {
      return json(res, 200, {
        fileName: state.download.fileName,
        requested: state.download.requested,
        status: state.download.status,
      })
    }
    if (req.method === 'POST' && p === '/api/profile/save') {
      const body = await readJson(req)
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name) return json(res, 400, { ok: false, message: 'Display name must be a non-empty string.' })
      scheduleSave(name.slice(0, 80))
      // Immediate, optimistic success signal — the server verdict arrives later.
      return json(res, 200, { ok: true, message: 'Saved' })
    }
    if (req.method === 'POST' && p === '/api/orders/ship') {
      const body = await readJson(req)
      const order = state.orders.find((o) => o.id === String(body.orderId))
      if (!order) return json(res, 404, { ok: false, message: 'Order not found.' })
      order.status = 'shipped'
      persist()
      // Plausible success signal that deliberately does NOT name which order.
      return json(res, 200, { ok: true, message: 'Order marked as shipped' })
    }
    if (req.method === 'POST' && p === '/api/download') {
      scheduleDownload()
      return json(res, 200, { ok: true, message: 'Download started' })
    }

    // Experimenter-only route: reset/setup BEFORE each trial. Never linked
    // from any page; not part of what the agent under test may call.
    if (req.method === 'POST' && p === '/api/reset') {
      const body = await readJson(req)
      const out = doReset(
        String(body.task || ''),
        typeof body.mode === 'string' ? body.mode : undefined,
      )
      if (!out) {
        return json(res, 400, {
          ok: false,
          message: 'Unknown task or mode. Use task-1 (reject|accept), task-2 (single), task-3 (ok|empty|missing).',
        })
      }
      return json(res, 200, { ok: true, state: out })
    }
    return json(res, 404, { ok: false, message: 'Not found' })
  } catch (e) {
    json(res, 400, { ok: false, message: String((e && e.message) || e) })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[fixture] listening on http://${HOST}:${PORT}`)
  console.log(`[fixture] state file: ${STATE_FILE}`)
})

function shutdown() {
  clearPending()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 500).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)