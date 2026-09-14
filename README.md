# SDD — Spec-Driven Development for Claude Code

A reusable Claude Code setup for turning stakeholder requirements into a project constitution, then delivering the roadmap through small, independently validated feature cycles.

| Skill | Purpose | Your involvement |
| --- | --- | --- |
| `/sdd` | Draft the mission, tech stack, and roadmap. | Answer grouped questions before any files are written. |
| `/sdd-next` | Take the next roadmap phase through specification, implementation, validation, fixes, and review. | Review the final summary, mark the phase complete, and open and merge the pull request. |

This repository includes two skills, six specialist agents, workflow rules, and a Git guard. Supply your project's stakeholder input, application code, tests, and supporting infrastructure as you adopt it.

## Getting started

### 1. Add the workflow to your project

Use this repository as a starting point, or copy its `.claude/` directory into an existing Git project. Merge any existing Claude Code instructions, permissions, and hooks instead of overwriting them.

Have Claude Code, Git, and Node.js available. The included Bash hook invokes `node` and uses only Node.js built-in modules; it needs no package installation.

Add a Markdown file containing stakeholder requirements. Include the problem, intended users, desired outcomes, known constraints, and priorities where available.

### 2. Draft the constitution with `/sdd`

Open Claude Code in the project directory and provide the project name, description, and stakeholder requirements filename:

```text
/sdd I am writing [project name], [project description]. Look in [business requirement md filename] for input from stakeholders.
```

For example:

```text
/sdd I am writing BookShelf, a reading tracker for book clubs. Look in HIGH-LEVEL-REQUIREMENTS.md for input from stakeholders.
```

The skill reads that file and the repository, then **must use `AskUserQuestion` with questions grouped into Mission, Tech stack, and Roadmap before writing anything to disk**. It waits for actual answers to all three groups, with focused follow-up questions where needed. If the tool is unavailable or answers are missing, it does not write the constitution.

After the interview, it drafts and checks:

| File | Content |
| --- | --- |
| `specs/mission.md` | Purpose, users, outcomes, scope, exclusions, success criteria, constraints, and decision authority. |
| `specs/tech-stack.md` | Technology choices, rationale, tradeoffs, and development and validation approach. |
| `specs/roadmap.md` | Implementation order in very small, demonstrable phases, with dependencies and acceptance checks. |

Each roadmap phase should fit within one working day, including specification, implementation, validation, and review. Larger work is split into smaller useful slices.

`/sdd` stops after drafting the constitution and reporting decisions, assumptions, and the proposed first phase. Existing constitution files are inspected before changes, and amendments to an existing mission require explicit owner instruction.

### 3. Prepare for feature development

Before running `/sdd-next`, ensure the constitution reflects the project and the following are available:

- An `origin` remote and access for feature-branch pushes.
- Project-specific development and validation commands, or a clearly scoped initial phase to establish them.
- The CI and Git protections expected by the workflow: `.github/workflows/ci.yml`, Husky `pre-commit` and `pre-push` hooks, and repository branch protection.

The constitution files, CI workflow, and Husky hooks are not included in this repository. `/sdd` drafts the constitution; the adopting project supplies the other infrastructure.

The setup skill accepts your actual stakeholder filename. The current `sdd-decide` instructions also explicitly reference `HIGH-LEVEL-REQUIREMENTS.md`; if your file has another name, align that reference in the adopting project. The workflow references mission §8.1 and roadmap §§2, 6, and 7, which `/sdd` is instructed to preserve in its document structure.

### 4. Run the next feature cycle

```text
/sdd-next
```

Optionally provide a roadmap item or scope hint:

```text
/sdd-next [roadmap item or scope hint]
```

`/sdd-next` runs only when explicitly invoked. It checks the prerequisite documents, branch, and working tree, then selects the next incomplete roadmap phase. A scope hint is checked against the roadmap and rules; specification approval is still required.

At the end of a successful cycle, review the summary and decisions, mark the phase complete, and open and merge the pull request. Invoke `/sdd-next` again when ready for the following phase.

## How a feature cycle works

1. **Specify.** `sdd-spec` inspects the roadmap, mission, tech stack, existing specifications, code, and tests. It proposes the smallest useful scope.
2. **Decide and approve.** `sdd-decide` resolves outstanding questions. `sdd-spec` finalizes the feature documents and creates the branch; implementation starts only after `sdd-decide` returns `SPEC APPROVED`.
3. **Implement.** `sdd-implement` builds the approved scope and runs development checks.
4. **Validate and fix.** `sdd-validate` independently executes technical checks and records evidence. Concrete defects go to `sdd-fix`, then back to validation.
5. **Review.** `sdd-review` inspects the requirements, evidence, complete diff, and surrounding code. In-scope defects return through fix, validation, and review.
6. **Hand off.** The orchestrator completes the required commit and push checkpoints and reports `READY FOR HUMAN REVIEW`.

