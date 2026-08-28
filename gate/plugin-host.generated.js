// gate/plugin-shell.js — SOURCE for the minimum Completion Gate dynamic Host
// plugin. Not directly loadable: gate/build-plugin.js embeds gate-core.js at
// the __GATE_CORE__ marker and emits gate/plugin-host.generated.js (the exact
// function body to hand to cordis_define code.host, or to an agent preset).
//
// The plugin registers one tool, `completion_gate_check`, which evaluates a
// declarative list of completion conditions against injected probes and
// returns a machine-readable verification receipt (PASS / FAIL / BLOCKED with
// per-check expected+observed evidence). Nothing here is an LLM judge; nothing
// here can pass silently.
return {
  apply(ctx) {
    const core = (function () {
'use strict'
// gate-core.js — deterministic completion-verification core for the minimum
// Browser Completion Gate prototype.
//
// Pure JavaScript with NO DSH imports and NO Node-only globals beyond what the
// build/embed step guarantees: it runs identically (a) under plain Node for
// the automated tests and (b) inside the DSH dynamic-plugin evaluator after
// being embedded by gate/build-plugin.js. The only externally supplied
// dependency is the `probes` object injected at evaluation time; every probe
// failure is surfaced as an explicit BLOCKED/error outcome — never as success.
//
// Determinism contract: given the same conditions, probes and inputs, the
// receipt is byte-identical (canonical JSON, stable key order, no wall-clock
// text beyond the generated_at timestamp). No LLM judge exists anywhere in
// this path.

const VERSION = '0.1.0'

// ---------------------------------------------------------------------------
// SHA-256 (FIPS 180-4), pure JS. Computed over raw bytes so the receipt can
// compare content hashes without any platform crypto dependency.
// ---------------------------------------------------------------------------

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

function sha256Bytes(data) {
  // data: Uint8Array | string (string is encoded as UTF-8)
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const len = bytes.length
  const bitLenHi = Math.floor(len / 0x20000000)
  const bitLenLo = (len << 3) >>> 0
  const paddedLen = (((len + 8) >> 6) + 1) << 6
  const padded = new Uint8Array(paddedLen)
  padded.set(bytes)
  padded[len] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(paddedLen - 8, bitLenHi)
  dv.setUint32(paddedLen - 4, bitLenLo)
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ])
  const w = new Uint32Array(64)
  for (let off = 0; off < paddedLen; off += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = dv.getUint32(off + i * 4)
    }
    for (let i = 16; i < 64; i++) {
      const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
                 ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3)
      const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
                 ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let a = h[0], b = h[1], c = h[2], d = h[3]
    let e = h[4], f = h[5], g = h[6], hh = h[7]
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^
                 ((e >>> 25) | (e << 7))
      const ch = (e & f) ^ (~e & g)
      const temp1 = (hh + S1 + ch + K256[i] + w[i]) >>> 0
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^
                 ((a >>> 22) | (a << 10))
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0
      hh = g; g = f; f = e; e = (d + temp1) >>> 0
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0
    h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0
  }
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += h[i].toString(16).padStart(8, '0')
  }
  return out
}

// ---------------------------------------------------------------------------
// Canonical JSON: recursively sorted object keys, arrays in order. Used for
// every receipt string so identical inputs produce byte-identical receipts.
// ---------------------------------------------------------------------------

function canonicalJson(value) {
  if (value === null || value === undefined) return JSON.stringify(value === undefined ? null : value)
  if (typeof value === 'object') {
    if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
    const keys = Object.keys(value).sort()
    const parts = []
    for (const k of keys) {
      const v = value[k]
      if (v === undefined) continue
      parts.push(JSON.stringify(k) + ':' + canonicalJson(v))
    }
    return '{' + parts.join(',') + '}'
  }
  return JSON.stringify(value)
}

// ---------------------------------------------------------------------------
// Path/selection helpers.
// ---------------------------------------------------------------------------

// Resolve a condition path against `base`. Absolute paths win; relative paths
// resolve under `base` (default: process cwd, or the caller's provided base).
function resolvePath(p, base) {
  if (typeof p !== 'string' || p === '') return null
  if (p.startsWith('/')) return p
  if (base && typeof base === 'string') {
    if (base.endsWith('/')) return base + p
    return base + '/' + p
  }
  return p
}

