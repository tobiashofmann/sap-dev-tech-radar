---
name: action-canvas
description: Maintains one action canvas (one-page planning canvas, Markdown + SVG/PNG image) per feature branch in docs/action-canvas, so the requester sees what is done, why, and with what impact. Use when a feature branch is created or a new feature starts, while working on a feature branch, and before a PR or merge; also when a developer invokes it mid-development on a branch without a canvas. Supports en, de, pt, fr, it, es.
---

# Action canvas for feature branches

Every feature branch gets an action canvas. The requester should be able to see at any time: **what** is being done, **why**, and **what impact** it has.

Location: `docs/action-canvas/<branch-slug>.md` (text) and `docs/action-canvas/<branch-slug>.svg` (+ optional `.png`) as an image in the template's layout. `<branch-slug>` = branch name with `/` replaced by `-` (e.g. `feature/pdf-export` → `feature-pdf-export`).

`RENDER` below stands for `python3 <skill-dir>/render_canvas.py`, where `<skill-dir>` is the directory containing this SKILL.md (e.g. `.claude/skills/action-canvas`, `~/.claude/skills/action-canvas` or `.agents/skills/action-canvas`, depending on how it was installed).

## When this skill applies

- A feature branch is created (`git checkout -b feature/...`, `git switch -c feature/...`) or work on a new feature begins.
- While working on a feature branch, as soon as a task is completed that affects a field.
- Before closing/merging/opening a PR for a feature branch.
- A developer invokes the skill explicitly (e.g. `/action-canvas` in Claude Code), including in the middle of development on a branch that has no canvas yet (see "Starting mid-development").

If a canvas already exists for the current branch, it is updated, never created anew.

## Language

The canvas (Markdown **and** image) and everything presented around it are written in the requester's language.

- Supported: English `en`, German `de`, Portuguese `pt` (one text for Portugal and Brazil, `pt-BR`/`pt-PT` are accepted), French `fr`, Italian `it`, Spanish `es`.
- Detect the language from the requester's messages about the feature. If it is not one of the supported languages, or unclear, use English.
- Record it in the meta comment as `lang=<code>`. An existing canvas keeps its language, unless the requester asks to switch; then translate the Markdown (headings and content) and re-render.
- Use the field headings and scale labels of that language from the table below, exactly as written (the renderer reads them). Placeholders are localized too: `_open_` → `_offen_` (de), `_aberto_` (pt), `_ouvert_` (fr), `_aperto_` (it), `_abierto_` (es). Likewise `(Assumption)` is written in the canvas language.
- The renderer (`--lang <code>` to force one) draws image labels and prints check messages in that language; without `--lang` it uses `lang=` from the meta comment, then the language of the headings, then English.
- Chat messages, questions to the requester and the closing summary use the same language.

| Field | en | de | pt | fr | it | es |
|---|---|---|---|---|---|---|
| Measure | Measure | Maßnahme | Medida | Mesure | Misura | Medida |
| Description | Description | Beschreibung | Descrição | Description | Descrizione | Descripción |
| Background | Background | Hintergrund | Contexto | Contexte | Contesto | Contexto |
| Added Value | Added Value | Mehrwert | Valor agregado | Valeur ajoutée | Valore aggiunto | Valor añadido |
| Stakeholders | Stakeholders | Stakeholder | Partes interessadas | Parties prenantes | Stakeholder | Partes interesadas |
| IT | IT | IT | TI | IT | IT | TI |
| Critical Success Factors | Critical Success Factors | Kritische Erfolgsfaktoren | Fatores críticos de sucesso | Facteurs clés de succès | Fattori critici di successo | Factores críticos de éxito |
| Resources | Resources | Ressourcen | Recursos | Ressources | Risorse | Recursos |
| Implementation | Implementation | Umsetzung | Implementação | Mise en œuvre | Attuazione | Implementación |
| Required Activities | Required Activities for Implementation | Erforderliche Aktivitäten zur Umsetzung | Atividades necessárias para a implementação | Activités requises pour la mise en œuvre | Attività necessarie per l'attuazione | Actividades necesarias para la implementación |
| Open Points | Open Points | Offene Punkte | Pontos em aberto | Points ouverts | Punti aperti | Puntos abiertos |
| Time Horizon | Time Horizon | Zeitlicher Horizont | Horizonte de tempo | Horizon temporel | Orizzonte temporale | Horizonte temporal |
| Complexity | Complexity | Komplexität | Complexidade | Complexité | Complessità | Complejidad |
| Cost | Cost | Kosten | Custos | Coûts | Costi | Costes |
| Risk | Risk | Risiko | Risco | Risque | Rischio | Riesgo |

## The 11 fields

