<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# 3D exchange floor (src/game)

- The `/` route mounts the three.js scene with `ssr: false`; per-frame state lives in `src/game/sim/roam.ts` (plain TS) and one `useFrame` in `src/game/scene/Characters.tsx` steps it. Do not add a second `useFrame` that mutates agent state.
- All office/character textures are canvas-generated in `src/game/scene/textures.ts`; no external asset fetches.
- Dev hook: the scene wrapper sets `data-scene-ready="1"` on the first real frame (see `/tmp/verify.py` harness usage).
