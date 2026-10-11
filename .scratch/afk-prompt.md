# AFK prompt

Paste everything below the line into a fresh Claude Code session in `~/git/drumba`.

---

Work through the `ready-for-agent` issues under `.scratch/`, in this order, until none is left
that you can do:

1. `.scratch/aufraeumen/issues/` (01, 02)
2. `.scratch/pausen/issues/` (01, 02)
3. `.scratch/auftakt/issues/` (01, 02, 03)

An issue is workable when its `Status:` is `ready-for-agent` and every issue its `Blocked by:`
line names (`NN` is in the same directory, `<dir>/NN` in another) is `done` or
`ready-for-human`. Read `AGENTS.md`, `CODING_STANDARDS.md`, `GLOSSARY.md`, `docs/adr/` and the
issue's `spec.md` before the first issue, and the spec again before each issue of a new
feature.

For each issue:

1. Implement exactly what the issue and its spec ask. Nothing from "Out of Scope".
2. Make `npm run check` pass.
3. For a visual issue: start `npm run dev`, take a Playwright screenshot of the affected Vers,
   render the named original (`qlmanage -t -s 2400 -o <scratchpad> <file>.pdf`, then
   `sips -c … --cropOffset …` on one Takt and `sips -Z 1400`), compare them yourself, and fix
   what differs. Save both images in the feature's `.scratch/<feature>/` directory.
4. Have a fresh-context subagent review the uncommitted diff against `CODING_STANDARDS.md`,
   `AGENTS.md` (especially "the layout decides where every mark sits") and the spec. Fix what
   it finds that is right; note what you reject and why.
5. Set the issue's `Status:` as the issue says — `done` for internal issues, `ready-for-human`
   for visual or audible ones — and append under `## Comments` a dated note: the commit subject, the
   screenshot paths, anything that departs from the spec, and loose ends.
6. Commit to `main` with a short imperative message in the style of `git log` (e.g. "Draw
   Pausen below the Notenlinie"). One commit per issue, including the issue file's status
   change. No `Co-Authored-By` line. Never push.

When you hit a question about the domain or the notation that the spec, glossary and ADRs do
not answer: do not guess, and do not add terms to `GLOSSARY.md`. Write the question under the
issue's `## Comments`, set `Status: needs-info`, keep its unfinished code out of `main`
(stash or discard it, noting which), and continue with the next workable issue. Issues blocked
by a `needs-info` issue stay untouched.

Never close a spec (`spec.md` stays `ready-for-agent`); the user closes it after checking.

When nothing workable is left, write `.scratch/afk-report.md`: per issue, its final status and
commit, what to look at or listen to, every `needs-info` question, and every departure from a
spec. Then stop.
