# Project Instructions

This project uses Spec-Driven Development.

## Autonomous SDD

For autonomous feature development, follow the workflow defined in:

`.claude/rules/autonomous-sdd.md`

Available specialist agents:

- `sdd-spec` — discover and specify the next feature
- `sdd-decide` — decide the questions that arise along the way, and approve the specification
- `sdd-implement` — implement the approved specification
- `sdd-validate` — independently execute technical validation
- `sdd-fix` — fix concrete in-scope defects
- `sdd-review` — perform independent final review

## Source of Truth

For each feature:

1. `requirements.md` — contract
2. `plan.md` — implementation strategy
3. `validation.md` — proof

Requirements take precedence over the plan.

Validation must prove the requirements rather than merely confirm that plan tasks were completed.

## Human Control

My part in a phase is the last step only: I review the summary, mark the phase complete, and open and merge the pull request (`specs/mission.md` §8.1).

Questions that arise along the way go to `sdd-decide`, not to me. Interrupt me only for an action only a human can take: credentials, accounts, payment, external access, or changes to systems outside this repository.

The orchestrating session may create feature branches, commit to them, and push them, as `.claude/rules/autonomous-sdd.md` (Git on feature branches) sets out.

Do not:

- approve human-review checkpoints;
- tick human approval items;
- mark roadmap phases complete;
- amend `specs/mission.md`;
- commit to, push to, or merge into `main`;
- open, merge, close, or mark ready a pull request — I open it;
- force-push, rebase, or otherwise rewrite pushed history;
- delete branches or create tags;
- create releases;
- deploy;

unless I explicitly instruct you to do so.

The autonomous workflow should stop at:

`READY FOR HUMAN REVIEW`