// Decode one JSON-pointer reference token (~0 -> ~, ~1 -> /).
function unescapeToken(tok) {
  return tok.replace(/~1/g, '/').replace(/~0/g, '~')
}

// Parse a `select` specification into a segment list.
// Accepts:
//   - a JSON Pointer string ("/orders/0/status")
//   - an array of segments: string keys, number indexes, or
//     { find: { field: value, ... } } (first array element matching ALL fields)
// Returns null when the spec is malformed (caller reports BLOCKED).
function parseSelect(spec) {
  if (typeof spec === 'string') {
    if (!spec.startsWith('/')) return null
    if (spec === '/') return []
    return spec.split('/').slice(1).map((t) => {
      const tok = unescapeToken(t)
      return /^\d+$/.test(tok) ? Number(tok) : tok
    })
  }
  if (Array.isArray(spec)) {
    const segs = []
    for (const s of spec) {
      if (typeof s === 'string' || typeof s === 'number') {
        if (typeof s === 'number' && !Number.isInteger(s)) return null
        segs.push(s)
      } else if (s && typeof s === 'object' && !Array.isArray(s) &&
                 s.find && typeof s.find === 'object' && s.find !== null) {
        segs.push({ find: s.find })
      } else {
        return null
      }
    }
    return segs
  }
  return null
}

// Apply parsed segments to a JSON value.
// Returns { ok: true, value } or { ok: false, reason }.
function selectValue(root, segs) {
  let cur = root
  for (const seg of segs) {
    if (seg && typeof seg === 'object' && seg.find !== undefined) {
      if (!Array.isArray(cur)) return { ok: false, reason: 'segment .find applied to a non-array' }
      const wanted = seg.find
      let found = undefined
      for (const item of cur) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          let all = true
          for (const k of Object.keys(wanted)) {
            if (!(k in item) || item[k] !== wanted[k]) { all = false; break }
          }
          if (all) { found = item; break }
        }
      }
      if (found === undefined) {
        return { ok: false, reason: 'no array element matches ' + canonicalJson(wanted) }
      }
      cur = found
    } else if (typeof seg === 'number') {
      if (!Array.isArray(cur)) return { ok: false, reason: 'index segment applied to a non-array' }
      if (seg < 0 || seg >= cur.length) return { ok: false, reason: 'array index ' + seg + ' out of bounds' }
      cur = cur[seg]
    } else {
      if (cur === null || typeof cur !== 'object' || Array.isArray(cur)) {
        return { ok: false, reason: 'key segment "' + seg + '" applied to a non-object' }
      }
      if (!(seg in cur)) return { ok: false, reason: 'key "' + seg + '" not present' }
      cur = cur[seg]
    }
  }
  return { ok: true, value: cur }
}

// ---------------------------------------------------------------------------
// Condition evaluation.
// ---------------------------------------------------------------------------