Dependent agents run sequentially, and multiple code-writing agents must not edit the same working tree concurrently. Only the orchestrating session commits and pushes; subagents return their work to it.

### Specialist agents

| Agent | Configured model / effort | Responsibility |
| --- | --- | --- |
| `sdd-spec` | Opus / high | Discover scope, write the specification, and create the feature branch. |
| `sdd-decide` | Opus / xhigh | Rule on questions and approve specifications without editing files. |
| `sdd-implement` | Sonnet / high | Implement approved requirements without self-approving acceptance. |
| `sdd-validate` | Opus / high | Execute validation and record evidence without repairing application code. |
| `sdd-fix` | Sonnet / high | Make focused repairs without weakening requirements, tests, or acceptance criteria. |
| `sdd-review` | Opus / high | Perform an independent, read-only final review. |

## Specifications and evidence

The constitution guides the project. Each feature cycle adds its own contract, plan, and proof:

```text
specs/
├── mission.md
├── tech-stack.md
├── roadmap.md
└── YYYY-MM-DD-NN-feature-name/
    ├── requirements.md          # Contract: behavior, scope, decisions, exclusions
    ├── plan.md                  # Strategy: ordered implementation tasks
    └── validation.md            # Proof: checks, expected results, observed evidence
```

Requirements take precedence over the plan. Validation must prove the requirements. Development checks provide feedback during implementation; acceptance requires independent validation and review.

During `/sdd`, foundational questions go directly to you through `AskUserQuestion`. During `/sdd-next`, questions about requirements, plans, validation, and scope go to `sdd-decide`. Its rulings are recorded before action, tagged `decided by sdd-decide`, with reasoning, confidence, alternatives, and owner-attention flags where relevant.

Validation records the tested code state, environment, action, and observed result. Checkboxes are completed only after observing the expected outcome. Historical evidence is preserved and reused when still applicable; affected checks are rerun after code or environment changes.

A check no agent can execute remains unchecked and goes to `sdd-decide` for equivalent evidence or deferral to a named later phase.

## Git policy and human review

During an authorized feature cycle, the orchestrator stages files by name and uses Conventional Commits at these checkpoints, followed by a plain fast-forward `git push -u origin <branch>`:

| Checkpoint | Commit convention |
| --- | --- |
| Specification approved | `docs(spec): …` |
| Implementation handed off with development checks passing | `feat(…): …`, or another appropriate type |
| Each fix, before revalidation | `fix(…): …` |
| Validation evidence recorded | `docs(validation): …` |

Unrelated changes, secrets, and `.env` files must not be staged. If a commit is due on `main`, the workflow stops and reports it.

Human approval, roadmap completion, mission amendments, pull request actions, changes to `main`, history rewriting, branch deletion, tags, releases, and deployment remain reserved for explicit owner instruction. A successful feature cycle leaves human review pending.

The included `guard-git.mjs` runs as a Claude Code `PreToolUse` hook for Bash. It blocks recognized policy violations, including main-branch commits, subagent commits and pushes, force-pushes, rebases, destructive resets, hook bypasses, and restricted GitHub CLI writes. A block exits with status `2` and explains the reason.

The guard uses shell-shaped parsing, not a full shell parser. It covers recognized commands passing through this hook; Husky hooks and repository branch protection are separate enforcement layers that the adopting project must configure.

## Progress and completion

`/sdd-next` tracks **SPEC**, **IMPLEMENT**, **VALIDATE**, **REVIEW**, and **HUMAN REVIEW**, with phase updates such as:

```text
[SDD 3/5] VALIDATE — 8/10 checks passed; fixing 1 defect
```

Timing is recorded in `sdd-next-timing.log` inside the Git directory. It tracks cycle start and end, phase transitions, and time waiting on the owner, and is not committed.

An owner-only blocker, such as credentials, account access, payment, or changes outside the repository, is reported as `ACTION REQUIRED` after independent work is completed.

A successful cycle reports **Implemented**, **Validated**, **Fixed**, **Decisions**, **Remaining**, **My actions**, and **Duration**, ending with:

```text
READY FOR HUMAN REVIEW
```

At that point, executable validation and required automated checks pass, every unexecutable check has a ruling, independent review has no unresolved in-scope defects, and the feature checkpoints are committed and pushed with a clean working tree.

## Repository layout

```text
.claude/
├── CLAUDE.md                    # Project instructions and setup exception
├── settings.json                # Bash permissions and hook registration
├── skills/
│   ├── sdd/SKILL.md             # Interactive constitution setup
│   └── sdd-next/SKILL.md        # Autonomous feature cycle
├── agents/
│   ├── sdd-spec.md
│   ├── sdd-decide.md
│   ├── sdd-implement.md
│   ├── sdd-validate.md
│   ├── sdd-fix.md
│   └── sdd-review.md
├── rules/
│   └── autonomous-sdd.md        # Authoritative lifecycle and Git policy
└── hooks/
    └── guard-git.mjs            # Bash command guard for Git and GitHub CLI
```
