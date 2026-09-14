---
name: sdd
description: Create a project's initial SDD constitution from its description and stakeholder requirements, asking the user about mission, tech stack, and roadmap before writing specs/mission.md, specs/tech-stack.md, and specs/roadmap.md. Use for project foundation planning, not for executing roadmap phases.
allowed-tools: AskUserQuestion
---

# SDD Constitution

Turn the user's project idea and stakeholder input into three coherent foundation documents:

- `specs/mission.md`
- `specs/tech-stack.md`
- `specs/roadmap.md`

Expected input, supplied in `$ARGUMENTS` or the conversation:

```text
I am writing [project name], [project description].
Look in [business requirement md filename] for input from stakeholders.
```

This is the interactive setup step before `/sdd-next`. Ask the user directly during this skill; the autonomous lifecycle's delegation of questions to `sdd-decide` applies to later feature cycles. Do not invoke the lifecycle or delegate these foundational answers to an agent.

## 1. Inspect without writing

Read the named stakeholder Markdown file, relevant project instructions, the README, any existing `specs/` documents, and enough existing code or dependency manifests to understand established constraints.

Treat the supplied filename as the stakeholder source; do not assume it is named `HIGH-LEVEL-REQUIREMENTS.md` or rename it. Preserve references to its actual path and relevant headings in the generated documents.

If the project name, description, or source file cannot be identified from the request and repository, obtain the missing information with `AskUserQuestion`. If the file is missing, ask for the correct path and read it before making source-dependent proposals. Do not invent stakeholder input.

If constitution files already exist, inspect them and ask through `AskUserQuestion` whether the user intends to revise them. Identify the proposed changes, preserve unrelated content, and require explicit instruction to amend an existing mission. Existing files do not bypass the interview below.

## 2. Mandatory interview before any writes

**You MUST use the actual `AskUserQuestion` tool, with questions grouped into Mission, Tech stack, and Roadmap, and receive the user's answers before writing to disk.**

Until this gate is satisfied, perform only read-only inspection and conversation. Do not create directories, draft files, temporary files, logs, code, or configuration. A prose question, a proposed tool payload, answers inferred from the source, or a decision from another agent does not satisfy this requirement.

After inspecting the source, summarize your understanding briefly, then call `AskUserQuestion` with a batch containing one focused question for each of these three groups. Use the group names as question headers. Make the questions specific to the project and offer meaningful choices with concise tradeoffs; recommend an option when the evidence supports it and allow the user's own answer.

| Group | Decisions to clarify |
| --- | --- |
| **Mission** | Primary users and problem, intended outcome, first-release scope, explicit exclusions, success criteria, and non-negotiable business or security constraints. |
| **Tech stack** | Existing technology commitments, runtime and hosting constraints, data storage, integrations, budget or operational limits, and preferences among suitable implementation approaches. |
| **Roadmap** | The smallest useful first outcome, priority order, dependencies, release boundaries, and how to divide work into very small demonstrable phases. |

Use focused follow-up calls under the same headers when needed; do not pack every topic into one unwieldy question. Where the source already settles a topic, present that understanding for confirmation and concentrate questions on material choices or conflicts. Cover all three groups even when the initial input is detailed.

Wait for actual answers to every group and resolve material contradictions before writing. A skipped, empty, or cancelled response is not agreement. If `AskUserQuestion` is unavailable, explain that this skill requires it and stop without writing. Do not substitute another interaction mechanism.

## 3. Write the constitution

Once the interview is complete, briefly summarize the agreed direction and create the three documents. The user's answers authorize drafting; do not add another approval round unless a new material conflict appears. Ground the content in stakeholder input, confirmed decisions, and inspected repository evidence. Label any remaining non-blocking assumptions explicitly.

### `specs/mission.md`

Define the project's purpose, users, outcomes, scope, exclusions, success criteria, binding constraints, and decision authority. Reference the stakeholder source and record the foundational decisions confirmed by the user.

Keep lasting principles here; place implementation choices in the tech stack and delivery sequence in the roadmap. Do not invent legal obligations, numerical targets, or product requirements.

For compatibility with this repository's SDD rules, include `## 8. Governance` and `### 8.1 Human review and Git authority`. Preserve the established boundary: agents may carry out authorized feature work and the orchestrator may commit and push feature branches; the owner reviews the summary, marks the phase complete, and opens and merges the pull request. Mission amendments, main-branch writes, history rewriting, releases, and deployment require explicit owner instruction. Surface any requested conflict with these rules during the interview.

### `specs/tech-stack.md`

Record the chosen technologies by responsibility, why each fits the confirmed constraints, and any important tradeoffs. Cover application architecture, persistence, interfaces and integrations, testing, development tooling, and deployment approach only as relevant to this project.

Distinguish technologies already present from proposed additions. Record known versions from inspected manifests; verify version-sensitive claims with official documentation if necessary. Do not fabricate current versions or working commands. Mark proposed development and validation commands as proposed until they exist and have been verified.

### `specs/roadmap.md`

Use this structure to match references in the existing SDD agents:

1. **Delivery goal** — the outcome the sequence is intended to deliver.
2. **Phase rules** — each phase is a small, demonstrable slice; target less than one working day including specification, implementation, validation, and review. Split anything larger.
3. **Dependencies and ordering** — prerequisite work and the reasons for the sequence.
4. **Implementation phases** — numbered phases in execution order.
5. **Validation and release checkpoints** — how outcomes will be demonstrated and when release readiness will be assessed.
6. **Replanning** — how phases can be split or reordered within agreed scope; scope expansion or constitutional changes return to the owner.
7. **Carried and deferred items** — explicit exclusions or deferred work with a named destination phase where known; use `None` if empty.

For every implementation phase, include an unchecked completion item, stable phase ID, concrete outcome, narrow scope and exclusions, dependencies, and an observable acceptance or demonstration check. Prefer useful vertical slices. Keep prerequisite setup phases narrow and independently verifiable. Avoid broad phases such as "build the backend" or "complete the UI".

Keep this roadmap at the level of outcomes and order. Detailed feature requirements, implementation plans, and validation evidence belong to later `/sdd-next` cycles. Do not mark phases complete or claim that proposed checks have passed.

## 4. Check and hand off

Read back all three files. Check that they agree with the interview, stakeholder requirements, and each other; references resolve; roadmap dependencies point to defined phases; and no large or vague phase remains. Clearly distinguish deferred work and unverified assumptions from commitments.

Report the three file paths, the key confirmed decisions, any open assumptions, and the first proposed phase. Mention `/sdd-next` as the subsequent implementation workflow, without starting it. This skill ends after drafting the constitution; it does not create feature specifications, implement code, commit, push, or open a pull request.
