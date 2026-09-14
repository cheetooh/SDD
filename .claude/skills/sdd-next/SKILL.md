---
name: sdd-next
description: Run the project's autonomous Spec-Driven Development lifecycle for the next incomplete roadmap feature, from specification through implementation, independent validation, fix loops, and final independent review. Use only when explicitly invoked by the user to start the next SDD development cycle.
disable-model-invocation: true
argument-hint: '[optional scope hint or roadmap item]'
---

# SDD Next

Run the next autonomous Spec-Driven Development cycle for this repository.

Treat `.claude/rules/autonomous-sdd.md` as the authoritative workflow policy. Read it before starting if it is not already in context.

Use the custom subagents under `.claude/agents/` as the execution roles:

- `sdd-spec` — discover and specify
- `sdd-decide` — decide the questions that arise, and approve the specification
- `sdd-implement` — implement approved scope
- `sdd-validate` — independently validate and record evidence
- `sdd-fix` — repair concrete in-scope defects
- `sdd-review` — independently review the validated change

If `$ARGUMENTS` is non-empty, treat it only as a scope hint. Verify it against `specs/roadmap.md`, the repository, and the SDD rules rather than treating it as permission to bypass the specification phase.

## Timing

Keep a wall-clock log in `$(git rev-parse --git-dir)/sdd-next-timing.log`. It lives inside `.git/`, so it is never committed, and it survives `/clear`, context compaction, and a resumed session.

Append one line per event — epoch seconds, UTC time, event:

```sh
printf '%s %s %s\n' "$(date +%s)" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "<EVENT>" >> "$(git rev-parse --git-dir)/sdd-next-timing.log"
```

Events, in order:

- `START` — the first action of the cycle, before anything in Start;
- `SPEC-DONE`, `IMPLEMENT-DONE`, `VALIDATE-DONE`, `REVIEW-DONE` — at each main phase transition;
- `BLOCKED` and `RESUMED` — around any `ACTION REQUIRED` wait, so time spent waiting on the owner is counted separately;
- `END` — immediately before the final report.

The run is the lines from the last `START` to its `END`. Compute every duration from their epoch seconds, never from memory.

## Start

Before anything else, append the `START` line (Timing).

1. Confirm the repository contains the SDD prerequisites:

   - `specs/roadmap.md`
   - `specs/mission.md`
   - `specs/tech-stack.md`
   - `.claude/rules/autonomous-sdd.md`
   - the required `sdd-*` subagents

2. Inspect the current Git branch and working tree before changing anything.
3. If unrelated uncommitted changes could be overwritten, confused with this feature, or invalidate safe isolation, stop and explain the conflict. Do not discard or modify unrelated work.
4. Invoke `sdd-spec` for the next incomplete roadmap phase, including `$ARGUMENTS` as an optional hint when supplied.

## Decision gate

If `sdd-spec` returns unresolved decisions, do not guess and do not ask the user.

Invoke `sdd-decide` with them, grouped under Requirements, Plan, and Validation, and pass its rulings to `sdd-spec` to finalize the feature specification.

Then invoke `sdd-decide` to approve the specification. On `CHANGES REQUIRED`, return the list to `sdd-spec` and ask again.

Do not continue until `sdd-decide` returns `SPEC APPROVED`.

## Autonomous execution

Continue without asking for permission between already-authorized phases:

1. Invoke `sdd-implement`.
2. When implementation completes, invoke `sdd-validate`.
3. If validation reports an in-scope defect, invoke `sdd-fix` with the concrete failure evidence, then invoke `sdd-validate` again.
4. Repeat Fix → Validate until every executable technical check passes or an action only a human can take blocks progress.
5. Invoke `sdd-review` only after technical validation passes.
6. If review finds a concrete in-scope defect, invoke `sdd-fix`, then `sdd-validate`, then rerun `sdd-review` for the affected change.
7. Continue until the review reports no unresolved in-scope defects.

Any decision that arises at any step — including a check no agent can execute — goes to `sdd-decide`. Record the ruling where it says, then continue.

Run dependent agents sequentially. Never run multiple code-writing agents concurrently against the same working tree.

## Progress visibility

Maintain a visible task list for the SDD lifecycle.

At the start of the workflow, create these tasks:

1. SPEC — discover and specify
2. IMPLEMENT — build approved scope
3. VALIDATE — independent technical validation
4. REVIEW — independent final review
5. HUMAN REVIEW — waiting for user review

