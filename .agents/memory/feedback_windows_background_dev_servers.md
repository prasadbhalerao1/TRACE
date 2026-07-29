---
name: windows-background-dev-servers
description: How to start long-lived dev servers (uvicorn/next dev) on this machine so they stay trackable and killable
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 16352565-6648-4267-adde-3cdec207f5a5
  modified: 2026-07-29T09:28:59.994Z
---

On this user's Windows machine, starting a long-lived dev server (uvicorn, `npm run dev`) by
backgrounding it with shell `&` inside a Bash tool call — especially combined with `disown` or
trailing commands after it (`sleep; cat log; echo done`) — causes the wrapper script to finish and
get marked "completed" by the harness, while the actual server process keeps running fully detached
and orphaned. That process is then unkillable via `TaskStop` (harness no longer tracks it once its
wrapping task shows completed) and often invisible to `Get-Process`/`tasklist` by its own PID (only a
child worker process, one level down, actually shows up — e.g. uvicorn `--reload`'s reloader parent
PID disappears from view but its spawned worker child is still findable via
`Get-CimInstance Win32_Process | Where-Object CommandLine -like '*<port>*'`, and its `ParentProcessId`
points back to the vanished reloader PID).

**Why:** confirmed by running into it twice in one session — an orphaned uvicorn kept serving stale
code on port 8000, couldn't be found by PID via `Get-Process`/`tasklist`/`taskkill`, only turned up by
searching all processes' `CommandLine` for the port number and killing the child (not the parent) PID.

**How to apply:** to start a dev server that stays managed, pass `run_in_background: true` on the
Bash/PowerShell tool call with the server command as the *entire* command — no trailing `&`, no
`disown`, no follow-up commands in the same call. That keeps the harness's own background-task
tracking (and `TaskStop`) actually pointing at the live process. If a server is ever suspected stale
(edited code but no reload log line appeared — this repo's uvicorn `--reload`/WatchFiles did not
reliably log or perform reloads in this environment even though `next dev`'s Turbopack watcher did),
don't trust `Get-Process`/`tasklist` on the PID reported in the startup log alone — search
`Get-CimInstance Win32_Process` for the port number in `CommandLine` to find the real worker PID.
