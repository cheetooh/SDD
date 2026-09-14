# SDD — Spec-Driven Development

A Claude Code workflow for taking a roadmap item through specification, implementation, independent validation, defect fixing, and final review. The main session coordinates six specialist agents and stops at `READY FOR HUMAN REVIEW`, where the owner reviews the results, marks the roadmap phase complete, and opens and merges the pull request.

This repository contains the workflow configuration, agent instructions, constitution and feature-cycle skills, and a Git guard. Application code, stakeholder input, tests, and CI configuration must be supplied by the project adopting it; `/sdd` helps draft its foundation specifications.

## Core principles

Each feature has three documents:

| Document | Purpose |
| --- | --- |
| `requirements.md` | The contract: scope, behavior, decisions, and exclusions. |
| `plan.md` | The implementation strategy, organized into actionable tasks. |
| `validation.md` | The proof: checks, expected results, and observed evidence. |

Requirements take precedence over the plan. Validation proves the requirements through observed results. Implementation checks provide development feedback; acceptance requires independent validation and review.

The workflow targets the smallest independently useful feature that can be specified, implemented, validated, and reviewed within one working day. Larger work is split into smaller slices.

## Repository structure

```text
.
├── README.md
└── .claude/
    ├── CLAUDE.md                 # Project instructions and human control boundary
    ├── settings.json            # Bash permissions and PreToolUse hook registration
    ├── rules/
    │   └── autonomous-sdd.md     # Authoritative lifecycle and Git policy
    ├── skills/
    │   ├── sdd/
    │   │   └── SKILL.md          # Interactive constitution setup
    │   └── sdd-next/
    │       └── SKILL.md          # Explicitly invoked workflow entry point
    ├── agents/
    │   ├── sdd-spec.md           # Scope discovery and specification
    │   ├── sdd-decide.md         # Decisions and specification approval
    │   ├── sdd-implement.md      # Implementation of approved scope
    │   ├── sdd-validate.md       # Independent validation and evidence
    │   ├── sdd-fix.md            # Focused defect repair
    │   └── sdd-review.md         # Independent final review
    └── hooks/
        └── guard-git.mjs         # Git and GitHub CLI command guard
```

## Getting started

1. Use this repository as a starting point, or copy its `.claude/` directory into an existing Git project. If that project already has Claude Code configuration, merge the instructions, permissions, and hooks with its existing settings.
2. Make Claude Code, Git, and Node.js available in the project environment. The registered hook invokes `node` and uses Node.js built-in modules; it has no package dependencies to install.
3. Supply stakeholder requirements and use `/sdd` to draft the project documents described below. Define the application's development and validation commands.
4. Configure an `origin` remote and access for feature-branch pushes. Add the CI and Git hook protections expected by the workflow.
5. Open Claude Code in the project directory and invoke:

   ```text
   /sdd-next
   ```

   Optionally include a roadmap item or scope hint:

   ```text
   /sdd-next <roadmap item or scope hint>
   ```

The `/sdd-next` skill runs only when explicitly invoked. Its argument is a hint checked against the roadmap and project rules; it does not bypass specification or approval.

### Draft the constitution with `/sdd`

In Claude Code, provide the project name, description, and stakeholder requirements filename:

```text
/sdd I am writing [project name], [project description]. Look in [business requirement md filename] for input from stakeholders.
```

The skill reads the source and repository context, then uses `AskUserQuestion` with questions grouped into **Mission**, **Tech stack**, and **Roadmap**. It must receive answers for all three groups before writing anything to disk.

It then drafts `specs/mission.md`, `specs/tech-stack.md`, and `specs/roadmap.md`, with implementation ordered into very small, demonstrable phases. It ends after checking the documents; invoke `/sdd-next` separately when ready to begin a feature cycle.

### Project documents to supply

These files are referenced by the workflow but are not included in this repository:

| File | Expected content |
| --- | --- |
| `specs/mission.md` | The project's constitution, constraints, and owner authority. The workflow references §8.1 for the human review and Git boundary. |
| `specs/roadmap.md` | Ordered phases and their approved scope. Agent instructions reference §2 for phase rules, §6 for replanning, and §7 for carried or deferred work. |
| `specs/tech-stack.md` | The project's technology choices and technical constraints. |
| `HIGH-LEVEL-REQUIREMENTS.md` | Stakeholder intent, used alongside the adopting project's README by the decision agent. |

The skill explicitly checks for the mission, roadmap, tech stack, workflow policy, and required agents before starting. Provide meaningful project content and reconcile the referenced section numbers with the adopting project's documents.

The workflow also expects `.github/workflows/ci.yml` to run on feature-branch pushes and refers to Husky `pre-commit` and `pre-push` hooks. Those files are not supplied here. Configure them in the adopting project, along with repository branch protection, before relying on those enforcement layers.

## How a cycle works

