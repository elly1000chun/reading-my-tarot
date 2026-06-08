# Repository Guidelines

## Project Structure & Module Organization

This repository is a small JavaScript library for Tarot deck management and readings.

- `src/tarot.js`: main library source and default export.
- `src/webpack.config.js`: Webpack build configuration for UMD, ESM, and CommonJS bundles.
- `src/license.config.js`: build-time package metadata and license banner configuration.
- `dist/`: generated distributable bundles referenced by `package.json`.
- `decks/`: bundled Tarot deck JSON data, organized by language such as `decks/en/default.json`.
- `.github/`: issue templates and the manual build workflow.
- `doc/`: project analysis and local documentation.

There is currently no dedicated test directory. If tests are added, prefer `test/` at the repository root.

## Build, Test, and Development Commands

- `npm install`: install development dependencies from `package-lock.json`.
- `npm run build`: build minified bundles into `dist/` using Webpack.
- `npm test`: not currently defined.

This project does not provide a local development server. To test usage manually, import `src/tarot.js` or a built file from `dist/` in a small Node ESM script.

## Coding Style & Naming Conventions

Use modern JavaScript with ESM syntax. Keep source files concise and focused. The existing code uses two-space indentation in `src/tarot.js`, JSDoc comments for public methods, double quotes in library code, and descriptive method names such as `initializeDeck`, `addSpread`, and `doReading`.

Class names should use `PascalCase`; functions, methods, and variables should use `camelCase`. Deck files should use lowercase descriptive names, for example `decks/en/default.json`.

No formatter or linter is configured. Match the style of the file you edit.

## Testing Guidelines

No test framework is installed yet. For new tests, use Vitest with tests under `test/`, for example `test/tarot.test.js` and `test/decks.test.js`.

Prioritize coverage for deck initialization, spread validation, card drawing, reading output shape, and error cases. Mock randomness with Vitest's `vi.spyOn(Math, "random")` when deterministic results are needed.

## Commit & Pull Request Guidelines

Recent commit subjects are short and descriptive, such as `updated package.json`, `added .gitignore`, and `doc: analyze project with codex`. Use concise imperative or descriptive subjects, optionally with a scope prefix like `doc:`.

Pull requests should include a short summary, motivation or linked issue, testing performed, and notes about generated `dist/` changes when the build output is updated.

## Data & Build Notes

Deck JSON is runtime data. Keep card objects consistent across files and include at least `name`, `meanings`, and `description`. When changing source or build settings, run `npm run build` and inspect the generated files before submitting.
