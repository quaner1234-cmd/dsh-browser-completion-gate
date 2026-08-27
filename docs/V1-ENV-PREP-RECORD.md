# V1 Environment Preparation — dsh-browser pinned-normalization record

Date: 2026-08-27 · Milestone: `docs/TASK.md` → "Experiment V1 environment preparation"
Authoritative target: `docs/EXPERIMENT-V1.md` pinned commit.

PASS for this milestone = exact dependency commit recorded, no unexplained local
diff, successful build, relevant tests passing (per `docs/VERIFY.md`), with
runtime browser verification explicitly deferred to a human-triggered step.

## 1. Pinned target state (now installed)

- Upstream: `Lum1104/dsh-browser`, commit
  `122de0e45ee97cba3428920d3d48b16e646b6db4`
  ("Merge pull request #52 … allow-new-session-while-working") — verified to be
  upstream `main` HEAD via `git ls-remote`.
- Installed as a **full git clone at the pinned SHA** at
  `~/.dsh/dsh-browser` (provenance: `git rev-parse HEAD` = pinned SHA, `git status`
  clean). The `.managed-by-install-sh` installer marker is recreated and excluded
  via the clone's own `.git/info/exclude`, so the tree is provably clean.
- Registration untouched: `~/.dsh/profiles/web/package.json` `dsh.profile.bundles`
  still lists `@deepseek-ai/dsh-bridge-browser`, resolved through the unchanged
  symlink `profiles/web/node_modules/@deepseek-ai/dsh-bridge-browser` →
  `~/.dsh/dsh-browser/packages/browser/bridge-browser`. Node resolves by path
  (directory + `main`/`exports`), so the upstream package rename does not break
  next-boot loading (see §6).

## 2. Previous state (recorded before the change)

- `~/.dsh/dsh-browser` was a managed, **git-less tarball install**
  (`scripts/install.sh`, marker present), based on upstream main commit
  `a817c300b24cc106ef2c9dd73843a0c18cc568b7` (2026-08-14) — per the freeze record
  in `POST-RESTART-VERIFICATION.md`.
- **One local delta**: `packages/browser/bridge-browser/src/tools.ts`
  (schema-normalization workaround, modified 2026-08-26 21:41; `lib/index.js`
  rebuilt 21:42). Re-verified today by diffing the live tree against a fresh
  clone of the pinned commit: apart from that file, the live tree differed from
  upstream only by generated artifacts (`lib/`, `dist/`, local `coverage/`
  html from vitest runs) and the installer marker. No other local-only files.
- Chrome extension copy `~/.dsh/browser-extension`: built 2026-08-15 (version
  0.1.0, name "dsh 浏览器助手"), loaded in Chrome but never reloaded since.

## 3. What upstream moved between the old base and the pin

- Bridge package **renamed** `@deepseek-ai/dsh-bridge-browser` 0.0.1 →
  `@yuxianglin/dsh-bridge-browser` 0.0.3; deps narrowed to `@deepseek-ai/schemastery`
  + `ws` at runtime; official `defineTool()`-based schema normalization
  (supersedes the local `src/tools.ts` workaround — the obsolete local diff is
  discarded by design).