| # | Field | Guiding question | Who fills it / when |
|---|-------|------------------|---------------------|
| 1 | Measure | Short name of the measure: the shorter version of the canvas title (e.g. title "PDF export of the application overview for case workers" → Measure "PDF export of the application overview") | Requester, phase 1 (mandatory) |
| 2 | Description | Which actions, which goal to be achieved? | Requester, phase 1 (mandatory) |
| 3 | Background | For what reasons? Which problem is solved? | Requester, phase 1 (mandatory) |
| 4 | Added Value | What benefits/advantages after implementation? | ongoing, phase 3 |
| 5 | Stakeholders | Who is involved? Who is affected after implementation? | ongoing, phase 3 |
| 6 | IT | Which IT systems are needed? | ongoing, phase 3 |
| 7 | Critical Success Factors | What directly influences success? | ongoing, phase 3 |
| 8 | Resources | Staff, costs, data, access … | AI, phase 2 |
| 9 | Implementation | Time horizon, complexity, cost, risk (1–5 each) | AI, phase 2 |
| 10 | Required Activities for Implementation | What? Who? When? | AI, phase 2, tick off as work progresses |
| 11 | Open Points | Which questions to the requester are still open? (also follow-up topics) | AI and requester, any phase; optional, never mandatory |

## Decision rules (important)

- **The AI only decides about its own tasks** (e.g. how it implements something, which tests it writes, the order of its steps). Everything else – goals, priorities, third-party responsibilities, third-party deadlines, approvals, operating environment – is answered by the requester.
- **IT resources:** If a resource is clearly evidenced in the repository, the AI enters it itself and names where it was found (e.g. `pom.xml` with Spring Boot → "Java backend (Spring Boot 3)"; `package.json` with React → "React frontend"; `Dockerfile`, migrations, configuration). If it is **not** known whether and where a resource is used (local or cloud? which cloud provider? which production database? on-premise Kubernetes?), **ask** – never guess.
- Questions are collected and asked in a batch (AskUserQuestion if available, otherwise as a numbered list in the chat), with suggested answer options where useful. Unanswered questions go in the **Open Points** field of the canvas (Open Points and open questions are the same thing); an affected field holds the entry `- _open_` until then.
- Assumptions made by the AI are marked as such: `- (Assumption) …`. The requester confirms or corrects them at closing at the latest.

## Starting mid-development (branch exists, no canvas yet)

If the skill is invoked on a branch that already has commits but no canvas, the requirements were not captured at the start, so reconstruct them instead of starting from scratch:

1. **Gather evidence:** branch name, `git log` and `git diff --stat` against the base branch (and the relevant parts of the diff), plus PR or ticket text if available.
2. **Draft** title, Measure, Description and Background from that evidence. Everything inferred is marked `(Assumption)`.
3. **Ask in one batch** (see decision rules): show the draft, let the requester or developer confirm or correct it, and ask for what the code cannot show, above all the Background (which problem, why now), the goal, and the stakeholders. Never invent a Background.
4. **Create the canvas** from the template (phase `plan`). In Required Activities, tick the work already done (`- [x]`) and list the remaining work as open. The Implementation estimates cover the whole feature, not only the rest.
5. `--check plan`, render, present, then continue with Phases 3 and 4 as usual. Confirm the assumptions at the latest when closing.

## Phase 1 – Start when the feature branch is created

1. From the requester's information about the feature, derive the **title** (long version, e.g. "PDF export of the application overview for case workers"), **Measure** (the same in short, e.g. "PDF export of the application overview"), **Description, Background**. If one of them is missing or too vague to phrase in your own words (e.g. no recognizable problem for "Background"), **ask before** creating the canvas.
2. Create `docs/action-canvas/<branch-slug>.md` from the template below; fill all other fields with `- _open_`.
3. `RENDER docs/action-canvas/<branch-slug>.md --check start` must pass.
4. Render the image and present it to the requester (see "Presenting").

## Phase 2 – Implementation plan (right after the start)

Fields 8–10 are the **summary of the implementation plan**. First create the plan (look at the code, identify the affected places), then:

- **Implementation:** four values on a scale of 1–5, each with a short justification, in exactly the format `- Time Horizon: 2/5 – justification` (likewise `Complexity`, `Cost`, `Risk`).
  - Time Horizon: 1 = hours, 2 = a few days/one sprint, 3 = several sprints, 4 = a quarter, 5 = longer.
  - Complexity, Cost, Risk: 1 = low … 5 = high.
  - **Exactly one line per scale, four lines in total.** Keep each justification to about 70 characters (the image shows two short lines and cuts the rest with "…"); details belong in Description or the PR. A second entry for the same scale replaces the first in the image, and extra lines without an `n/5` value are not shown at all. `--check` and the renderer print a warning for all three cases.
- **Required Activities:** checklist `- [ ] What — Who — When`. "Who" is `AI` only for tasks the AI does itself. For tasks of others (review, approval, deployment, acceptance), ask the requester for the person/role; until answered use `— _open_ —`. "When" is **never a date or calendar week**, but a generic milestone in the canvas language: e.g. next step, before merging, after merge, before go-live (de: nächster Schritt, vor dem Merge, nach dem Merge, vor Go-live).
- **Resources:** staff (person-days), costs (licenses, infrastructure), data, access, tools.
- `--check plan` must pass (apart from deliberately open questions). Re-render the canvas and present it to the requester for confirmation.

