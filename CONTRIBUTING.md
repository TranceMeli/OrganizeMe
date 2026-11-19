# Contributing

Thanks for taking a look. This is a small personal project, so the process is light.

## Before you start

Open an [issue](https://github.com/TranceMeli/OrganizeMe/issues) for anything bigger than a typo or a small fix, so we can agree on the approach first.

## Set up

Follow [Installation](README.md#installation) and [Quick start](README.md#quick-start) in the README.

## Checking a change

Run the automated tests, see [tests.md](tests.md) for details:

1. `cd backend && npm test`
2. `cd frontend && npm test`
3. `cd frontend && npm run test:e2e`
4. `cd frontend && npm run test:e2e:production`
5. `cd frontend && npm run build`

Add or update a test with every change in behavior. A few things the tests cannot judge, so please also look at them yourself:

- Open every tool in day and night mode and check that the page looks right.
- Operate the changed part with the keyboard only.
- If you touched colors, the contrast tests tell you when a rule is broken; look at the result anyway.

The end-to-end tests use their own database. When you try the app by hand, use a separate one so your own notes stay untouched: in `backend`, run `DB_PATH=./test.db npm start` (PowerShell: `$env:DB_PATH='./test.db'; npm start`).

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