- Per-session architecture: new `browser-context.ts`, `session-purge.ts`,
  `session-workspace.ts`, `session-deferral.ts` layers (PR #52 tab affinity).
- Extension: 0.1.0 → **0.1.2**, `_locales` i18n (en/zh_CN/zh_TW), new permissions
  `webNavigation` + `notifications`, `all_frames: true`,
  `match_origin_as_fallback: true`, approval coordinator, session continuity,
  tab-affinity, selection, transient events, Firefox manifest.
- Root workspace: `dsh-browser` 0.1.2 with `@deepseek-ai/dsh` 0.1.1-rc.1 pinned.
- install.sh gained `scripts/install.ps1`; repo gained `benchmark/`, `.github/`.

## 4. Build & tests (pinned tree, staged at /tmp then swapped in)

Commands: `corepack pnpm install --frozen-lockfile` (pnpm 11.7.0), then
`pnpm --filter @yuxianglin/dsh-bridge-browser run build`,
`pnpm --filter dsh-browser-extension run build`, then each filter's `test`
(vitest run). Logs: `/tmp/dshb-pinned-build2.log`.

- Bridge build: `tsc -b` + tsdown → `lib/index.js` **48.28 kB** (was 36.28 kB),
  `lib/protocol.js`, `lib/invariant.js`.
- Extension build: vite → `dist/background.js` 162.05 kB, `dist/content.js`
  21.68 kB, `dist/panel/` (index 407.59 kB), `_locales` (en, zh_CN, zh_TW).
- Bridge tests: **11 files / 111 tests passed** — incl. `composition.spec.ts`
  (boots the bridge, real-socket auth, real gateway RPCs, tool registration),
  `tools.spec.ts` (12), `server.spec.ts` (41), tab-affinity layers
  (`browser-context` 5, `session-deferral` 11, `session-workspace` 6,
  `session-purge` 10).
- Extension tests: **43 files / 302 tests passed** — incl. `tab-affinity.spec.ts`
  (10), `background-tab-affinity-rebind.spec.ts` (4), `authorization.spec.ts` (7),
  `approval-coordinator.spec.ts` (4), `session-continuity.spec.ts` (5), i18n (4).
- Total: **413 tests passed, 0 failed.**
- e2e `bridge-extension.e2e.spec.ts` (1 test): **self-skipped** — "no usable
  Chromium (set PLAYWRIGHT_CHROMIUM_PATH or install playwright chromium)". Same
  environment limitation as the V0 freeze (e2e also skipped there). Note:
  `~/Library/Caches/ms-playwright/chromium-1148` exists but the pinned
  playwright-core does not treat it as usable.

## 5. Expected browser tool count (pinned source)

**11 browser_* tools**, from `src/tools.ts` `defineTools()` assembly:
`browser_snapshot`, `browser_click`, `browser_type`, `browser_press`,
`browser_scroll`, `browser_navigate`, `browser_back`, `browser_forward`,
`browser_reload`, `browser_get_text`, `browser_wait` — corroborated by
`composition.spec.ts` registration assertions. New capability: `frame` parameter
on `browser_snapshot`/`browser_get_text`/`browser_wait` (iframes).

## 6. Remaining local diff & intentional divergence

- After swap: `git status` clean at the pinned SHA (marker excluded as above).
- No obsolete local workaround remains (upstream official normalization wins).
- Intentional, documented divergences from a plain upstream checkout:
  1. `.managed-by-install-sh` marker (managed-install convention, excluded from
     status);
  2. old managed workspace preserved on disk at
     `~/.dsh/dsh-browser.prev-2026-08-27` (evidence/reversibility);
  3. old extension copy preserved at `~/.dsh/browser-extension.prev-2026-08-27`;
  4. profile registration (bundles list + symlink name) still uses the old
     package name `@deepseek-ai/dsh-bridge-browser` — functionally valid because
     Node resolves the bundle by path through the symlink and reads the pinned
     package's `main`/`exports`.

## 7. Runtime status & Human Gate (per docs/TASK.md)

The running DSH process (PID 876, booted 2026-08-27 20:46) is **unchanged** and
still serves the old in-memory bridge build (`/ext/bridge-config` verified
HTTP 200 with `wsUrl` after the swap; no dynamic imports in the old lib, so the
on-disk swap cannot perturb it). Browser_* tools keep working this session from
the old build.

Human-triggered runtime verification, in order (all forbidden to me this
milestone):

1. Restart DSH: `~/.dsh/start-dsh.sh` → next boot mounts the pinned bridge via
   the unchanged registration; verify `GET /ext/bridge-config` = 200 and
   `Tool.listTools` shows the 11 `browser_*` tools.
2. `chrome://extensions` → **Reload** "dsh 浏览器助手" → loads the pinned 0.1.2
   build now on disk at `~/.dsh/browser-extension`; verify the panel connects
   (hello → hello.ok with `~/.dsh/ext-bridge-token`).
3. Optional: re-run the canonical registration for the new package name —
   `dsh plugin --profile web add "@yuxianglin/dsh-bridge-browser@link:$HOME/.dsh/dsh-browser/packages/browser/bridge-browser"`
   (or full `./scripts/install.sh`) — refreshes profile bookkeeping; not
   required for loading.
4. Verify the `docs/EXPERIMENT-V1.md` control invariants (session-scoped tab
   ownership, fail-closed retargeting) before any V1 trial collection.
5. Optionally run the e2e spec with a usable Chromium to cover
   extension→bridge→tools chain:
   `pnpm --filter @yuxianglin/dsh-bridge-browser exec vitest run tests/e2e/bridge-extension.e2e.spec.ts`.

V0 evidence (`results/baseline.*`, `POST-RESTART-VERIFICATION.md`,
`~/.dsh/dsh-browser.prev-2026-08-27`, `~/.dsh/browser-extension.prev-2026-08-27`)
is preserved untouched.
---

# Addendum — Runtime verification round 1 (2026-08-28 00:06 CST)

Status: **BLOCKED** (runtime chain not yet on the pinned build; one human
Chrome-GUI action + one real DSH restart required).

## Evidence

1. `/ext/bridge-config` → HTTP 200, `{"wsUrl":"ws://127.0.0.1:3080/ext/bridge"}`.
2. **The claimed DSH restart did not take effect**: sole listener on 3080 is
   PID 876 booted `2026-08-27 20:46:02` — BEFORE the 23:44 pinned swap.
   `launcher.log` shows the 23:52:14 `start-dsh.sh` attempt exited via
   "already listening" (the script never restarts a busy port).
3. `Tool.listTools` (authoritative): **all 11 browser_* tools registered**, but
   with the OLD build schemas (no `frame` parameter; old Chinese descriptions) —
   confirming the pre-pin in-memory build is still serving.
4. Parameterized call `browser_snapshot` → **error "no browser extension is
   connected to the bridge"**. Root-caused from the pinned extension source:
   the new extension is designed to never probe/claim the bridge until the
   side panel is opened (`background/index.ts:7`; discovery loop gated on
   `panelPorts.size > 0`, lines 925/973) — expected behavior after a reload
   without opening the panel.
5. Bridge WS layer itself is healthy: token hello with the canonical caps →
   `hello.ok` accepted (session/subscribed events streamed). My first probe
   got `1008` only because its caps were incomplete.
6. Per-session tab affinity: **NOT live at runtime** (old bridge in memory).
   Pinned-code evidence stands: 413 tests passed incl. tab-affinity (10),
   rebind (4), session layers (44).
7. Re-registration with the new package name: NOT required so far — the bundle
   entry + symlink resolve the pinned package by path; all pinned lib runtime
   imports (schemastery, ws, dsh-host-apiproxy, dsh-home-paths) resolve from
   the pinned node_modules. Definitive proof arrives only at the next real boot.
8. Dedicated Chrome profile: not needed for this round; required (human setup)
   before any formal V1 trial, per `docs/EXPERIMENT-V1.md`.

## Human actions required before re-verification

1. Open the "dsh 浏览器助手" side panel in Chrome once (extension icon) —
   the new design requires it to claim the bridge connection.
2. Really restart DSH: `kill 876` then `~/.dsh/start-dsh.sh` (a plain
   `start-dsh.sh` run will again hit "already listening").
3. After restart: re-run this verification round — expect new schemas with
   `frame` params, panel-connected parameterized tools, then the
   per-session tab-affinity checks (possibly with the dedicated profile,
   human-set-up, before any trial).

---

# Addendum 2 — Runtime verification round 2 (2026-08-28 ~00:40 CST)

Status: **BLOCKED** (one human Chrome-GUI action pending; everything else verified).

## Evidence

1. **Process**: PID **12865** (node …/.bin/dsh web --no-open), started
   **2026-08-28 00:34:20** — a real restart AFTER the 23:44 pinned swap
   (launcher.log shows actual spawns at 00:30:34 and 00:34:20; earlier 23:52
   attempt had hit "already listening").
2. **/ext/bridge-config**: HTTP 200, `{"wsUrl":"ws://127.0.0.1:3080/ext/bridge"}`.
3. **Pinned bridge live in the runtime**: `Tool.listTools` schemas now match
   the pinned `src/tools.ts` verbatim (new English descriptions +
   UNTRUSTED_CONTENT_WARNING; `frame` params on click/type/press/scroll/
   get_text/wait; snapshot keeps only delta/region per source). Previous round
   these were the old Chinese schemas without `frame`.
4. **Registration**: bundles list = `@yuxianglin/dsh-bridge-browser`
   (`@deepseek-ai/dsh-bridge-browser` entry removed); scoped symlink
   `profiles/web/node_modules/@yuxianglin/dsh-bridge-browser → …/dsh-browser/
   packages/browser/bridge-browser` (built lib present). Leftover: the old
   `@deepseek-ai/dsh-bridge-browser` symlink still exists on disk (8/15) but is
   no longer referenced — dormant, harmless.
5. **11 browser_* tools**: all registered (snapshot/click/type/press/scroll/
   navigate/back/forward/reload/get_text/wait).
6. **Parameterized call** `browser_snapshot` → **fail-closed error**:
   `content-unavailable: "The controlled tab was closed. Select the current
   page in the side panel before retrying."` This string exists ONLY in the
   pinned extension (`background/index.ts:659`; panel strings.ts:256
   `lostTitle`), 0 occurrences in the old builds — i.e. the per-session
   controlled-tab gate is LIVE and refused to silently fall back.
7. **Extension is connected**: the reply came from the extension's tool
   dispatch (a broken chain would yield "no browser extension is connected").
8. Tab-affinity mechanism verified reachable; full multi-session invariant set
   (two sessions/two tabs, no retarget on focus switch, SW-restore, tab-close
   fallback) belongs to the controlled environment step with the dedicated
   execution profile (per `docs/EXPERIMENT-V1.md`).

## Pending human action (GUI)

In the open dsh side panel, select the current page for this session (the
panel tab-handoff prompt shows the lost controlled tab; reselect the target
page), then say continue. No restart/reload needed.
