// =====================================================================
// game.js - The Game class. Owns world + entities + camera + game loop.
// =====================================================================

class Game {
  constructor(canvas, playerBrawlerId) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.playerBrawlerId = playerBrawlerId;

    this.world = new World(28, 28);
    this.bullets = [];
    this.effects = [];
    this.brawlers = [];
    this.player = null;

    this.gameTime = 0;
    this.over = false;
    this.victory = false;
    this.endTime = 0;

    // Camera (world-space top-left + zoom)
    this.cam = { x: 0, y: 0, zoom: 1 };

    this.lastTs = 0;
    this._loop = this._loop.bind(this);

    this._resize();
    window.addEventListener("resize", () => this._resize());
    Input.attach(canvas);

    this._spawnAll();
  }

  // ---------- Setup ----------
  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth = window.innerWidth;
    const h = this.canvas.clientHeight = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewW = w;
    this.viewH = h;
    // Pick a zoom that shows ~12 tiles vertically on a 720p screen
    this.cam.zoom = Math.max(0.7, Math.min(1.4, h / 720 * 0.95));
  }

  _spawnAll() {
    const spawns = this.world.spawnPoints();
    // shuffle
    for (let i = spawns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spawns[i], spawns[j]] = [spawns[j], spawns[i]];
    }

    // Player at first spawn with chosen brawler
    const playerDef = BRAWLERS[this.playerBrawlerId];
    this.player = new Brawler(playerDef, spawns[0].x, spawns[0].y, false);
    this.brawlers.push(this.player);

    // Bots: pick from remaining brawlers (with repetition)
    const pool = BRAWLER_LIST.slice();
    for (let i = 1; i < spawns.length; i++) {
      const def = pool[Math.floor(Math.random() * pool.length)];
      const b = new Brawler(def, spawns[i].x, spawns[i].y, true);
      this.brawlers.push(b);
    }
  }

  // ---------- Main loop ----------
  start() {
    this.lastTs = performance.now();
    requestAnimationFrame(this._loop);
  }

  _loop(ts) {
    if (this._stopped) return;
    let dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    // Clamp dt to keep physics stable when tab regains focus
    if (dt > 0.05) dt = 0.05;

    this._update(dt);
    this._render();

    requestAnimationFrame(this._loop);
  }

  stop() { this._stopped = true; }

  // ---------- Update ----------
  _update(dt) {
    if (this.over) {
      // Continue ticking animations on victory but stop most logic
      this.endTime += dt;
      for (const e of this.effects) e.update(dt);
      this.effects = this.effects.filter(e => e.alive);
      return;
    }

    this.gameTime += dt;
    Input.poll();

    // Convert mouse to world space for player aim
    const m = Input.state;
    const ww = this.viewW / this.cam.zoom;
    const wh = this.viewH / this.cam.zoom;
    Input.state.aimX = this.cam.x + m.mouseX / this.cam.zoom;
    Input.state.aimY = this.cam.y + m.mouseY / this.cam.zoom;

    // World update
    this.world.update(dt, this.gameTime);

    // Entity update context
    const ctx = {
      world: this.world,
      bullets: this.bullets,
      effects: this.effects,
      brawlers: this.brawlers,
      gameTime: this.gameTime,
      input: Input,
      addBullet: (b) => this.bullets.push(b),
      addEffect: (e) => this.effects.push(e),
    };

    // Update brawlers
    for (const b of this.brawlers) b.update(dt, ctx);

    // Update bullets (movement + wall hit)
    for (const b of this.bullets) b.update(dt, this.world);

    // Bullet vs brawler collisions
    for (const blt of this.bullets) {
      if (!blt.alive) continue;
      for (const br of this.brawlers) {
        if (!br.alive || br.id === blt.ownerId) continue;
        // Bush-occupied targets are mostly bullet-magnet-immune unless attacker has LOS revealed.
        // We still allow hits when very close OR when shooter is in same/adjacent bush.
        const dx = br.x - blt.x, dy = br.y - blt.y;
        const r = br.r + blt.size;
        if (dx * dx + dy * dy < r * r) {
          const dmg = blt.effectiveDamage();
          br.takeDamage(dmg, blt.ownerId, this.world);
          // Knockback
          if (blt.knockback) {
            br.applyKnockback(blt.angle, blt.knockback);
          }
          // Floating damage number
          this.effects.push(new Effect({
            x: br.x, y: br.y - br.r - 6, kind: "damage",
            text: Math.round(dmg).toString(),
            color: br === this.player ? "#ff4d6d" : "#ffe14d",
            life: 0.6,
          }));
          this.effects.push(new Effect({
            x: blt.x, y: blt.y, kind: "spark",
            color: blt.ownerColor, r0: 12, life: 0.25,
          }));
          // Charge attacker's super for landing hits
          const attacker = this.brawlers.find(b => b.id === blt.ownerId);
          if (attacker && attacker.alive) {
            attacker.superCharge = Math.min(1, attacker.superCharge + dmg / (attacker.maxHp * 4));
          }
          // Track kill
          if (!br.alive && attacker) {
            attacker.kills++;
            // Killer gets a small heal & quick super gain on KO
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + attacker.maxHp * 0.25);
            attacker.superCharge = Math.min(1, attacker.superCharge + 0.4);
            // Death effect
            this.effects.push(new Effect({
              x: br.x, y: br.y, kind: "ring",
              color: br.def.color, r0: 8, r1: 80, life: 0.6,
            }));
            // Drop cubes from victim (each cube becomes a pickup)
            for (let i = 0; i < br.cubes; i++) {
              const a = Math.random() * Math.PI * 2;
              const r = 12 + Math.random() * 24;
              this.world.cubes.push({
                x: br.x + Math.cos(a) * r,
                y: br.y + Math.sin(a) * r,
                alive: true, bob: Math.random() * 6,
              });
            }
          }
          blt.alive = false;
          break;
        }
      }
    }

    // Cull
    this.bullets = this.bullets.filter(b => b.alive);
    for (const e of this.effects) e.update(dt);
    this.effects = this.effects.filter(e => e.alive);

    // Camera follow player (or last viewpoint if dead)
    const px = this.player.x, py = this.player.y;
    const tcx = px - this.viewW / (2 * this.cam.zoom);
    const tcy = py - this.viewH / (2 * this.cam.zoom);
    // Smooth follow
    this.cam.x += (tcx - this.cam.x) * Math.min(1, dt * 8);
    this.cam.y += (tcy - this.cam.y) * Math.min(1, dt * 8);
    // Clamp to world
    this.cam.x = Math.max(0, Math.min(this.world.pxW - this.viewW / this.cam.zoom, this.cam.x));
    this.cam.y = Math.max(0, Math.min(this.world.pxH - this.viewH / this.cam.zoom, this.cam.y));

    Input.clearEdgeTriggers();

    // HUD
    this._updateHUD();

    // Win/Loss
    const aliveCount = this.brawlers.filter(b => b.alive).length;
    const playerAlive = this.player.alive;
    if (!playerAlive && !this.over) this._endGame(false);
    else if (aliveCount === 1 && playerAlive && !this.over) this._endGame(true);
  }

  // ---------- HUD ----------
  _updateHUD() {
    const p = this.player;
    const hpFill = document.getElementById("hp-fill");
    const hpText = document.getElementById("hp-text");
    const supFill = document.getElementById("super-fill");
    const supText = document.getElementById("super-text");
    const supBar = supFill ? supFill.parentElement : null;
    const aliveEl = document.getElementById("alive-count");
    const cubeEl = document.getElementById("cube-count");
    const stormEl = document.getElementById("storm-warn");

    if (hpFill) {
      const k = Math.max(0, p.hp / p.maxHp);
      hpFill.style.width = (k * 100).toFixed(1) + "%";
      hpFill.style.background = k > 0.5
        ? "linear-gradient(180deg,#4dff6e,#1ea33b)"
        : k > 0.25
        ? "linear-gradient(180deg,#ffe14d,#f5b800)"
        : "linear-gradient(180deg,#ff4d6d,#a3162f)";
    }
    if (hpText) hpText.textContent = `${Math.max(0, Math.round(p.hp))}/${p.maxHp}`;
    if (supFill) supFill.style.width = (p.superCharge * 100).toFixed(1) + "%";
    if (supText) supText.textContent = p.superCharge >= 1 ? "READY!" : "SUPER";
    if (supBar) supBar.classList.toggle("ready", p.superCharge >= 1);

    const alive = this.brawlers.filter(b => b.alive).length;
    if (aliveEl) aliveEl.textContent = `${alive} ALIVE`;
    if (cubeEl) cubeEl.textContent = p.cubes;
    if (stormEl) {
      const stormSoon = this.gameTime > this.world.storm.activeAt - 5
                      && this.gameTime < this.world.storm.activeAt + 1;
      const stormActive = this.world.storm.inset > 0;
      stormEl.classList.toggle("hidden", !(stormSoon || stormActive));
      stormEl.textContent = stormActive ? "STORM CLOSING" : "STORM INCOMING";
    }
  }

  _endGame(victory) {
    this.over = true;
    this.victory = victory;
    const endEl = document.getElementById("end");
    const titleEl = document.getElementById("end-title");
    const subEl = document.getElementById("end-sub");
    const k = document.getElementById("stat-kills");
    const c = document.getElementById("stat-cubes");
    const t = document.getElementById("stat-time");

    if (titleEl) {
      titleEl.textContent = victory ? "VICTORY!" : "DEFEATED";
      titleEl.classList.toggle("lose", !victory);
    }
    if (subEl) subEl.textContent = victory
      ? "You are the last brawler standing."
      : "Better luck next time, brawler.";
    if (k) k.textContent = this.player.kills;
    if (c) c.textContent = this.player.cubes;
    if (t) t.textContent = Math.round(this.gameTime) + "s";

    // Slight delay so the killing blow plays out
    setTimeout(() => {
      const wrap = document.getElementById("game-wrap");
      if (wrap) wrap.classList.add("hidden");
      if (endEl) endEl.classList.remove("hidden");
    }, 1200);
  }

  // ---------- Render ----------
  _render() {
    const ctx = this.ctx;
    // Letterbox / clear
    ctx.fillStyle = "#06031a";
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    ctx.save();
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-this.cam.x, -this.cam.y);

    const view = {
      x: this.cam.x, y: this.cam.y,
      w: this.viewW / this.cam.zoom, h: this.viewH / this.cam.zoom,
    };

    // World tiles + cubes + storm
    this.world.draw(ctx, view);

    // Sort entities by Y for crude depth
    const drawOrder = [...this.brawlers].sort((a, b) => a.y - b.y);
    for (const b of drawOrder) b.draw(ctx, this.world, b === this.player);

    // Bullets above brawlers
    for (const b of this.bullets) b.draw(ctx);

    // Effects on top
    for (const e of this.effects) e.draw(ctx);

    ctx.restore();
  }
}