Only one main lifecycle phase should normally be in progress at a time.

Update task status whenever a phase starts or completes.

For decisions and defect loops, create temporary child tasks such as:

- DECIDE — <short question>
- FIX — <short defect description>
- REVALIDATE — <affected checks>

Complete or close those tasks once resolved.

At every main phase transition, send one concise progress update in the main
conversation using this format:

`[SDD <phase>/5] <PHASE> — <status>`

Examples:

`[SDD 1/5] SPEC — analysing roadmap and existing implementation`

`[SDD 1/5] SPEC — 2 decisions ruled by sdd-decide; specification approved`

`[SDD 2/5] IMPLEMENT — complete; starting independent validation`

`[SDD 3/5] VALIDATE — 8/10 checks passed; fixing 1 defect`

`[SDD 4/5] REVIEW — clean`

Do not emit progress messages for every tool call. Report meaningful phase
transitions, rulings, defects, blockers, and major validation milestones.

## Attention required

Only when an action only a human can take blocks progress — `sdd-decide` returned `BLOCKED — HUMAN ACTION` — stop autonomous progression and make the
request unmistakable.

Begin the message with:

`ACTION REQUIRED`

Then state:

**Current phase:** <phase>

**Blocked by:** <specific action>

**Why I cannot continue safely:** <brief explanation>

**Recommended action:** <recommended choice>

**Alternatives:** <only when materially relevant>

**What happens after your answer:** <next autonomous step>

Use `AskUserQuestion` only to ask for that action. Product, requirements, plan, validation, and scope decisions go to `sdd-decide`.

Never use `ACTION REQUIRED` for informational updates.

Do not request attention merely because a phase completed.

## Completion visibility

When autonomous work reaches the human-review boundary, update the lifecycle
tasks so that:

- SPEC = completed
- IMPLEMENT = completed
- VALIDATE = completed
- REVIEW = completed
- HUMAN REVIEW = pending

Finish with:

`READY FOR HUMAN REVIEW`

## Invariants

Maintain these rules throughout the cycle:

- `requirements.md` is the contract.
- `plan.md` is the implementation strategy.
- `validation.md` is the proof.
- Requirements take precedence over the plan.
- Validation must prove requirements, not merely confirm plan completion.
- Preserve historical validation evidence.
- Tick technical checks only after execution and observation of the expected result.
- Never weaken requirements, tests, security controls, or acceptance criteria to obtain a pass.
- Do not create unrelated refactors, cleanup, abstractions, dependencies, or features.
- Do not ask the user to run commands or obtain output Claude Code can obtain itself.
- Do not ask the user a question `sdd-decide` can rule on.

## Human control boundary

Do not perform or mark complete unless the user explicitly instructs it:

- human review approval
- human approval checklist items
- an amendment to `specs/mission.md`
- a commit to, push to, or merge into `main`
- opening, merging, or closing a pull request
- force-push, rebase, or any rewrite of pushed history
- branch deletion or tags
- release
- deployment
- roadmap phase completion

Do not impersonate human approval.

Commits and pushes to the feature branch are the orchestrator's, at the checkpoints `.claude/rules/autonomous-sdd.md` (Git on feature branches) names. Finish with the branch pushed and the working tree clean.

## Stop conditions

Stop only when either:

1. an action only a human can take blocks progress; or
2. implementation is complete, all executable technical validation passes, every check no agent can execute has a ruling, required final automated checks pass, and independent review has no unresolved in-scope defect.

For a blocker, complete all independent work first, then state exactly what human action is required and why.

For successful completion, finish with exactly these sections:

### Implemented

Summarize what changed.

### Validated

Summarize what passed and how it was checked.

### Fixed

Summarize defects discovered and corrected. State `None` if no defects were found.

### Decisions

List every `sdd-decide` ruling — those marked for owner attention first — with its confidence and where it is recorded. State `None` if there were none.

### Remaining

List anything unexecuted, deferred, or unresolved. State `None` when nothing remains.

### My actions

Review this summary and the rulings; mark the phase complete in `specs/roadmap.md`; open the pull request and merge it.

### Duration

From the timing log: the start and end times, the total wall-clock time from `START` to `END`, each phase's share (Spec, Implement, Validate, Review), and any time spent waiting on the owner (`BLOCKED` to `RESUMED`).

End with:

`READY FOR HUMAN REVIEW`
