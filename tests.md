# Tests

OrganizeMe is tested on four levels. Each level answers a different question, so none of them replaces another.

| Level | Tool | Answers the question | Location | Tests |
|---|---|---|---|---|
| API and server | Node test runner | Does the backend store and return the right data, and does the server start and upgrade a database correctly? | `backend/test/` | 38 |
| Unit and component | Vitest, Vue Test Utils, jsdom | Does each function, store, and component behave correctly on its own? | `frontend/tests/unit/` | 355 |
| Browser, development server | Playwright with Chromium, axe-core | Does the whole app work in a real browser, including accessibility and failures? | `frontend/tests/e2e/` | 127 |
| Browser, production build | Playwright with Chromium | Does the built app that a user would receive work? | `frontend/tests/production/` | 11 |
| Other browsers | Playwright with Firefox and WebKit | Do the core features work outside Chromium? | `frontend/tests/e2e/` (core specs) | 62 in Firefox, 61 in WebKit (1 skipped, see [Known gaps](#known-gaps)) |

In total, 655 test runs. Last full run: November 19, 2026. No test failed.

A GitHub Actions workflow is set up to run all of this on every push, see [Continuous integration](#continuous-integration).

## Running the tests

Install the dependencies first, see [Installation](README.md#installation).

```bash
cd backend
npm test                       # API and server tests
```

```bash
cd frontend
npm test                       # unit and component tests
npm run test:watch             # re-run on every change
npm run test:coverage          # with a coverage report in frontend/coverage/

npm run test:e2e               # browser tests in Chromium, against the dev server
npm run test:e2e:production    # smoke tests against the built app
npm run test:e2e:browsers      # core browser tests in Firefox and WebKit
```

The browser tests need browsers. Playwright installs its own, once:

```bash
cd frontend
npx playwright install chromium firefox webkit
```

To use a browser that is already installed instead of Chromium, name it. Microsoft Edge and Google Chrome both work:

```bash
PW_CHANNEL=msedge npm run test:e2e      # PowerShell: $env:PW_CHANNEL='msedge'; npm run test:e2e
```

The browser tests start their own backend and frontend with a throw-away database in the temporary folder of your system, so your own data is never touched. The development suite uses ports 3181 and 5281, the production suite 3182 and 5283. A full Chromium run takes about nine minutes because all tests share one database and run one after another.

Useful variants:

```bash
npx playwright test layout.spec.js            # one file
npx playwright test -g "night"                # tests whose name matches
npx playwright show-report                    # open the HTML report of the last run
```

The key states are saved as screenshots in `docs/tests/` on every Chromium run, which is where the images below come from. Runs in Firefox and WebKit save theirs in `docs/tests/browsers/`.

## Continuous integration

`.github/workflows/tests.yml` runs on every push to `main` and on every pull request:

| Job | What it runs |
|---|---|
| API tests | `npm ci` and `npm test` in `backend` |
| Unit tests and build | `npm run test:coverage` and `npm run build` in `frontend`, coverage report as artifact |
| Browser tests (Chromium) | the development suite and the production suite, reports as artifacts |
| Browser tests (Firefox, WebKit) | the core browser tests, one job per browser |

The workflow could not be run on this machine, only checked for valid syntax. Its first real run happens on the first push. If a step fails there for a reason that does not show up locally, the likely candidates are the browser installation (`playwright install --with-deps`) and the native SQLite module.

## What the API and server tests cover

| File | Tests | Checked |
|---|---|---|
| `api.test.js` | 33 | Entries, drawings, todos and snippets: create with generated ids and defaults, list, update, delete, a missing title is rejected, the Markdown mode, PNG data URLs, a 2 MB drawing is accepted and a body above 10 MB is rejected, the done flag as 1 and 0, multi-line and Unicode code, newest item first even within the same second, CORS, unique ids, quotes in titles cannot break the SQL, unknown routes answer 404, updating or deleting an unknown id answers success (documented, see [Known gaps](#known-gaps)) |
| `server.test.js` | 5 | `server.js` started as a real process: it listens on `PORT`, creates the database at `DB_PATH`, keeps the data across a restart, exits with a clear message when the database cannot be opened, and upgrades a database from before the Markdown mode existed |

## What the unit and component tests cover

| File | Tests | Checked |
|---|---|---|
| `utils/debounce.test.js` | 6 | Delay, latest arguments win, a separate timer per item, custom ids, failed saves are logged |
| `utils/api.test.js` | 11 | Request paths and methods, JSON bodies, error messages, retryable and non-retryable failures |
| `utils/date.test.js` | 3 | US date format with weekday, padding, empty values |
| `config.test.js` | 3 | The backend address, its override with `VITE_API_BASE`, and its use by every request |
| `services.test.js` | 16 | Each of the four services calls the right path and method |
| `composables/useSaveStatus.test.js` | 12 | Idle, saving, saved, error, parallel requests, stale failures, retry, dismiss |
| `composables/useDialog.test.js` | 6 | Confirm resolves true or false, a second dialog cancels the first, defaults |
| `stores/entryStore.test.js` | 17 | Load, create, delete with confirmation, debounced autosave, switching entries, a mode switch starts empty |
| `stores/todoStore.test.js` | 15 | Open and done lists, trim and ignore blank titles, toggle flips at once, rename, delete |
| `stores/drawingStore.test.js` | 11 | Numbering, one save per burst of strokes, a pending save survives switching |
| `stores/codeStore.test.js` | 10 | Starter snippet, title, code and language saves, delete, language list |
| `components/simple-components.test.js` | 15 | Page actions, item list, empty state, loading skeleton |
| `components/SaveStatus.test.js` | 7 | Live region, every state in words and icon, Retry and Dismiss |
| `components/DialogHost.test.js` | 17 | Alert dialog roles, Cancel focused first, Escape, backdrop click, focus trap, focus returns, also in browsers that do not focus clicked buttons |
| `components/todo-components.test.js` | 20 | Todo editor and preview: sections, add, toggle, rename, delete, names for screen readers, progress and its edge cases |
| `components/preview-components.test.js` | 12 | Entry preview (rich text, Markdown, badges, dates) and drawing preview |
| `components/EntryEditor.test.js` | 20 | The real rich text editor in jsdom: toolbar, text box role, saving, bold, font size, switching entries never mixes up text, Markdown mode, mode switch |
| `components/DrawingCanvas.test.js` | 24 | Pen and eraser strokes with a recorded canvas, colour and width, one save per burst, clear with confirmation, resizing, switching drawings |
| `components/code-components.test.js` | 18 | Code editor with a fake Monaco (language, theme, typing, switching without saving, dispose) and the highlighted preview, including unknown languages and HTML in code |
| `App.test.js` | 45 | Start-up, skeleton, tabs, shortcuts, empty states, server errors, night mode, easy-read, saved settings, blocked storage, resizing, narrow layout |
| `design-rules.test.js` | 67 | Colour contrast of every token pair in day and night mode, no text below 12 px, no removed focus rings, reduced motion, reading width |

### Design rules as tests

`design-rules.test.js` reads the design tokens from `frontend/src/App.vue` and calculates the WCAG contrast of every pair that matters. If someone changes a colour and breaks a rule, the test names the pair that failed.

| Rule | Limit |
|---|---|
| Body and secondary text on every surface | at least 4.5 : 1 |
| Text on the accent of each tool, also on hover | at least 4.5 : 1 |
| Outlines of fields and buttons | at least 3 : 1 |
| Error, success, and dialog text | at least 4.5 : 1 |
| Font size | nothing below 12 px or 0.75 rem |
| Focus outline | never removed without a replacement |
| Animations | stopped for `prefers-reduced-motion` |
| Entry text | width capped at 65 characters |

### Coverage

`npm run test:coverage` measures the unit and component tests. Only `src/main.js`, which just mounts the app, is left out. The statements below are from the last run.

| Area | Statements |
|---|---|
| Whole frontend | 93.8 % (branches 89.1 %, functions 92.3 %, lines 95.4 %) |
| `App.vue` | 87.7 % |
| Shared components | 98 to 100 % per file |
| Stores | 97 to 100 % per file |
| `EntryEditor.vue` | 91.5 % |
| `CodeEditor.vue` | 94.3 % |
| `CodePreview.vue` | 92.8 % |
| `TodoEditor.vue` | 87.0 % |
| `DrawingCanvas.vue` | 92.7 % |

The coverage figure is for the unit and component tests only. The browser tests are not measured, so the real coverage is higher. Monaco and the canvas are replaced by fakes in the unit tests, which check what the components ask for, not what the browser draws. The browser tests check that.

## What the browser tests cover

`frontend/tests/e2e/`, run in Chromium at 1400 × 820 px unless the test says otherwise.

| File | Tests | Checked |
|---|---|---|
| `notebook.spec.js` | 11 | First entry from the empty state, autosave and reload, saved time, rename, switching entries without mixing content, toolbar formatting, Markdown preview, mode switch, numbering |
| `drawing.spec.js` | 11 | Tools, pen and eraser on a real canvas, chosen colour, saved PNG, reload, clear with confirmation, new and delete |
| `todos.spec.js` | 12 | Sections, progress, add with Enter and the plus button, blank todos, check off and back, rename, delete with confirmation, all done |
| `code.spec.js` | 10 | Snippet in Monaco, highlighted preview, typing is saved, rename, language, new snippet, switching without mixing, delete |
| `layout.spec.js` | 30 | Tabs and shortcuts, tooltips, night mode and its persistence, easy-read font, resizing and its limits, narrow layout, no sideways scrolling from 420 to 1920 px |
| `states.spec.js` | 18 | Loading skeleton, three empty states, server error and Try again, failed save and Retry, Dismiss, slow save, the confirmation dialog |
| `accessibility.spec.js` | 24 | axe scan of every tool in both modes plus dialog, empty state, narrow layout and error banner, keyboard operation, focus rings, names, live region, reduced motion |
| `robustness.spec.js` | 11 | The connection drops and returns mid-session, several failed edits and one Retry, a later save replaces an old failure, two tabs (last save wins), 300 entries, a 3 MB drawing, damaged saved settings, no requests to other websites, bundled fonts |

### Production build tests

`frontend/tests/production/production.spec.js`, 11 tests. They build the app with `vite build`, serve it with `vite preview`, and use the same helpers as the browser tests. The development server adds tools such as the Vue devtools, so only these tests show what a user receives.

- the app starts, loads data, and a first entry can be written and saved
- every tool opens without console errors or warnings, without requests to other websites, and without failed requests
- no development tooling is included
- scripts, styles and fonts are served with the right content types, and both bundled fonts load
- the code editor starts with a worker and highlights
- the app works when local storage is blocked, and remembers its settings when it is not
- the JavaScript of the first page stays below 6 MB (it is about 5 MB today)

### Accessibility scan

The scan uses [axe-core](https://github.com/dequelabs/axe-core) with the rule sets WCAG 2.0, 2.1, and 2.2 level A and AA. The Monaco editor and the Vue devtools button of the dev server are third-party code and are excluded. Everything else must report zero violations.

### Other browsers

Firefox and WebKit run the specs that exercise the app itself: notebook, drawing, todos, code, and states. The axe scan, the layout measurements, and the robustness checks use Chromium tooling or Chromium-specific numbers and stay in Chromium.

| Browser | Tests | Result |
|---|---|---|
| Firefox | 62 | 62 passed |
| WebKit | 62 | 61 passed, 1 skipped |

## Problems the tests found

Writing the tests turned up real problems in the app. All of them are fixed.

| Found by | Problem | Fix |
|---|---|---|
| axe scan | Selects, todo checkboxes and todo titles had no accessible name; the rich text area was not announced as a text box; the scrolling drawing preview could not be reached with the keyboard | Names, roles and a tab stop added |
| Browser tests | Entries created within the same second came back in any order | The backend sorts by `rowid` as well |
| Server test | A database that could not be opened crashed the server with a stack trace instead of the intended message | `db.js` reports the failed open to `initDb()` |
| Production test | Monaco logged worker warnings and ran its worker code on the main thread, which can freeze the page | `monacoEnvironment.js` provides a worker per language |
| WebKit run | The focus did not return to the delete button after the dialog closed, because Safari does not focus clicked buttons | The dialog remembers the pressed control |
| Unit test | A comment in a template turned `SaveStatus.vue` into a fragment | The comment moved into the script |

## Screenshots

The images are produced by the browser tests, so they show what the tests actually saw. The two report images were taken from the HTML reports of the last run.

### Main pages

| Notebook | Notebook, night mode |
|---|---|
| ![Notebook](docs/tests/notebook.png) | ![Notebook in night mode](docs/tests/notebook-night.png) |

| Notebook with a Markdown entry | Easy-read entry font |
|---|---|
| ![Markdown entry](docs/tests/notebook-markdown.png) | ![Easy-read mode](docs/tests/notebook-easy-read.png) |

| Drawing | Todos |
|---|---|
| ![Drawing](docs/tests/drawing.png) | ![Todos](docs/tests/todos.png) |

| Code | 300 entries |
|---|---|
| ![Code](docs/tests/code.png) | ![A notebook with 300 entries](docs/tests/many-entries.png) |

### States

| Loading | Server unreachable |
|---|---|
| ![Loading skeleton](docs/tests/state-loading.png) | ![Server error banner](docs/tests/state-server-error.png) |

| Save failed, with Retry | Connection lost during typing |
|---|---|
| ![Failed save](docs/tests/state-save-failed.png) | ![Offline](docs/tests/state-offline.png) |

| Empty notebook | Empty drawing |
|---|---|
| ![Empty notebook](docs/tests/state-empty-notebook.png) | ![Empty drawing](docs/tests/state-empty-drawing.png) |

| Empty code |
|---|
| ![Empty code](docs/tests/state-empty-code.png) |

### Dialog and focus

| Delete confirmation | Delete confirmation, night |
|---|---|
| ![Delete dialog](docs/tests/dialog-delete.png) | ![Delete dialog at night](docs/tests/dialog-delete-night.png) |

| Visible focus ring |
|---|
| ![Focus ring on a button](docs/tests/focus-ring.png) |

### Narrow screen

| Write page | Entries page |
|---|---|
| ![Narrow write page](docs/tests/narrow-write.png) | ![Narrow entries page](docs/tests/narrow-entries.png) |

### Production build

| The built app |
|---|
| ![Notebook in the production build](docs/tests/production-notebook.png) |

### Other browsers

| Firefox | WebKit |
|---|---|
| ![Notebook in Firefox](docs/tests/browsers/firefox-notebook.png) | ![Notebook in WebKit](docs/tests/browsers/webkit-notebook.png) |

| Firefox, drawing | WebKit, drawing |
|---|---|
| ![Drawing in Firefox](docs/tests/browsers/firefox-drawing.png) | ![Drawing in WebKit](docs/tests/browsers/webkit-drawing.png) |

### Test reports

| Playwright report | Coverage report |
|---|---|
| ![Playwright HTML report](docs/tests/report-playwright.png) | ![Coverage report](docs/tests/report-coverage.png) |

## Known gaps

These are things the tests do not cover, or pin down on purpose.

- **Screen readers.** axe finds missing names and roles, but it cannot judge how the page sounds. Check that by hand now and then.
- **Touch devices.** The narrow layout is tested with a small window, not with a touch screen.
- **Visual regressions.** The screenshots document the states but are not compared pixel by pixel, because fonts and rendering differ between systems.
- **Safari on a Mac.** WebKit is tested through Playwright's build on Windows, which is close to Safari but not the same.
- **One WebKit test is skipped on Windows.** "Saves typed code" selects all text in Monaco with Ctrl+A, which Playwright's WebKit on Windows does not deliver. It runs on other systems.
- **Markdown is rendered without sanitising**, see [Known limitations](README.md#known-limitations). There is no test for scripts in Markdown, because that would fail today. Write one together with the fix.
- **Two tabs overwrite each other.** There is no live sync. A test pins the current behaviour: the tab that saves last wins, and its old title can overwrite a rename from the other tab.
- **Unknown ids answer success.** Updating or deleting an id that does not exist returns `{ "success": true }` instead of 404. Tests pin this so that a change is a decision, not an accident.
- **The backend rejects bad input only by accident.** A missing title fails because of a database constraint. The tests check that it is rejected, not which status code it uses.
- **The GitHub Actions workflow has not run yet.** It was checked for syntax only.

## Adding a test

1. Put a test for a function, store or component next to its siblings in `frontend/tests/unit/`. Mock the service of a store, as the existing store tests do.
2. Put a test for something a user does in `frontend/tests/e2e/`. Start with `resetData()` and `seed()` from `helpers.js` so the test does not depend on earlier ones. Use `openNotebook(page)` when the test needs the rich text editor.
3. Put a test that must run against the built app in `frontend/tests/production/`.
4. Call `shot(page, 'name')` when a state is worth showing in this file.
5. Write the test name as a sentence that says what is expected, for example "keeps the todo when the user cancels the deletion".
6. Run the suites and update the counts in this file.