// Each condition yields:
//   { passed: boolean|null, blocked: boolean, reason: string|null,
//     observed: any (JSON-safe), error: string|null }
// `passed: null` + `blocked: true` means the check could NOT be evaluated
// (malformed condition, missing evidence, probe failure) — an explicit
// non-success, never a silent pass.
async function evaluateCondition(cond, probes, base) {
  if (!cond || typeof cond !== 'object' || Array.isArray(cond) || typeof cond.kind !== 'string') {
    return { passed: null, blocked: true, reason: 'malformed condition: expected an object with a string "kind"', observed: null, error: 'malformed condition' }
  }

  if (cond.kind === 'file') {
    const path = resolvePath(cond.path, base)
    if (path === null) {
      return { passed: null, blocked: true, reason: 'file check requires a "path" string', observed: null, error: 'missing path' }
    }
    let evidence
    try {
      evidence = await probes.readFile(path)
    } catch (e) {
      return { passed: null, blocked: true, reason: 'probe failed for ' + path + ': ' + String((e && e.message) || e), observed: null, error: 'probe failure' }
    }
    const exists = !!(evidence && evidence.exists)
    const hasBytes = !!(evidence && typeof evidence.bytes !== 'undefined' && evidence.bytes !== null)
    const size = hasBytes ? evidence.bytes.length : (evidence && typeof evidence.size === 'number' ? evidence.size : null)
    let sha = null
    if (hasBytes) {
      try { sha = sha256Bytes(evidence.bytes) } catch (e) { sha = null }
    } else if (evidence && typeof evidence.sha256 === 'string') {
      sha = evidence.sha256.toLowerCase()
    }
    const observed = { exists, size, sha256: sha }

    // Missing file without an explicit existence expectation = missing
    // evidence => BLOCKED (cannot judge content checks on an absent file).
    if (!exists && cond.exists !== true && cond.exists !== false) {
      return { passed: null, blocked: true, reason: 'file absent and no existence expectation given: ' + path, observed, error: 'missing evidence' }
    }
    const failures = []
    if (cond.exists === true && !exists) failures.push('expected file to exist')
    if (cond.exists === false && exists) failures.push('expected file to be absent')
    if (exists) {
      if (cond.nonEmpty === true && !(size > 0)) failures.push('expected non-empty file (got ' + String(size) + ' bytes)')
      if (cond.nonEmpty === false && size > 0) failures.push('expected empty file (got ' + String(size) + ' bytes)')
      if (cond.minBytes !== undefined && typeof cond.minBytes === 'number') {
        if (typeof size !== 'number' || size < cond.minBytes) {
          failures.push('expected at least ' + cond.minBytes + ' bytes (got ' + String(size) + ')')
        }
      }
      if (typeof cond.sha256 === 'string') {
        if (sha === null) failures.push('sha256 could not be computed')
        else if (sha !== cond.sha256.toLowerCase()) failures.push('sha256 mismatch (got ' + sha + ')')
      }
    }
    const passed = failures.length === 0
    return {
      passed,
      blocked: false,
      reason: passed ? null : failures.join('; '),
      observed,
      error: passed ? null : 'condition not met',
    }
  }

  if (cond.kind === 'json_state') {
    const path = resolvePath(cond.path, base)
    if (path === null) {
      return { passed: null, blocked: true, reason: 'json_state check requires a "path" string', observed: null, error: 'missing path' }
    }
    const segs = parseSelect(cond.select)
    if (segs === null) {
      return { passed: null, blocked: true, reason: 'json_state check requires a valid "select" (JSON pointer or segment array)', observed: null, error: 'malformed select' }
    }
    if (!('expect' in cond)) {
      return { passed: null, blocked: true, reason: 'json_state check requires an "expect" value', observed: null, error: 'missing expect' }
    }
    let text
    try {
      text = await probes.readText(path)
    } catch (e) {
      return { passed: null, blocked: true, reason: 'probe failed for ' + path + ': ' + String((e && e.message) || e), observed: null, error: 'probe failure' }
    }
    let root
    try {
      root = JSON.parse(text)
    } catch (e) {
      return { passed: null, blocked: true, reason: path + ' is not valid JSON: ' + String((e && e.message) || e), observed: null, error: 'invalid JSON evidence' }
    }
    const sel = selectValue(root, segs)
    if (!sel.ok) {
      return { passed: null, blocked: true, reason: 'cannot select from ' + path + ': ' + sel.reason, observed: null, error: 'evidence path not found' }
    }
    const op = cond.op === undefined ? 'eq' : cond.op
    let passed
    if (op === 'eq') {
      passed = canonicalJson(sel.value) === canonicalJson(cond.expect)
    } else if (op === 'ne') {
      passed = canonicalJson(sel.value) !== canonicalJson(cond.expect)
    } else {
      return { passed: null, blocked: true, reason: 'unsupported json_state op "' + op + '" (use eq | ne)', observed: sel.value, error: 'malformed condition' }
    }
    return { passed, blocked: false, reason: passed ? null : 'selected value differs from expect', observed: sel.value, error: passed ? null : 'condition not met' }
  }

  if (cond.kind === 'browser') {
    const check = cond.check
    try {
      if (check === 'url_matches') {
        if (typeof cond.pattern !== 'string') {
          return { passed: null, blocked: true, reason: 'browser url_matches requires a "pattern" string', observed: null, error: 'malformed condition' }
        }
        const probe = await probes.browserProbe()
        let re
        try { re = new RegExp(cond.pattern) } catch (e) {
          return { passed: null, blocked: true, reason: 'invalid url pattern: ' + String((e && e.message) || e), observed: probe ? { url: probe.url } : null, error: 'malformed condition' }
        }
        const url = probe && typeof probe.url === 'string' ? probe.url : ''
        const hit = re.test(url)
        return { passed: hit, blocked: false, reason: hit ? null : 'URL does not match pattern (got "' + url + '")', observed: { url }, error: hit ? null : 'condition not met' }
      }
      if (check === 'visible_text_contains') {
        if (typeof cond.text !== 'string' || cond.text === '') {
          return { passed: null, blocked: true, reason: 'browser visible_text_contains requires a non-empty "text" string', observed: null, error: 'malformed condition' }
        }
        const probe = await probes.browserProbe()
        const visible = probe && typeof probe.visibleText === 'string' ? probe.visibleText : ''
        const hit = visible.indexOf(cond.text) !== -1
        return { passed: hit, blocked: false, reason: hit ? null : 'visible text does not contain expected text', observed: { url: probe && probe.url, visibleText: visible.slice(0, 500) }, error: hit ? null : 'condition not met' }
      }
      if (check === 'selector_text') {
        if (typeof cond.selector !== 'string' || cond.selector === '' || !('expect' in cond)) {
          return { passed: null, blocked: true, reason: 'browser selector_text requires a "selector" string and an "expect" value', observed: null, error: 'malformed condition' }
        }
        const selOut = await probes.browserSelector(cond.selector)
        if (selOut === null) {
          return { passed: null, blocked: true, reason: 'selector "' + cond.selector + '" not found (or unreadable)', observed: null, error: 'selector not found' }
        }
        const op = cond.op === undefined ? 'eq' : cond.op
        let passed
        if (op === 'eq') passed = selOut.text === cond.expect
        else if (op === 'contains') passed = selOut.text.indexOf(cond.expect) !== -1
        else {
          return { passed: null, blocked: true, reason: 'unsupported selector_text op "' + op + '" (use eq | contains)', observed: { selector: cond.selector, text: selOut.text }, error: 'malformed condition' }
        }
        return { passed, blocked: false, reason: passed ? null : 'selector text differs from expect', observed: { selector: cond.selector, text: selOut.text }, error: passed ? null : 'condition not met' }
      }
      return { passed: null, blocked: true, reason: 'unsupported browser check "' + String(check) + '" (use url_matches | visible_text_contains | selector_text)', observed: null, error: 'unsupported browser check' }
    } catch (e) {
      return { passed: null, blocked: true, reason: 'browser probe failed: ' + String((e && e.message) || e), observed: null, error: 'probe failure' }
    }
  }

  // Unknown kind: explicit BLOCKED — never a silent pass, never a silent fail.
  return { passed: null, blocked: true, reason: 'unsupported condition kind "' + String(cond.kind) + '" (use file | json_state | browser)', observed: null, error: 'unsupported condition kind' }
}

