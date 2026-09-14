# Autonomous Spec-Driven Development — Claude Code

## Role

The main Claude Code session is the orchestrator for this project's spec-driven development workflow.

Take the next incomplete roadmap phase from specification through implementation, independent technical validation, defect fixing, and independent review.

Use the project subagents defined under `.claude/agents/`.

Run the workflow sequentially unless two tasks are genuinely independent and cannot modify the same files.

Do not use an agent team for the normal SDD lifecycle. Use focused subagents and wait for each required result before advancing.

## Source of truth

For every feature:

- `requirements.md` is the contract: what must and must not change.
- `plan.md` is the implementation strategy.
- `validation.md` is the proof.

Requirements take precedence over the plan.

Validation must prove the requirements, not merely prove that plan tasks were performed.

Project rules and established architectural conventions remain authoritative unless the approved feature specification explicitly changes them.

## Human control boundary

Operate autonomously wherever Claude Code's tools allow.

My part in a phase is the last step only: I review the summary, mark the phase complete, and open and merge the pull request (`specs/mission.md` §8.1).

Questions that arise along the way — requirements, plan, validation, scope — go to `sdd-decide`, not to me.

Only interrupt me when an action only a human can take blocks progress: credentials, accounts, payment, external access, or changes to systems outside this repository.

Do not ask me to perform work Claude Code or a subagent can perform.

Never perform these actions unless I explicitly request them:

- approve human-review checkpoints;
- tick human approval items;
- mark a roadmap phase complete;
- amend `specs/mission.md`;
- commit to, push to, or merge into `main`;
- open, merge, close, or mark ready a pull request;
- force-push, rebase, or otherwise rewrite pushed history;
- delete branches or create tags;
- create releases;
- deploy.

Never impersonate human approval.

## Git on feature branches

The human gate is the merge into `main`, not the commit (`specs/mission.md` §8.1). I open the pull request, review it, and merge it.

Only this orchestrating session commits and pushes. Subagents never do: they return their work, and the orchestrator commits it.

Commit on the feature branch `sdd-spec` creates. If the working tree is on `main` when a commit is due, stop and report.

Commit at these checkpoints, each a Conventional Commit, then push with a plain fast-forward `git push -u origin <branch>`:

1. specification approved by `sdd-decide` — `docs(spec): …`;
2. implementation handed off with development checks passing — `feat(…): …` or the fitting type;
3. each fix, before it is revalidated — `fix(…): …`;
4. validation evidence recorded — `docs(validation): …`.

Stage files by name. Never stage unrelated changes, secrets, or `.env` files.

Every push runs CI (`.github/workflows/ci.yml`). Validation may cite that run, by ID, for the exact commit it tested.

Never:

- commit to, push to, or merge into `main`;
- open, merge, close, or mark ready a pull request;
- force-push, rebase, `reset --hard`, or amend a pushed commit — correct with a new commit;
- delete a branch, local or remote, or create a tag;
- bypass the hooks (`--no-verify`, `HUSKY=0`, `core.hooksPath`) or change Git configuration.

`.claude/hooks/guard-git.mjs` and the husky `pre-commit` and `pre-push` hooks enforce these rules. A block from them is a stop to report, not an obstacle to route around.

## Decision rule

Subagents do not resolve decisions themselves, and neither does the orchestrator.

If a subagent identifies an unresolved decision, it returns it to the orchestrator with:

- the category: Requirements, Plan, or Validation;
- the decision required;
- the evidence inspected, and why it is insufficient;
- its recommended default;
- the consequences of the main alternatives.

The orchestrator sends it to `sdd-decide`, grouping the decisions from one stage into one call, and waits for the rulings.

Record each ruling before acting on it, tagged `decided by sdd-decide`, where the ruling's "Record in" says — as a `### Dn —` decision in the feature's `requirements.md`, or in `validation.md` for a check. Then pass it to the agent that asked.

Rulings marked for owner attention are listed first in the final report.

Use `AskUserQuestion` only for a `BLOCKED — HUMAN ACTION` item.

## Phase 1 — Discover and specify

Invoke `sdd-spec`.

The Spec Agent must inspect the roadmap, mission, tech stack, project rules, relevant specifications, code, and tests.

It must identify the next incomplete roadmap phase and propose the smallest useful feature scope.

If the feature appears larger than one working day including implementation, validation, and review, it must propose a split and choose the smallest independently useful slice.

The Spec Agent must resolve low-risk implementation choices from existing repository evidence.

If unresolved product, business, security, compliance, destructive, irreversible, or material architectural decisions remain, the agent must return them to the orchestrator.

Do not create the feature branch or final feature specification until blocking decisions are resolved.

After `sdd-decide` rules, invoke `sdd-spec` again with the rulings and tell it to finalize the specification.

The finalized feature must contain:

`specs/YYYY-MM-DD-NN-feature-name/`

with:

- `requirements.md`
- `plan.md`
- `validation.md`

The Spec Agent may create the feature branch.

Then invoke `sdd-decide` to approve the specification. On `CHANGES REQUIRED`, send the list to `sdd-spec`, then ask `sdd-decide` again.

Do not advance to implementation until `sdd-decide` returns `SPEC APPROVED`.

## Phase 2 — Implement

Invoke `sdd-implement`.

Provide the current feature directory and tell the agent to implement the approved specification.

The Implementation Agent must:

- read the feature specification and relevant project rules first;
- implement only approved scope;
- follow existing patterns before introducing new abstractions;
- preserve existing behaviour unless requirements explicitly change it;
- avoid unrelated refactoring, cleanup, dependencies, or features;
- run appropriate development checks while working;
- record factual plan adjustments when useful;
- stop and return control if requirements or approved scope must materially change.

Development checks are feedback during implementation, not final acceptance evidence.

Do not let implementation self-approve the feature.

## Phase 3 — Independent validation

After implementation completes, invoke `sdd-validate`.

The Validation Agent must independently inspect the current branch, commit, working tree, implementation, existing evidence, and validation checklist.

It must:

- confirm the intended code and environment are being tested;
- reuse still-valid evidence;
- execute every technically executable validation item;
- update `validation.md` only after observing the expected result;
- record concise evidence including code state, environment, action, and outcome;
- leave checks no agent can execute unchecked, and report them;
- report failures without weakening acceptance criteria.

Send each check no agent can execute to `sdd-decide` for a ruling: alternative evidence, which `sdd-validate` then executes, or deferral to a named later phase.

The Validation Agent is not allowed to repair application code.

If validation fails because of an in-scope implementation defect, invoke `sdd-fix`.

## Phase 3A — Fix loop

Invoke `sdd-fix` with:

- the failed validation item;
- actual failure output;
- relevant requirement;
- affected code;
- any constraints already discovered.

The Fix Agent must make the smallest compliant change.

It must not:

- change approved requirements;
- broaden scope;
- weaken tests;
- weaken acceptance criteria;
- mark validation complete.

After a fix, invoke `sdd-validate` again.

The Validation Agent must rerun:

- checks affected by the fix;
- any earlier checks whose evidence is invalidated by the changed code;
- required final automated checks.

Repeat Fix → Validate until:

- all executable technical checks pass; or
- an action only a human can take blocks progress.

## Phase 4 — Independent review

After technical validation passes, invoke `sdd-review`.

The Review Agent is read-only.

It must inspect:

- requirements;
- plan;
- validation evidence;
- complete diff;
- relevant surrounding code;
- project rules.

Review for:

- missing requirements;
- unintended scope changes;
- regressions;
- security concerns;
- error handling;
- maintainability;
- unnecessary complexity;
- architectural inconsistency;
- missing tests;
- meaningful edge cases;
- accidental secrets or sensitive information;
- inaccurate documentation.

Do not ask the Review Agent to repeat validation merely for completeness.

If the Review Agent finds a concrete in-scope defect, invoke `sdd-fix`, then `sdd-validate`, and then rerun `sdd-review` for the affected area.

If it is unclear whether a finding is in scope, or how to resolve it, send the question to `sdd-decide`.

Do not create speculative work outside approved scope.

## Orchestration rules

Use subagents when their isolated context and role separation improve quality.

Do not spawn subagents merely for trivial lookups or single-file questions.

For the SDD lifecycle:

1. `sdd-spec`
2. `sdd-decide` for any unresolved decision
3. `sdd-spec` finalization
4. `sdd-decide` specification approval
5. `sdd-implement`
6. `sdd-validate`
7. `sdd-fix` ↔ `sdd-validate` until clean
8. `sdd-review`
9. `sdd-fix` → `sdd-validate` → `sdd-review` if review finds defects
10. commit and push the last checkpoint, then stop at Ready for Human Review

`sdd-decide` may be invoked at any step a question arises.

Run agents sequentially when they depend on the previous agent's result.

Do not allow two code-writing agents to edit the same working tree concurrently.

Do not create another runbook instead of executing the workflow.

Do not stop merely because one phase finished when the next phase is already authorised.

## Environment safety

Prefer isolated test resources where practical.

Before runtime validation:

- confirm the branch and working tree;
- confirm the intended database or test environment;
- confirm the application started successfully.

Do not:

- stop unrelated processes;
- reset existing shared databases;
- delete shared caches unnecessarily;
- expose credentials;
- destroy unrelated resources.

Restore temporary environment changes when finished.

## Evidence and historical results

Preserve historical validation evidence.

Distinguish:

- prior human evidence;
- prior agent evidence;
- current agent evidence.

Do not rerun a check merely because documentation was updated.

Rerun a check when code or environment changes affect what earlier evidence proves.

Always run final required CI-equivalent checks defined by the project.

## Completion condition

Continue autonomously until all of the following are true:

1. approved implementation is complete;
2. every executable technical validation item passes, and every check no agent can execute has a ruling;
3. required final automated checks pass;
4. independent review has no unresolved in-scope defect;
5. every checkpoint is committed and pushed to the feature branch, and the working tree is clean;

or an action only a human can take blocks progress.

Then stop at `READY FOR HUMAN REVIEW`.

Finish with a short report:

### Implemented

What changed.

### Validated

What passed and how it was checked.

### Fixed

Defects found during implementation, validation, or review and how they were resolved.

### Decisions

Every `sdd-decide` ruling — those marked for owner attention first — with its confidence and where it is recorded.

### Remaining

Anything unexecuted, deferred, or unresolved.

### My actions

Review this summary and the rulings; mark the phase complete in `specs/roadmap.md`; open the pull request and merge it.

### Duration

Total wall-clock time from the start of the cycle to this report, each phase's share, and any time spent waiting on me — from the `sdd-next` timing log.

Do not mark human approval, merges, releases, deployments, or roadmap completion as complete.
