This project uses pnpm.

Read `idea.md` for the game and `docs/decisions.md` for why it works this way. Before changing maps or puzzle rules, read `docs/map-design.md`.

For map work, follow the authoring workflow in `docs/puzzle-design.md`. Run `pnpm maps:check` as well as `pnpm check`, and inspect the routes, return visits and deduction proofs. Required world progression must be demonstrated without guesses or any damage. Stronger monsters survive attacks and cannot be bypassed with hearts or healing. Partial regions and regions without power rewards are expected. Prefer ground finds revealed by an action elsewhere before pickup, and review instant-pickup warnings; do not expose items through hidden tiles. Key reward placement and acquisition remain collaborative with Aslak; do not insert upgrades or weaken agreed objectives just to make validation pass.
