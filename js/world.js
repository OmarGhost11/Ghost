// =====================================================================
// world.js - Arena generation, tile collision, bushes, walls, cubes, storm
// =====================================================================
// Tile types:
//   0 = grass            (walkable, visible)
//   1 = wall             (blocks bullets and movement, destructible)
//   2 = bush             (walkable, hides occupants from far away)
//   3 = water            (blocks movement, NOT bullets)
//   4 = indestructible   (the outer arena rock ring)
// =====================================================================

const TILE = { GRASS: 0, WALL: 1, BUSH: 2, WATER: 3, ROCK: 4 };
const TS = 64; // tile size in world units (px @ zoom 1)

class World {
  constructor(w = 28, h = 28) {
    this.w = w;
    this.h = h;
    this.tiles = new Uint8Array(w * h);
    this.cubes = [];     // power cubes scattered on the ground
    this.storm = {
      // Shrinking lethal ring. We compute a square inset from the arena.
      activeAt: 35,        // seconds: storm starts closing
      shrinkRate: 0.35,    // tiles per second on each side
      inset: 0,            // current inset from each edge in tiles
      maxInset: Math.floor(Math.min(w, h) / 2) - 3,
      damagePerSec: 80,    // damage to anything outside the safe zone
    };
    this.bulletHoles = []; // visual scorch marks
    this.generate();
  }

