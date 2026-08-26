# POST-RESTART VERIFICATION — Browser Completion Gate (bridge pre-flight)

Date: 2026-08-26 (evening) · Verifier session: `session-78a50634-4bad-4eeb-be3e-cbaf8799a704`
Scope: verification only — Browser Completion Gate NOT implemented.

## VERDICT: FAIL (success condition unmet)

Required for PASS: browser_* tools present AND ≥1 real browser tool call succeeds end-to-end.
Actual: 0 browser_* tools; bridge route absent; smoke test impossible. Root-caused below.

## Checklist results (evidence, not assumptions)

### 1. bridge-browser plugin loaded in running process? — ❌ NO
- Host `Tool.listTools` (authoritative): tool list contains **zero** `browser_*` tools
  (only harness core tools: bash/read/write/edit/glob/grep/cordis_*/…).
- `cordis_inspect_self()` → `plugins: []` (no dynamic plugins; static-row absence corroborated by 2–4 below).
- Root cause (timing): running web process PID **1089** started **2026-08-26 19:06:05**
  (`ps -p 1089 -o lstart=`), but the registration that declares the bundle —
  `~/.dsh/profiles/web/package.json` (`dsh.profile.bundles` includes
  `"@deepseek-ai/dsh-bridge-browser"`) — was modified **2026-08-26 20:40:37**, i.e. AFTER boot.
  `pnpm-lock.yaml` also 20:40:34. `launcher.log`: last real start 19:06:05 ("ready after 7s");
  the 20:59:39 invocation hit "already listening" and did NOT restart. The process predates its own registration.

### 2. /ext/bridge-config returns successfully? — ❌ NO
- `curl http://127.0.0.1:3080/ext/bridge-config` → **HTTP 404**.
- Route owner confirmed: `@deepseek-ai/dsh-bridge-browser/lib/index.js` registers
  `BRIDGE_CONFIG_PATH = "/ext/bridge-config"` and upgrade route `/ext/bridge`; the core checkout
  has no such string. 404 ⇔ plugin not mounted.

### 3. browser_* tools visible to model? — ❌ NONE
- `Tool.listTools` full enumeration returned ~35 harness tools, none matching `browser_*`.

### 4. Chrome extension "dsh 浏览器助手" enabled & connected? — ⚠️ INSTALLED but DISABLED
- Chrome Default profile `Secure Preferences` entry: id `ggplmkikidcibahlddkghkomkldpacce`,
  path `/Users/jinronghuan/.dsh/browser-extension`, location 4 (unpacked),
  **`disable_reasons: [1]` → disabled by user action**. Manifest on disk: name "dsh 浏览器助手",
  version 0.1.0, MV3, side panel + tabs/scripting permissions.
- Connected: impossible — the WS endpoint `/ext/bridge` does not exist yet (plugin unmounted).
- Self-heal behavior verified from `background.js`: probes `http://127.0.0.1:{3080,3081,3090}/ext/bridge-config`,
  reads `wsUrl`, connects with bearer token (`~/.dsh/ext-bridge-token`, present, chmod 600),
  `hello`→`hello.ok` handshake, keepalive alarm every 0.5 min, exponential backoff reconnects.
  ⇒ once (a) bridge mounts and (b) extension is re-enabled, connection resumes automatically.

### 5. End-to-end smoke test — ⛔ BLOCKED (no tool exists to call)

## Bundle health check for next boot — ✅ READY
- Entry built: `…/bridge-browser/lib/index.js` (Aug 15); symlink
  `profiles/web/node_modules/@deepseek-ai/dsh-bridge-browser -> ~/.dsh/dsh-browser/packages/browser/bridge-browser`.
- All runtime imports resolvable from the package dir:
  `node_modules/@deepseek-ai/{dsh-host-apiproxy,dsh-home-paths,schemastery,…}`, `ws` ✓.

## Remediation
1. AUTONOMOUS (scheduled by verifier): detached script kills PID 1089 after 120 s grace
   (lets this report flush) and reruns `~/.dsh/start-dsh.sh` ⇒ new process mounts the
   bridge bundle ⇒ expect HTTP 200 on `/ext/bridge-config` and browser_* tools present.
   Log: `/tmp/dsh-verify-restart.log`.
2. MANUAL (user, one toggle): chrome://extensions → enable **“dsh 浏览器助手”**
   (currently disabled, disable_reasons=[1]). Cannot be automated from here.
3. RE-VERIFY afterwards: curl bridge-config (expect 200 + wsUrl), Tool.listTools (expect browser_*),
   then one real snapshot/click smoke test on a public page.