// ---------------------------------------------------------------------------
// Receipt builder.
// ---------------------------------------------------------------------------

// request: { conditions: [...], conditionsPath?: string, context?: any,
//            base?: string }
// probes:  { readFile(path)->{exists,size?,bytes?,sha256?},
//            readText(path)->string,
//            browserProbe()->{url?,visibleText?,raw?},
//            browserSelector(selector)->{text}|null }
// Receipt checks: id, kind, passed (bool|null), blocked (bool), reason,
// expected (canonical JSON), observed (canonical JSON), error.
async function evaluateGate(request, probes) {
  const started = Date.now()
  const generatedAt = new Date().toISOString()
  const checks = []
  let requestError = null
  let conditions = []
  const base = request && typeof request.base === 'string' ? request.base : ''
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    requestError = 'gate request must be an object with a "conditions" array or a "conditionsPath" string'
    conditions = []
  } else if (Array.isArray(request.conditions)) {
    if (request.conditionsPath !== undefined) {
      requestError = 'gate request accepts either "conditions" or "conditionsPath", not both'
      conditions = []
    } else {
      conditions = request.conditions
    }
  } else if (typeof request.conditionsPath === 'string') {
    // conditionsPath: the caller points at a JSON file holding the condition
    // array, so completion conditions are defined in a user-editable file
    // instead of inline tool arguments. Read failures and non-array files are
    // BLOCKED — never silently judged against empty conditions.
    const cp = resolvePath(request.conditionsPath, base)
    if (cp === null || cp === '') {
      requestError = 'gate request requires a non-empty "conditionsPath" string'
      conditions = []
    } else if (typeof probes.readText !== 'function') {
      requestError = 'gate request used "conditionsPath" but the text probe is unavailable'
      conditions = []
    } else {
      let text
      try {
        text = await probes.readText(cp)
      } catch (e) {
        requestError = 'cannot read conditionsPath ' + cp + ': ' + String((e && e.message) || e)
        conditions = []
      }
      if (requestError === null) {
        let parsed
        try {
          parsed = JSON.parse(text)
        } catch (e) {
          requestError = 'conditionsPath ' + cp + ' is not valid JSON: ' + String((e && e.message) || e)
        }
        if (requestError === null) {
          if (!Array.isArray(parsed)) {
            requestError = 'conditionsPath ' + cp + ' must contain a JSON array of conditions'
          } else {
            conditions = parsed
          }
        }
      }
    }
  } else if (request.conditionsPath !== undefined) {
    requestError = 'gate request requires a non-empty "conditionsPath" string'
    conditions = []
  } else {
    requestError = 'gate request requires a "conditions" array or a "conditionsPath" string'
    conditions = []
  }

  for (const cond of conditions) {
    const result = await evaluateCondition(cond, probes, base)
    const kind = cond && typeof cond === 'object' && typeof cond.kind === 'string' ? cond.kind : 'invalid'
    const id = cond && typeof cond.id === 'string' && cond.id !== '' ? cond.id : 'check-' + checks.length
    checks.push({
      id,
      kind,
      passed: result.passed,
      blocked: result.blocked,
      reason: result.reason,
      expected: describeExpected(cond),
      observed: canonicalJson(result.observed),
      error: result.error,
    })
  }

  const anyBlocked = requestError !== null || checks.some((c) => c.blocked)
  const anyFailed = checks.some((c) => c.passed === false)
  let overall
  if (requestError !== null) overall = 'BLOCKED'
  else if (anyBlocked) overall = 'BLOCKED'
  else if (anyFailed) overall = 'FAIL'
  else overall = checks.length === 0 ? 'BLOCKED' : 'PASS'

  return {
    gate: 'completion_gate_check',
    version: VERSION,
    overall,
    generated_at: generatedAt,
    millis: Date.now() - started,
    context: request && 'context' in request ? request.context : null,
    request_error: requestError,
    checks,
  }
}