  // ---------- Tile helpers ----------
  idx(tx, ty) { return ty * this.w + tx; }
  inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; }
  get(tx, ty) {
    if (!this.inBounds(tx, ty)) return TILE.ROCK;
    return this.tiles[this.idx(tx, ty)];
  }
  set(tx, ty, v) {
    if (!this.inBounds(tx, ty)) return;
    this.tiles[this.idx(tx, ty)] = v;
  }
  tileAtWorld(x, y) {
    return this.get(Math.floor(x / TS), Math.floor(y / TS));
  }
  isSolidForMove(t)    { return t === TILE.WALL || t === TILE.ROCK || t === TILE.WATER; }
  isSolidForBullet(t)  { return t === TILE.WALL || t === TILE.ROCK; }

  // World pixel size
  get pxW() { return this.w * TS; }
  get pxH() { return this.h * TS; }

  // ---------- Generation ----------
  generate() {
    const w = this.w, h = this.h;
    // Outer rock ring
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
          this.set(x, y, TILE.ROCK);
        } else {
          this.set(x, y, TILE.GRASS);
        }
      }
    }

    // Symmetrical-ish wall clumps. We place a handful of "blobs" then mirror.
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    const tries = 40;
    for (let i = 0; i < tries; i++) {
      const bx = 2 + Math.floor(Math.random() * (Math.floor(cx) - 1));
      const by = 2 + Math.floor(Math.random() * (Math.floor(cy) - 1));
      const size = 1 + Math.floor(Math.random() * 3);
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const tx = bx + dx, ty = by + dy;
          if (Math.random() < 0.7) {
            this._mirrorPlace(tx, ty, TILE.WALL);
          }
        }
      }
    }

    // Bushes - patches around the map
    for (let i = 0; i < 60; i++) {
      const bx = 2 + Math.floor(Math.random() * (w - 4));
      const by = 2 + Math.floor(Math.random() * (h - 4));
      const size = 1 + Math.floor(Math.random() * 3);
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          if (Math.random() < 0.5) {
            const tx = bx + dx, ty = by + dy;
            if (this.get(tx, ty) === TILE.GRASS) {
              this._mirrorPlace(tx, ty, TILE.BUSH);
            }
          }
        }
      }
    }

    // A small water pond near the center
    if (Math.random() < 0.5) {
      const px = Math.floor(cx) - 1, py = Math.floor(cy) - 1;
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          if ((dx === 0 || dx === 2) && (dy === 0 || dy === 2)) continue;
          this._mirrorPlace(px + dx, py + dy, TILE.WATER);
        }
      }
    }

    // Carve open spawn rings at the corners + center so nobody starts stuck.
    const safe = [
      [3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4],
      [Math.floor(cx), Math.floor(cy)],
    ];
    for (const [sx, sy] of safe) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const t = this.get(sx + dx, sy + dy);
          if (t === TILE.WALL || t === TILE.WATER) {
            this.set(sx + dx, sy + dy, TILE.GRASS);
          }
        }
      }
    }

    // Scatter power cubes on grass. Try several minimum-spacing values
    // so a crowded arena still gets enough cubes.
    this.cubes.length = 0;
    const targetCubes = 8;
    const spacings = [TS * 2.5, TS * 1.8, TS * 1.2, TS * 0.8, 0];
    for (const minDist of spacings) {
      let attempts = 0;
      while (this.cubes.length < targetCubes && attempts < 600) {
        attempts++;
        const tx = 2 + Math.floor(Math.random() * (w - 4));
        const ty = 2 + Math.floor(Math.random() * (h - 4));
        if (this.get(tx, ty) !== TILE.GRASS) continue;
        const x = tx * TS + TS / 2;
        const y = ty * TS + TS / 2;
        if (minDist > 0 &&
            this.cubes.some(c => Math.hypot(c.x - x, c.y - y) < minDist)) continue;
        this.cubes.push({ x, y, alive: true, bob: Math.random() * Math.PI * 2 });
      }
      if (this.cubes.length >= targetCubes) break;
    }
  }

  // Helper: place a tile and its 4-fold mirror so the arena feels symmetric
  _mirrorPlace(tx, ty, type) {
    const w = this.w, h = this.h;
    const points = [
      [tx, ty],
      [w - 1 - tx, ty],
      [tx, h - 1 - ty],
      [w - 1 - tx, h - 1 - ty],
    ];
    for (const [x, y] of points) {
      // Don't overwrite the rock ring or other walls
      if (this.get(x, y) === TILE.GRASS) this.set(x, y, type);
    }
  }

  // ---------- Spawn points: 8 corners-ish, evenly spaced ----------
  spawnPoints() {
    const pts = [];
    const w = this.w, h = this.h;
    const ring = [
      [3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4],
      [Math.floor(w / 2), 3], [Math.floor(w / 2), h - 4],
      [3, Math.floor(h / 2)], [w - 4, Math.floor(h / 2)],
    ];
    for (const [tx, ty] of ring) {
      pts.push({ x: tx * TS + TS / 2, y: ty * TS + TS / 2 });
    }
    return pts;
  }

  // ---------- Update (storm) ----------
  update(dt, gameTime) {
    if (gameTime > this.storm.activeAt) {
      this.storm.inset = Math.min(
        this.storm.maxInset,
        this.storm.inset + this.storm.shrinkRate * dt
      );
    }
    // Bob cubes
    for (const c of this.cubes) c.bob += dt * 3;
  }

  // Returns true if (x,y) world position is OUTSIDE the safe zone (in storm)
  inStorm(x, y) {
    const i = this.storm.inset;
    if (i <= 0) return false;
    const minX = i * TS, maxX = (this.w - i) * TS;
    const minY = i * TS, maxY = (this.h - i) * TS;
    return x < minX || x > maxX || y < minY || y > maxY;
  }

  // ---------- Collision: circle vs solid tiles ----------
  // Resolves an entity's circular body against solid tiles.
  // Returns the corrected (x,y).
  resolveCircle(x, y, r) {
    const tilesToCheck = 2;
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    for (let oy = -tilesToCheck; oy <= tilesToCheck; oy++) {
      for (let ox = -tilesToCheck; ox <= tilesToCheck; ox++) {
        const cx = tx + ox, cy = ty + oy;
        const t = this.get(cx, cy);
        if (!this.isSolidForMove(t)) continue;
        // AABB of tile
        const left = cx * TS, top = cy * TS, right = left + TS, bot = top + TS;
        // Closest point on AABB to circle center
        const px = Math.max(left, Math.min(x, right));
        const py = Math.max(top, Math.min(y, bot));
        const dx = x - px, dy = y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 0.0001;
          const overlap = r - d;
          x += (dx / d) * overlap;
          y += (dy / d) * overlap;
        }
      }
    }
    return { x, y };
  }

  // Returns the first solid tile hit by a ray from (x0,y0) to (x1,y1)
  // for bullet collision. {hit:true, x, y, tx, ty, type} or {hit:false}
  raycastBullet(x0, y0, x1, y1) {
    // Step in small increments. For our short-ish bullets per frame this is fine.
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(2, Math.ceil(dist / (TS * 0.25)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + dx * t;
      const y = y0 + dy * t;
      const tile = this.tileAtWorld(x, y);
      if (this.isSolidForBullet(tile)) {
        return {
          hit: true, x, y,
          tx: Math.floor(x / TS), ty: Math.floor(y / TS), type: tile,
        };
      }
    }
    return { hit: false };
  }

  damageWall(tx, ty) {
    if (this.get(tx, ty) === TILE.WALL) {
      this.set(tx, ty, TILE.GRASS);
      return true;
    }
    return false;
  }

  // True if the position (entity center) is inside a bush tile
  inBush(x, y) {
    return this.tileAtWorld(x, y) === TILE.BUSH;
  }

  // ---------- Rendering ----------
  draw(ctx, view) {
    // view = {x,y,w,h} in world coords; only draw visible tiles
    const x0 = Math.max(0, Math.floor(view.x / TS));
    const y0 = Math.max(0, Math.floor(view.y / TS));
    const x1 = Math.min(this.w - 1, Math.ceil((view.x + view.w) / TS));
    const y1 = Math.min(this.h - 1, Math.ceil((view.y + view.h) / TS));

    // Base grass
    ctx.fillStyle = "#3a7a36";
    ctx.fillRect(x0 * TS, y0 * TS, (x1 - x0 + 1) * TS, (y1 - y0 + 1) * TS);

    // Subtle grass checker
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = this.tiles[this.idx(tx, ty)];
        const px = tx * TS, py = ty * TS;
        if (t === TILE.GRASS) {
          if ((tx + ty) & 1) {
            ctx.fillStyle = "#458a40";
            ctx.fillRect(px, py, TS, TS);
          }
        } else if (t === TILE.WATER) {
          ctx.fillStyle = "#2c6fb0";
          ctx.fillRect(px, py, TS, TS);
          ctx.fillStyle = "rgba(255,255,255,.15)";
          ctx.fillRect(px + 6, py + 10, TS - 12, 4);
          ctx.fillRect(px + 14, py + 26, TS - 28, 3);
        }
      }
    }

    // Walls + rocks (drawn with a chunky 3D look)
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = this.tiles[this.idx(tx, ty)];
        if (t !== TILE.WALL && t !== TILE.ROCK) continue;
        const px = tx * TS, py = ty * TS;
        const top    = t === TILE.ROCK ? "#8d6d4a" : "#d6c089";
        const side   = t === TILE.ROCK ? "#5a4326" : "#a3895a";
        const bottom = t === TILE.ROCK ? "#3b2c19" : "#6e5a36";
        // Body
        ctx.fillStyle = side;
        ctx.fillRect(px, py, TS, TS);
        // Top highlight
        ctx.fillStyle = top;
        ctx.fillRect(px + 3, py + 3, TS - 6, TS - 12);
        // Bottom shadow
        ctx.fillStyle = bottom;
        ctx.fillRect(px, py + TS - 8, TS, 8);
      }
    }

    // Bushes (puffy)
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = this.tiles[this.idx(tx, ty)];
        if (t !== TILE.BUSH) continue;
        const px = tx * TS, py = ty * TS;
        ctx.fillStyle = "#1c5226";
        ctx.beginPath();
        ctx.arc(px + 18, py + 24, 16, 0, Math.PI * 2);
        ctx.arc(px + 44, py + 22, 18, 0, Math.PI * 2);
        ctx.arc(px + 30, py + 44, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2b7637";
        ctx.beginPath();
        ctx.arc(px + 18, py + 22, 12, 0, Math.PI * 2);
        ctx.arc(px + 44, py + 20, 14, 0, Math.PI * 2);
        ctx.arc(px + 30, py + 40, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Power cubes
    for (const c of this.cubes) {
      if (!c.alive) continue;
      const yo = Math.sin(c.bob) * 4;
      // Glow
      ctx.fillStyle = "rgba(255,92,138,0.35)";
      ctx.beginPath();
      ctx.arc(c.x, c.y + 18, 18, 0, Math.PI * 2);
      ctx.fill();
      // Cube
      ctx.save();
      ctx.translate(c.x, c.y + yo);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#ff5c8a";
      ctx.fillRect(-12, -12, 24, 24);
      ctx.fillStyle = "#ffe14d";
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    }

    // Storm overlay (lethal area tinted purple)
    if (this.storm.inset > 0) {
      const i = this.storm.inset * TS;
      ctx.save();
      ctx.fillStyle = "rgba(180, 60, 220, 0.28)";
      // top
      ctx.fillRect(0, 0, this.pxW, i);
      // bottom
      ctx.fillRect(0, this.pxH - i, this.pxW, i);
      // left
      ctx.fillRect(0, i, i, this.pxH - 2 * i);
      // right
      ctx.fillRect(this.pxW - i, i, i, this.pxH - 2 * i);
      // Border line of safe zone
      ctx.strokeStyle = "#ff66ff";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(i, i, this.pxW - 2 * i, this.pxH - 2 * i);
      ctx.restore();
    }
  }
}