1. **Discover and specify.** `sdd-spec` inspects the roadmap, mission, technology choices, existing specifications, code, and tests. It selects the next incomplete phase and proposes a manageable scope.
2. **Decide and approve.** Unresolved questions go to `sdd-decide`. Once blocking decisions are resolved, `sdd-spec` creates the feature branch and final specification. `sdd-decide` must return `SPEC APPROVED` before implementation starts.
3. **Implement.** `sdd-implement` builds the approved scope, follows established patterns, and runs appropriate development checks.
4. **Validate and fix.** `sdd-validate` independently executes technical checks and records evidence. Concrete defects go to `sdd-fix`, then back to validation until the affected checks pass.
5. **Review.** `sdd-review` inspects the requirements, evidence, full diff, and surrounding code. In-scope defects return through fix, validation, and review.
6. **Hand off.** The orchestrator commits and pushes the required checkpoints, summarizes the outcome and decisions, and leaves human review pending.

Dependent agents run sequentially. Multiple code-writing agents must not edit the same working tree concurrently.

### Specialist agents

| Agent | Configured model / effort | Responsibility and boundary |
| --- | --- | --- |
| `sdd-spec` | Opus / high | Writes the specification and may create the feature branch; does not implement. |
| `sdd-decide` | Opus / xhigh | Rules on questions and approves specifications; never edits files. |
| `sdd-implement` | Sonnet / high | Implements approved requirements; does not self-approve acceptance. |
| `sdd-validate` | Opus / high | Executes validation and edits the feature's `validation.md`; does not repair application code. |
| `sdd-fix` | Sonnet / high | Makes the smallest compliant defect fix; does not weaken requirements, tests, or acceptance criteria. |
| `sdd-review` | Opus / high | Performs a read-only final review; does not repeat validation without a reason. |

Only the orchestrating session commits and pushes. Subagents return their work to it.

## Specifications, decisions, and evidence

Finalized feature specifications use this structure:

```text
specs/
└── YYYY-MM-DD-NN-feature-name/
    ├── requirements.md
    ├── plan.md
    └── validation.md
```

Questions about requirements, plans, validation, and scope are routed to `sdd-decide`. Its rulings include reasoning, alternatives, confidence, reversibility, and whether the owner should pay particular attention. The orchestrator records rulings before acting on them, tagged `decided by sdd-decide`, in the specified location: typically a `### Dn —` decision in `requirements.md`, or in `validation.md` for a check.

Validation evidence identifies the tested commit or working-tree state, environment, action, and observed result. A technical checkbox is marked complete only after the check runs and produces the expected result. Earlier evidence is preserved and reused when it still applies; affected checks are rerun after code or environment changes.

Checks no agent can execute remain unchecked and go to `sdd-decide` for equivalent agent-executable evidence or deferral to a named later phase. They are never treated as passed without evidence.

## Git policy and human control

During an authorized cycle, the orchestrator commits named feature files using Conventional Commits and pushes to the feature branch with `git push -u origin <branch>` at these checkpoints:

| Checkpoint | Commit convention |
| --- | --- |
| Specification approved | `docs(spec): …` |
| Implementation handed off with development checks passing | `feat(…): …`, or another appropriate type |
| Each fix, before revalidation | `fix(…): …` |
| Validation evidence recorded | `docs(validation): …` |

Unrelated changes, secrets, and `.env` files must not be staged. If a commit is due while the working tree is on `main`, the workflow stops and reports it.

Human review approval, roadmap completion, mission amendments, pull request actions, changes to `main`, history rewriting, branch deletion, tags, releases, and deployment remain reserved for explicit owner instruction. The normal handoff asks the owner to review the summary and rulings, mark the phase complete, then open and merge the pull request.

The supplied `guard-git.mjs` is registered as a Claude Code `PreToolUse` hook for Bash. It blocks recognized commands that violate the Git policy, including commits to `main`, subagent commits and pushes, force-pushes, rebases, destructive resets, hook bypasses, and restricted GitHub CLI writes. A rejection exits with status `2` and returns an explanation.

The guard uses shell-shaped parsing, not a full shell parser. Its coverage is limited to the commands it recognizes through this hook; the referenced Husky hooks and repository branch protection are separate enforcement layers.

## Progress and completion

The skill tracks five visible tasks: **SPEC**, **IMPLEMENT**, **VALIDATE**, **REVIEW**, and **HUMAN REVIEW**. Phase updates use messages such as:

```text
[SDD 3/5] VALIDATE — 8/10 checks passed; fixing 1 defect
```

Cycle timing is appended to `sdd-next-timing.log` inside the Git directory. The log records start, phase transitions, blocked/resumed events, and completion so the final report can calculate elapsed time and time waiting on the owner. It is not committed.

An action requiring the owner, such as supplying credentials, account access, payment, or changes to systems outside the repository, is reported as `ACTION REQUIRED` after independent work is completed.

A successful cycle finishes with **Implemented**, **Validated**, **Fixed**, **Decisions**, **Remaining**, **My actions**, and **Duration**, followed by:

```text
READY FOR HUMAN REVIEW
```

At that point, implementation, executable validation, required automated checks, and independent review are complete, and the feature checkpoints are committed and pushed. Human review remains pending.