## Phase 3 – Ongoing during development

After each completed task, or before each commit that changes something relevant:

- Tick off activities (`- [x]`), add new activities, update changed estimates for Implementation/Resources (don't silently overwrite old values: adjust the justification).
- **IT:** enter every newly used or changed system, library, interface, database, infrastructure (observe the known/unknown rule).
- **Stakeholders:** who is involved (e.g. data protection, operations, business department) and who is affected after implementation.
- **Added Value:** concrete benefit, measurable where possible (time, errors, costs, user group).
- **Critical Success Factors:** what decides success (performance limits, data protection, accessibility, dependencies, acceptance).
- Include the canvas update in the commit (a separate `docs(canvas): …` commit is equally fine).

## Phase 4 – Closing the feature branch

Before PR/merge, or when the requester declares development finished:

1. `RENDER docs/action-canvas/<branch-slug>.md --check final` – **all fields except Open Points** must be filled, including all four Implementation values.
2. If something is missing that the AI may not decide itself, or if `_open_` entries, `(Assumption)` entries or open points are still present: ask the requester and incorporate the answers, then remove the answered open points. Only follow-up topics the requester has explicitly deferred may remain in Open Points.
3. Set `phase=final` in the meta comment, render the final image (`--png`), commit.
4. Present it to the requester with 2–3 sentences: what was implemented, why, what impact.

## Markdown template

The `#` title is the long version of the name (shown at the top of the image, below the "ACTION CANVAS" label). The Measure field holds the short version (shown in the dark box of the image). The template below is shown in English; translate headings, scale labels and text into the canvas language (see "Language"). Simple structure: each field as a `##` heading, content as a list. No further levels, no tables inside the fields (the renderer only reads list items).

```markdown
# <Title: long version of the measure name>

<!-- canvas-meta: branch=<branch>; lang=<en|de|pt|fr|it|es>; phase=start|plan|ongoing|final; created=<YYYY-MM-DD>; updated=<YYYY-MM-DD> -->

![Action Canvas](<branch-slug>.svg)

## Measure
- <short version of the title>

## Description
- <action>
- Goal: <goal to be achieved>

## Background
- <problem / reason>

## Added Value
- _open_

## Stakeholders
- Involved: …
- Affected: …

## IT
- _open_

## Critical Success Factors
- _open_

## Resources
- _open_

## Implementation
- Time Horizon: _/5 – …
- Complexity: _/5 – …
- Cost: _/5 – …
- Risk: _/5 – …

## Required Activities for Implementation
- [ ] What — Who — When (next step | before merging | after merge | before go-live)

## Open Points
- <open question to the requester>
```

Wording: short, in bullet points, understandable for non-developers (the requester may be a business person, not a technical one). At most about 5 points per field – the image has limited space; details belong in the PR description or docs.

## Presenting

After each phase (start, plan, closing) and after significant changes:

1. `RENDER docs/action-canvas/<branch-slug>.md --png` (PNG needs `cairosvg` or `rsvg-convert`; if neither is available, try `pip install cairosvg`, otherwise the SVG is enough).
2. Show the image to the requester as an artifact: if a tool for sending/showing files is available (e.g. SendUserFile), hand over the PNG/SVG with it; otherwise state the path. The Markdown embeds the SVG, so it is also visible on the Git host (GitHub/GitLab).
3. Add a short note in the chat: phase, what is new, open questions.

## Renderer

The script `render_canvas.py` lives in the skill directory and is called from there; it is **not** copied into the project (Python standard library only; PNG optional). It reads the Markdown, checks mandatory fields per phase (`--check start|plan|final`, exit code 1 on gaps), warns about Implementation entries the image cannot show (duplicate scale, line without `n/5`, justification too long) and draws the canvas as a card layout (numbered badge and color per field): the label "ACTION CANVAS" and the long title on top; three cards (Added Value, Stakeholders, IT); in the middle row Implementation with four 1–5 bars and justifications on the left, a dark box with the short Measure plus Description and Background cards in the center, and the activities on the right (✓ done, ○ open, with a progress bar); at the bottom Critical Success Factors, Resources, Open Points. Image labels follow the canvas language (see "Language"). Text that is too long is shrunk and, if necessary, truncated with "… (full text in the Markdown)".

## Checklist before closing

- [ ] Fields 1–10 filled, Open Points optional
- [ ] All four Implementation values in the format `n/5` with justification
- [ ] No `_open_`, no unconfirmed `(Assumption)`; Open Points answered and removed (only deliberately deferred follow-ups remain)
- [ ] IT entries evidenced (location in the repo) or confirmed by the requester
- [ ] `--check final` green, SVG/PNG up to date, committed in the branch
- [ ] Canvas and chat in the requester's language (`lang=` set in the meta comment)
- [ ] Canvas presented to the requester
