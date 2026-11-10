<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# KS Gestión — repository guide

- Product language is Spanish (Paraguay); code identifiers stay in English.
- Keep business amounts exact. PYG values are integers (`bigint` in PostgreSQL).
- Never infer that a transfer is income or that every payment is an expense.
- Demo data must remain visibly labeled and isolated from Supabase integrations.
- Keep authenticated routes dynamic and avoid shared caching of user data.
- Add migrations under `supabase/migrations/`; never edit applied migrations.
- Do not commit real client spreadsheets, credentials, banking data, or exports. `reference/` is ignored.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before handoff.
