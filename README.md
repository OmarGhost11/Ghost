# Ghost Brawl

A small Brawl-Stars-style top-down arena shooter that runs entirely in the
browser. **Showdown mode**: pick a brawler, drop into a 28x28 arena with 7
bots, grab power cubes, dodge the closing storm, be the last one standing.

## Run

It's pure static files. Just open `index.html` from a local web server (any
will do, the game uses no fetch APIs but a `file://` URL works in most
browsers too):

```sh
# from the repo root
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or push to a branch and enable GitHub Pages.

## Controls

| Action | Key |
|--------|-----|
| Move | `WASD` / Arrow keys |
| Aim | Mouse |
| Shoot | Left click |
| Super | Space *or* Right click (when bar is full) |

## Brawlers

| Brawler | Role | Super |
|---------|------|-------|
| Shelly | Shotgunner | Wide cone of heavy pellets with knockback |
| Colt | Sharpshooter | Long burst of fast bullets |
| Bull | Heavyweight | Berserker dash that smashes through walls |
| El Primo | Brawler | Flying elbow drop with AoE slam |
| Piper | Sniper | Leap away dropping a ring of grenades |

## Mechanics

- **Power cubes** scattered around the map: +10% HP and +5% damage each
  (and a full heal on pickup). Killed brawlers drop the cubes they collected.
- **Bushes** hide you from enemies that aren't already next to you.
- **Walls** block bullets and movement; most can be destroyed.
- **Water** blocks movement but not bullets.
- **Storm** starts shrinking the safe area at 35s. Outside = take damage.
- **Super charges** by dealing damage and by taking damage. Kills give a
  big chunk of charge plus a small heal.

## Project layout

```
index.html      - menu + HUD + canvas
css/style.css   - menu and HUD styling
js/brawlers.js  - brawler stats and super definitions
js/input.js     - keyboard + mouse input
js/world.js     - arena generation, tiles, bushes, cubes, storm, collision
js/entity.js    - Brawler (player + AI), Bullet, Effect, AI brain
js/game.js      - Game class: loop, camera, bullet vs brawler, HUD, win/lose
js/main.js      - menu wiring and game start/restart
```
