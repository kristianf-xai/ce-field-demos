# Pre-flight subagent — track dependency checks

Chat prompt (after this lands):

```
preflight-checker track 201
```

or, if the track is missing from the request:

```
preflight-checker
```

Coordinator / presenter behavior: invoke before a track session (or before a section that needs MCP). Do not treat this agent as a start or reset skill.

## Goal

Add a project subagent that **only checks** whether the machine and account are ready for a named demo track (`101`, `201`, or `301`). It always requires a track identifier. It reports pass / fail / blocked per dependency. It does **not** install packages, seed, start the server, stage Linear, authenticate MCP, or edit product code unless a later request explicitly asks for a fix.

Catalog stays Starter $49 / Growth $99 / Scale $249. Operator Avery Quinn. No real customers.

## Why a subagent (not a skill)

| Option | Fit |
| --- | --- |
| Skill under `.cursor/skills/preflight-track/` | Good for "how to start," but skills are usually followed by the parent agent and tend to mutate state (`start-ledgerly`, `stage-linear`). |
| **Project agent** `.cursor/agents/preflight-checker.md` | Matches `change-reviewer`: narrow role, fixed report shape, invoked by name, `readonly: false` so shell probes can run, prompt still forbids edits. **Choose this.** |
| Script in `scripts/` | Useful later for CI-style checks; out of scope for the first cut. Agent can shell out for local checks. |

## Behavior contract

### 1. Always ask for the track

Before any check:

1. If the invocation includes exactly one of `101`, `201`, `301` (as `track 201`, `track=301`, or a lone track id), pin that track.
2. Otherwise **stop and ask**: `Which track should I preflight: 101, 201, or 301?`
3. Do not infer the track from the Canvas sidecar, open browser tab, last chat, or `runbooks.html` query string.
4. Reject any other id. Do not invent a fourth track.

Optional features on 301 (Cloud Agents, Projects, Bugbot, Reviewer automation, etc.) are **not** a second identifier. After the track is pinned, list optional-feature deps separately as `optional` — never block the whole track on an unchecked optional feature unless the operator named that feature in the request.

### 2. Shared baseline (every track)

Run these for `101`, `201`, and `301`:

