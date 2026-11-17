# Contributing

Thanks for taking a look. This is a small personal project, so the process is light.

## Before you start

Open an [issue](https://github.com/TranceMeli/OrganizeMe/issues) for anything bigger than a typo or a small fix, so we can agree on the approach first.

## Set up

Follow [Installation](README.md#installation) and [Quick start](README.md#quick-start) in the README.

## Checking a change

There are no automated tests yet, so please check by hand:

1. `cd frontend && npm run build` succeeds.
2. Open every tool (notebook, drawing, todos, code) in day and night mode and look for errors in the browser console.
3. Create, change, and delete an item in each tool, then reload and confirm the change was saved.
4. If you touched colors or text sizes, check that text keeps a contrast of at least 4.5 : 1 and that nothing is smaller than 12 px.
5. Operate the changed part with the keyboard only. Every control must show a focus ring.
6. Use a separate database while testing so your own notes stay untouched. In `backend`, run `DB_PATH=./test.db npm start` (PowerShell: `$env:DB_PATH='./test.db'; npm start`).

## Code style

- Follow the surrounding code: Vue single-file components with `<script setup>`, Pinia stores, and one folder per tool under `frontend/src/modules`.
- Colors, type sizes, and spacing come from the tokens at the top of the style block in `frontend/src/App.vue`. Avoid new literal values in components.
- Comment the reason, not the action. Explain constraints, workarounds, and non-obvious decisions, and delete commented-out code. Use `TODO(#issue):` with an issue number for open tasks.
- The user interface is in English.

## Submitting

1. Fork the repository and create a branch.
2. Keep each pull request to one change.
3. Describe what changed and why, and mention how you checked it.
4. Update the README when behavior, commands, or settings change.
