# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file demo: `index.html` is an "IT PMO" Kanban board (Backlog / In Progress / Blocked / Done) for a fictitious bank. Vanilla HTML/CSS/JS only. There is no package.json, build, lint or test setup, and no git repo.

## Running it

- Double-click `index.html`, or serve the folder: `python3 -m http.server 8765` and open http://localhost:8765/ (the in-app browser pane can't open `file://` URLs, so use the server there).
- There are no tests. Past verification was an ad-hoc jsdom smoke test kept outside this folder; recreate it if needed.

## Hard constraints (from the original spec — keep them)

- No frameworks, build step, external resources (fonts, CDNs, images) or storage APIs (localStorage, sessionStorage, IndexedDB, cookies). Data is in memory and intentionally resets on refresh.
- The only network call is the FormSubmit AJAX POST in `notifyNewTask()`. The user's email must appear only inside `FORMSUBMIT_ENDPOINT`.
- No `!important`; styling uses CSS custom properties (tokens on `:root`).
- No native `confirm()`: deletion uses an inline "Delete? Yes / No".
- No real UOB logo or trademarks: the header is a plain-text "IT PMO" wordmark.
- Accessibility must be kept: `label for` on every field, `aria-live="polite"` toast region, `aria-label` on icon buttons, visible `:focus-visible` rings, and a keyboard "Move ▸" select on every card as the alternative to drag and drop.

## Architecture

All JS is one `<script>` block, organised in commented sections: CONFIG, STATE, HELPERS, seed data, render, actions, form, events, `init()`.

- **Config:** `FORMSUBMIT_ENDPOINT` (placeholder `YOUR_EMAIL@example.com`, so notification fails with a warning toast until it is set), `ID_PREFIX` (`UOB-ITPM-`), `SUBJECT_PREFIX`, and the STATUSES / PROJECTS / CATEGORIES / PRIORITIES lists. Changing a list also changes the form and filter options, which are populated from these in `init()`.
- **State:** a single `state = { tasks, filters }` plus `idCounter`, `pendingDeleteId` (which card shows the delete confirm) and `draggedId`.
- **One-way rendering:** only `renderBoard()` / `renderCard()` / `renderSummary()` touch card DOM, and they rebuild from `state` through `applyFilters()`. Mutators (`addTask`, `moveTask`, `deleteTask`) change state then call `renderBoard()`. Never edit card DOM directly.
- **Escaping:** card HTML is built with template strings, so every user-supplied value must go through `escapeHtml()`.
- **Events:** `wireBoardEvents()` uses delegated listeners on `#board` for clicks, `change` (Move select) and the HTML5 drag events. This keeps handlers working across re-renders.
- **Add-task flow (`handleSubmit`):** `validateForm()` shows inline per-field errors (`err-<field>`), then the card is added optimistically, the button shows "Sending…", and `notifyNewTask()` runs inside try/catch. On failure a warning toast reads "Card added locally — email notification failed"; the card stays regardless.
- **Overdue:** `isOverdue()` is true for any non-Done task whose due date is before today. Seed due dates are computed relative to today (`offsetISO`) so some are always overdue.
- **Layout:** columns are flex and stack below 768px via a media query. Priority is shown by a coloured left border plus a text pill, not colour alone.
