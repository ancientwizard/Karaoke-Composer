# AGENTS.md

Purpose
- Repository-level guidance for AI agents and contributors.
- Supply defaults, style, and constraints so agents don’t require repeated instructions.

How agents should use this file
- Read top-to-bottom; apply "Global defaults" first, then "Per-language" or "Per-folder" overrides.
- If a rule conflicts with an explicit in-request instruction, follow the request only if it explicitly says "override AGENTS.md".
- When uncertain, ask a clarifying question.

Global defaults
- Primary language: TypeScript. Create .ts files (no .js) unless an exception is stated or required for the use case.
- Module format: ESM (import/export). Target runtime: Node 18+.
- Package manager: npm.
- Line endings: LF. Encoding: UTF-8.
- Bracing style: place opening brace on the next line (Allman-style).
- Indentation: 2 spaces.
- Maximum line length: 100 characters; wrap instead of truncating.
- Typing: prefer strict types; use explicit return types on exported functions.
- Tests: use Jest; place tests next to modules as *.test.ts.
- Linting/Formatting: follow ESLint + Prettier defaults; respect any repo .eslintrc / .prettierrc.
- Commits: use Conventional Commits. Provide a short changelog entry for non-trivial changes.
- PRs: include summary, testing steps, and any migration notes.
- Security: never output secrets or credentials. Reference env vars via process.env and document required vars in README / .env.example.
- Licensing: include license header if repository uses one; otherwise do not add a third‑party license header.

Per-language / per-folder overrides
- If a folder contains its own AGENTS.md or config (tsconfig, eslint, package.json scripts), prefer the folder-local settings.
- For client-side code (e.g., src/web): follow framework-specific rules if present.
- For scripts or devtools: .ts is preferred; for shell tasks, use cross-platform node scripts rather than bash when possible.

Code generation rules (examples)
- File creation: include imports, exports, and a brief JSDoc for exported symbols.
- Formatting: run Prettier default rules; do not assume global config if a .prettierrc exists—use it.
- Error handling: validate inputs and return typed Errors or Result-like types. Do not swallow exceptions.
- Side effects: avoid global side effects on import. Export pure functions when possible.
- Dependencies: add to package.json and update lockfile. Prefer small, well-maintained packages. Avoid adding native modules without justification.
- Tests: include at least one unit test demonstrating main behavior. Use mocks for external I/O.

Behavioral rules for the agent
- When introducing breaking changes, bump major version or document migration in CHANGELOG.
    (were not here yet! not until we have our first functional app)
- If uncertain about project conventions, ask a human rather than guessing.
- Preserve existing code style unless AGENTS.md or requester directs a refactor.

Exceptions & overrides
- To override AGENTS.md in a single request, include a top-line explicit instruction: "AGENTS.md: override — <reason>".
- Local folder configs > AGENTS.md > global defaults.

Guidelines
- Enforce TypeScript:
  - "All code files must be written as TypeScript in a .ts file. (in as much is possible)"
- Brace style:
  - "All code must put starting { on the next line." except onliners and 
- Tests:
  - "Provide a Jest test file in src/tests/"
- Code types
 - I prefer Classes over functions where data and code co-exist
- Maintain a top of src files command block to introduce the subject
 - Followed by imports
 - Followed by code; functions and classes
 - The last three lines of all source files
  - empty line
  - a suitable // VIM: settings for the file type
  - // END || ## END
     (based on file type)
- Seeing files the agent may not have access to directly; ask to run the command

Where to find things
 - reference/ contains code and other files as reference material
      E.G. like how to create .cdg files
 - bin/ things I'll run, unless I ask yu wont make change here;
      Though I think two of these should be moved my me to the diag/ (TBD)
 - diag/ lots of tools etc to support/aide development
 - dist/ obvious
 - docs/ subject matter .md files
 - projects/  I'll explain later once Agent mode starts working again
 - src/ where our project code lives.

<!-- End of AGENTS.md -->