| Check | How | Pass when |
| --- | --- | --- |
| Node deps | `test -d node_modules` (and package presence for `next`, `prisma`) | `node_modules` present |
| Prisma client | Probe only — e.g. `node -e "require.resolve('@prisma/client')"` or an import check. Do **not** run `npx prisma generate`. | `@prisma/client` resolves; remediation may name `npx prisma generate` without running it |
| SQLite seed | same probe as `start-ledgerly` (`customer.count()` via `tsx`) | `seeded` (count > 0) |
| Dev server | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:43173` | 2xx/3xx |
| Shipped suite shape | `npm test` (or vitest summary) | **1 failed / 42 passed**; sole red file `tests/suggested-credit-api.test.ts` |
| Planted demo error | GET dispute page or suggested-credit v1 path for `dsp_1043` when server is up | Suggested credit still shows the v1 $400 claim (do not "fix" it) |
| Empty project MCP map | read `.cursor/mcp.json` | `{}` / no `ledgerly-db`; no `mcp/` directory |
| Project agents present | paths under `.cursor/agents/` | baseline agents exist (see track matrix for which are required) |

Baseline failures are `blocked` for every track. Report the remediation skill or command (`npm i`, `npx prisma db seed`, `start-ledgerly`, `npm run demo:reset`) without running it.

### 3. Track matrices

#### 101 — modes, rules, skills, Figma

| Dependency | Kind | Pass when |
| --- | --- | --- |
| Shared baseline | required | all green |
| Figma MCP | required for MCP / Figma beat | Figma tools discoverable / auth not `needsAuth` |
| Canvas capability | required for Canvas beat | agent can use Canvas (`WriteCanvas` / canvas skill available in environment) — report `unknown` if the subagent cannot probe it, do not fake a pass |
| `choose-cursor-workflow` skill | required | `.cursor/skills/choose-cursor-workflow/SKILL.md` exists |
| `start-ledgerly` skill | required | skill file exists |

Do not require Linear, `stage-linear`, or `plugins/standard-bug-fix` on 101.

#### 201 — context, skills, Linear MCP, parallel agents

| Dependency | Kind | Pass when |
| --- | --- | --- |
| Shared baseline | required | all green |
| Linear MCP | required | Linear tools available; `get_user` / me succeeds; user is not a guest |
| Operator Linear team | required | at least one team on `me` (public or private). If none, `blocked` with the manual team steps from `demo-howto.md` / `stage-linear` — do not create a team |
| `ce-field-demos` board | required for MCP issue beats | project exists on a team the operator belongs to with the three Fieldnote titles (and preferably the nine Collections slices). If missing, report `blocked` and point at `stage-linear` — **do not** run `stage-linear` or guess the team |
| Disk plugin | required for plugin beat | `plugins/standard-bug-fix/` present on disk |
| Resolve-dispute plan | required for parallelize section | `.cursor/plans/resolve-dispute.md` exists |
| `dispatch-subagents` skill | required | skill file exists |
| `ledgerly-reviewer` agent | required | `.cursor/agents/ledgerly-reviewer.md` exists |
| Figma MCP | not required | omit from 201 required list |

Team confirmation rules match `stage-linear`: never assume which team; listing candidates is enough for preflight. Staging is out of scope.

#### 301 — orchestration, review, ownership

| Dependency | Kind | Pass when |
| --- | --- | --- |
| Shared baseline | required | all green |
| Linear MCP **or** repo fallback | required (soft) | Linear works **or** `runbooks/linear-field-demos.ts` is readable. If Linear fails, mark Linear `fail` and fallback `pass` with note to use the repo file — track is not hard-blocked |
| `change-reviewer` agent | required | `.cursor/agents/change-reviewer.md` exists |
| `dispatch-subagents` skill | required | skill file exists |
| Collections issue catalog | required | `COLLECTIONS_COMMAND_CENTER_ISSUES` (or equivalent) present in `runbooks/linear-field-demos.ts` |
| Cloud Agents | optional feature | report as `optional` (or required when the operator named Cloud Agents): environment can hand off / list cloud agents **and** the Cloud Agent network allowlist permits Prisma engine download and Google font files |
| Cloud Agent egress: Prisma + fonts hosts | optional (tied to Cloud Agents) | Effective egress is allow-all, **or** `allowedDomains` includes **all four** exact hosts: `binaries.prisma.sh`, `prisma.sh`, `pris.ly`, and `fonts.gstatic.com`. Probe via `cursor-cloud` `environment-info` → `egress`. Do not print the full domain list. If restricted and any host is missing, fail and list only the missing host(s); remediation: add them to the environment network allowlist (Dashboard → Cloud Agents → environment → network). A prior keyboard-audit run failed without `binaries.prisma.sh` and `fonts.gstatic.com`. |
| Projects / Bugbot / Reviewer automation | optional features | same — never hard-block the track |
| `accessibility-auditor` / manual reviewer | not required pre-session | that file is created mid-track; absence is expected on a clean tree |

### 4. Report shape

Return a short report, no product edits:

1. **Track** — the pinned id.
2. **Ready** — `yes` only when every `required` check for that track passed (optional failures do not flip this to no).
3. **Passed** — check name + evidence (command, path, or tool result).
4. **Blocked / Failed** — check name + evidence + one-line remediation (skill name or doc pointer). Sorted required first, then optional.
5. **Skipped** — checks not applicable to this track.

Do not print secrets, API keys, or full MCP auth payloads. Do not volunteer the filter-pill `state=` seam unless a check somehow lands on that click path.

### 5. Must not

- Edit app code, seed, tests, or suggested-credit client.
- Run `npm run demo:reset`, `stage-linear`, `mcp_auth`, or `npm i` unless the operator explicitly asks to remediate after the report.
- Create Linear teams or projects.
- Add a database MCP or restore `mcp/`.
- Add talk-track / speaker-note skills.
- Soften the planted red test or "correct" `dsp_1043`'s $400 claim.

## Implementation steps (when approved)

1. Add `.cursor/agents/preflight-checker.md` with YAML frontmatter (`name`, `description`, `readonly: false`). `readonly: false` matches `change-reviewer` so baseline shell probes (`test -d`, `node -e`, `tsx` seed probe, `curl`, `npm test`) can run; the agent body must still forbid edits, install, seed, `npm run demo:reset`, `stage-linear`, and `mcp_auth` unless the operator asks to remediate. Instructions encode the ask-for-track gate, shared baseline, three matrices, and report shape above.
2. Register in `runbooks/agents.ts` → `PROJECT_AGENTS` (and thus `runbooks/meta.ts` export).
3. Document in `AGENTS.md` agents table, `README.md` Agents row / table, and a one-line `CHANGELOG.md` Unreleased entry.
4. Point `choose-cursor-workflow` at it in one sentence under each track intro ("Before the session, run `preflight-checker` with the track id") — keep it short; do not add a new runbook beat unless product asks for a Show card.
5. No change to shipped test count. If any doc cites the agent list, keep `tests/runbooks.test.ts` green (it does not currently assert `PROJECT_AGENTS` length; avoid introducing a brittle count unless useful).
6. Do **not** wire auto-invoke into `start-ledgerly` or `reset-demo-state` in the first cut.

## Verify

- Cold invoke with no track → agent asks for `101` / `201` / `301` and runs zero checks.
- `preflight-checker track 101` with server down → Ready no; baseline server check failed; Linear not listed as required.
- `preflight-checker track 201` without Linear auth → Ready no; Linear / team / board called out; remediation points at enable MCP + `stage-linear`.
- `preflight-checker track 301` with Linear down but repo catalog present → Ready yes (or yes with Linear failed + fallback passed); optional Cloud Agents listed separately.
- `preflight-checker track 301` when Cloud Agents is in scope and egress is restricted without any of `binaries.prisma.sh`, `prisma.sh`, `pris.ly`, or `fonts.gstatic.com` → that optional check fails and lists the missing host(s); Ready still yes unless the operator required Cloud Agents. Remediation names the dashboard network allowlist, not a code change.
- `preflight-checker track 301` when the allowlist includes the three Prisma hosts plus `fonts.gstatic.com` (or egress is allow-all) → Cloud Agent egress check passes. Note: this repo’s current environment may still omit `fonts.gstatic.com`; treat that as a real fail for the optional check until the dashboard allowlist is updated.
- `ledgerly-reviewer` on the doc/agent diff — catalog, seed, and planted seams untouched.

## Out of scope

- New runbook beats or Canvas cards for preflight.
- A `scripts/preflight.ts` CLI.
- Auto-remediation.
- Fourth catalog price, ticket board, or SQLite MCP.

## Implementation files (when approved)

| File | Change |
| --- | --- |
| `.cursor/agents/preflight-checker.md` | **New** — agent instructions |
| `runbooks/agents.ts` | Register agent |
| `AGENTS.md` | Agents table row |
| `README.md` | Agents listing |
| `CHANGELOG.md` | Unreleased note |
| `.cursor/skills/choose-cursor-workflow/SKILL.md` | One-line pointer per track (optional but recommended) |
| `.cursor/plans/preflight-subagent.md` | This plan (already here) |
