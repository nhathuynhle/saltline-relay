# Saltline Relay

A browser FPS set on a coastal communications outpost. Recover the data core and extract at the dock before the relay goes dark. Use the shipping containers and service buildings to break the patrol's line of sight. Headshots drop a guard in one shot.

Run `node serve.ts` and open http://127.0.0.1:8080 in desktop Chrome. Select **Enter the relay** to capture the mouse.

| Control | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Look |
| Left mouse | Fire |
| R | Reload |
| E | Recover the core or extract |
| Esc | Pause and release the mouse |

The game uses static ES modules under `game/`. Three.js is vendored with its license. The station geometry, guard models and synthesized audio are created locally.

Run `node main.ts` with `MAKEFUN_OUTPUT_DIR` set to the desired output directory to package the game, screenshots and Make.fun dossier.