// Normalized, deterministic "expected" description (canonical JSON, `id`
// excluded — the id is already a separate receipt field).
function describeExpected(cond) {
  if (!cond || typeof cond !== 'object' || Array.isArray(cond)) return canonicalJson(cond)
  const norm = {}
  for (const k of Object.keys(cond).sort()) {
    if (k === 'id') continue
    norm[k] = cond[k]
  }
  return canonicalJson(norm)
}

// ---------------------------------------------------------------------------
// Public surface (also embedded by the plugin build).
// ---------------------------------------------------------------------------

const api = { VERSION, sha256Bytes, canonicalJson, parseSelect, selectValue, evaluateCondition, evaluateGate }


return api
})()
    const MAX_BYTES = 16 * 1024 * 1024

    // --- completion-enforcement state --------------------------------------
    //
    // Current DSH cannot veto turn completion (verified against dsh-agent-loop:
    // `turn/end` is appended unconditionally; a turn completes when the model
    // emits a message with no tool calls, or when a tool result concludes the
    // turn). The narrowest practical lever is the tools.guard: while the gate
    // is ARMED and the last receipt is not PASS, calls to the configured
    // completion-relevant tool names are denied with an explicit reason. This
    // never blocks the "model finishes without calling any tool" exit, which
    // is documented as a hard limitation of the contract.
    //
    // The dynamic-plugin sandbox only exposes a restricted `tools` wrapper
    // (register/schemas/get — no guard, no execute), so the REAL tools service
    // is reached through the executing agent's own scoped context
    // (`exec.agent.ctx`), which is what scopes the guard to this one agent.

    let armed = false
    let denyTools = [] // completion-relevant tool names denied until PASS
    let lastOverall = null
    let guardDispose = null

    // The agent-scoped tools service behind one tool execution.
    function agentTools(exec) {
      const agent = exec && exec.agent
      const actx = agent && agent.ctx
      if (!actx || typeof actx.get !== 'function') return undefined
      const tools = actx.get('tools')
      return tools && typeof tools === 'object' ? tools : undefined
    }

    // Register the completion guard on the agent's OWN tools layer on the
    // first execution (apply() has no exec yet). The real tools service is
    // not reachable through the sandbox ctx wrapper; exec.agent.ctx is the
    // agent's real scoped context.
    function ensureGuard(exec) {
      if (guardDispose !== null) return
      const tools = agentTools(exec)
      if (tools && typeof tools.guard === 'function') {
        guardDispose = tools.guard(gateGuard)
      }
    }

    function randomId(prefix) {
      const chars = '0123456789abcdef'
      let s = ''
      for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * 16)]
      return prefix + s
    }

    // --- probes -----------------------------------------------------------

    function agentCwd(exec) {
      const agent = exec && exec.agent
      const header = agent && agent.session && agent.session.header
      return header && typeof header.cwd === 'string' ? header.cwd : undefined
    }

    // Dispatch one existing native tool (dsh-browser bridge tools) from inside
    // the gate: reuses dsh-browser, builds no browser automation of our own.
    async function dispatchBrowser(tools, exec, name, args) {
      if (!tools || typeof tools.execute !== 'function') {
        throw new Error('tools service unavailable')
      }
      const result = await tools.execute({
        callId: randomId('call-'),
        name,
        arguments: args,
        signal: exec.signal,
        agent: exec.agent,
      })
      if (!result) throw new Error(name + ' returned no result')
      if (result.isError) {
        const err = result.error || {}
        throw new Error(
          name + ' dispatch failed: ' + String(err.message || err.code || 'unknown'),
        )
      }
      const value = result.value
      if (value && typeof value === 'object' && typeof value.text === 'string') {
        return value.text
      }
      throw new Error(name + ' returned no usable text')
    }

    // Parse the dsh-browser text snapshot (Chinese labels, current bridge
    // format) into { url, visibleText, raw }. Deliberately conservative: any
    // parse mismatch surfaces as missing evidence (empty fields), never as a
    // silent pass — conditions still FAIL/BLOCK.
    function parseSnapshot(text) {
      const urlMatch = /^URL:\s*(.*)$/m.exec(text)
      const url = urlMatch ? urlMatch[1].trim() : ''
      let visibleText = ''
      const bodyIdx = text.indexOf('正文:')
      if (bodyIdx !== -1) {
        let rest = text.slice(bodyIdx + '正文:'.length)
        const cut = rest.search(/\n{2,}(交互元素|表单字段)/)
        if (cut !== -1) rest = rest.slice(0, cut)
        visibleText = rest.trim()
      }
      return { url, visibleText, raw: text.slice(0, 2000) }
    }

    function makeProbes(exec) {
      const fs = ctx.get('fs')
      // The sandbox's `tools` wrapper has no execute; dispatch through the
      // agent's real tools service so browser checks reuse the existing
      // dsh-browser bridge (no browser automation of our own).
      const tools = agentTools(exec) || ctx.get('tools')
      const cwd = agentCwd(exec)
      return {
        async readFile(path) {
          if (!fs) throw new Error('fs service unavailable')
          const target = await fs.resolve(path, { cwd })
          const info = await fs.stat(target, exec.signal)
          if (!info) return { exists: false, size: null }
          let bytes = null
          try {
            bytes = await fs.readBytes(target, exec.signal, MAX_BYTES)
          } catch (e) {
            bytes = null
          }
          return {
            exists: true,
            size: typeof info.size === 'number' ? info.size : (bytes ? bytes.length : null),
            bytes,
          }
        },
        async readText(path) {
          if (!fs) throw new Error('fs service unavailable')
          const target = await fs.resolve(path, { cwd })
          return fs.readText(target, exec.signal)
        },
        async browserProbe() {
          const text = await dispatchBrowser(tools, exec, 'browser_snapshot', {})
          return parseSnapshot(text)
        },
        async browserSelector(selector) {
          const text = await dispatchBrowser(tools, exec, 'browser_get_text', { selector })
          return { text }
        },
      }
    }

    // --- tool -------------------------------------------------------------

    const tool = {
      name: 'completion_gate_check',
      description:
        'Deterministically verify explicit completion conditions and return a machine-readable verification receipt (overall PASS | FAIL | BLOCKED) with per-check expected and observed evidence. Conditions are given inline as "conditions" or read from a JSON file via "conditionsPath" (a JSON array of condition objects; relative paths resolve against the caller cwd). Supported condition kinds: "file" (exists, nonEmpty, minBytes, sha256 of a file), "json_state" (read a JSON state file, select a value by JSON pointer or segment array with { find: {...} } for exact targets, compare with expect via eq|ne), and "browser" (url_matches, visible_text_contains, selector_text — evaluated through the existing dsh-browser bridge). Optional "arm": { denyTools: ["name", ...] } arms the completion guard for this session — until this tool returns overall PASS, calls to the named tools are denied with an explicit reason (note: DSH cannot veto a turn that ends without any tool call; the guard is the narrowest available enforcement and cannot block that exit). Never an LLM judge; a check that cannot be evaluated is BLOCKED, never silently successful.',
      parameters: {
        type: 'object',
        properties: {
          conditions: {
            type: 'array',
            description:
              'Declarative conditions to evaluate. Each item: { id?, kind: "file"|"json_state"|"browser", ...kind-specific fields }. Exactly one of this or conditionsPath must be given. See gate/README.md for the exact schema and examples.',
          },
          conditionsPath: {
            type: 'string',
            description:
              'Path to a JSON file containing the conditions array (relative paths inside it resolve against the caller cwd). The user-editable way to define completion conditions. Exactly one of this or conditions must be given.',
          },
          context: {
            description: 'Optional caller context echoed verbatim in the receipt (e.g. { trial: "t3-01" }).',
          },
          arm: {
            description:
              'Optional enforcement: { denyTools: [toolName, ...] }. Arms the completion guard for this session with that deny list; while the last receipt is not PASS, calls to those tools are denied. Pass an empty array to arm without denying anything.',
          },
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            gate: { type: 'string', required: true },
            version: { type: 'string', required: true },
            overall: { type: 'string', required: true },
            generated_at: { type: 'string', required: true },
            millis: { type: 'number' },
            context: { type: 'json' },
            request_error: { type: 'json' },
            checks: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: { type: 'string', required: true },
                  kind: { type: 'string', required: true },
                  passed: { type: 'json', required: true },
                  blocked: { type: 'boolean', required: true },
                  reason: { type: 'json' },
                  expected: { type: 'string', required: true },
                  observed: { type: 'string', required: true },
                  error: { type: 'json' },
                },
              },
            },
          },
        },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      },
      async execute(args, exec) {
        ensureGuard(exec)
        const receipt = await core.evaluateGate(
          {
            conditions: args.conditions,
            conditionsPath: args.conditionsPath,
            context: args.context === undefined ? null : args.context,
            base: '',
          },
          makeProbes(exec),
        )
        // Enforcement state: every evaluation refreshes the last receipt; a
        // call that carries `arm` (re)arms the guard with its deny list.
        lastOverall = receipt.overall
        if (args.arm !== undefined) {
          armed = true
          denyTools = Array.isArray(args.arm && args.arm.denyTools)
            ? args.arm.denyTools.filter((s) => typeof s === 'string')
            : []
        }
        return receipt
      },
    }

    // --- completion guard ---------------------------------------------------
    // tools.guard is the narrowest completion-enforcement lever current DSH
    // offers: a synchronous per-call denial. It only vetoes tool calls — the
    // "model stops without any tool call" completion exit cannot be vetoed by
    // any current DSH API, and that limitation is documented in gate/README.md.

    function gateGuard(exec) {
      if (!armed || lastOverall === 'PASS') return undefined
      if (exec && denyTools.indexOf(exec.name) !== -1) {
        return (
          'completion_gate: tool "' + exec.name + '" is denied until completion_gate_check ' +
          'returns overall PASS (last receipt: ' + String(lastOverall) + '); run the gate check first'
        )
      }
      return undefined
    }

    // The agent-scoped guard is registered lazily on first execution and must
    // be removed when this plugin stops; ctx.effect owns that disposal.
    ctx.effect(() => () => {
      if (guardDispose !== null) {
        try {
          guardDispose()
        } catch (e) {
          // disposal must never break plugin teardown
        }
        guardDispose = null
      }
    })

    return harness.registerTool(ctx, harness.defineTool(tool))
  },
}
