// =====================================================================
// entity.js - Brawler (player+bot share most logic), Bullet, Effect, AI
// =====================================================================
// One Brawler class is used for both the player and AI bots. The "isAI"
// flag controls whether input comes from Input.state or the bot brain.
// =====================================================================

const TAU = Math.PI * 2;
const ANGLE_LERP = (a, b, t) => {
  // shortest-path interpolation between two angles
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
};

// ---------------------------------------------------------------------
// Bullet
// ---------------------------------------------------------------------
class Bullet {
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.vx = Math.cos(opts.angle) * opts.speed;
    this.vy = Math.sin(opts.angle) * opts.speed;
    this.angle = opts.angle;
    this.speed = opts.speed;
    this.size = opts.size;
    this.damage = opts.damage;
    this.range = opts.range;
    this.travelled = 0;
    this.ownerId = opts.ownerId;          // id of the brawler who fired it
    this.ownerColor = opts.ownerColor;    // tint
    this.knockback = opts.knockback || 0;
    this.ramp = !!opts.ramp;              // piper-style range damage ramp
    this.rampMin = opts.rampMin || 0;
    this.rampMax = opts.rampMax || 0;
    this.alive = true;
  }

  // Returns the damage to apply at the current travelled distance.
  effectiveDamage() {
    if (!this.ramp) return this.damage;
    const t = Math.min(1, this.travelled / this.range);
    return this.rampMin + (this.rampMax - this.rampMin) * t;
  }

  update(dt, world) {
    if (!this.alive) return;
    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;

    // Wall hit?
    const ray = world.raycastBullet(this.x, this.y, nx, ny);
    if (ray.hit) {
      this.x = ray.x;
      this.y = ray.y;
      this.alive = false;
      // Try to break walls (ROCK is unbreakable)
      if (ray.type === TILE.WALL) world.damageWall(ray.tx, ray.ty);
      return;
    }

    this.x = nx;
    this.y = ny;
    this.travelled += this.speed * dt;
    if (this.travelled >= this.range) this.alive = false;
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // Glow
    ctx.fillStyle = this.ownerColor + "aa";
    ctx.fillRect(-this.size, -this.size * 0.7, this.size * 2, this.size * 1.4);
    // Core
    ctx.fillStyle = "#fff";
    ctx.fillRect(-this.size * 0.7, -this.size * 0.4, this.size * 1.4, this.size * 0.8);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------
// Effect: short-lived visual (muzzle flash, hit spark, slam ring, etc.)
// ---------------------------------------------------------------------
class Effect {
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.life = opts.life || 0.4;
    this.t = 0;
    this.kind = opts.kind || "spark";
    this.color = opts.color || "#fff";
    this.r0 = opts.r0 || 6;
    this.r1 = opts.r1 || 30;
    this.text = opts.text;
    this.vy = opts.vy || -50;
    this.alive = true;
  }
  update(dt) {
    this.t += dt;
    if (this.t >= this.life) this.alive = false;
    if (this.kind === "damage") this.y += this.vy * dt;
  }
  draw(ctx) {
    const k = this.t / this.life;
    if (this.kind === "ring") {
      const r = this.r0 + (this.r1 - this.r0) * k;
      ctx.strokeStyle = this.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (this.kind === "spark") {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r0 * (1 - k * 0.5), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.kind === "damage") {
      ctx.font = "bold 18px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 1 - k;
      ctx.fillText(this.text || "", this.x, this.y);
      ctx.globalAlpha = 1;
    } else if (this.kind === "muzzle") {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r0 * (1 - k), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------------
// Brawler (player or AI)
// ---------------------------------------------------------------------
let _entityIdCounter = 1;

class Brawler {
  constructor(def, x, y, isAI = false) {
    this.id = _entityIdCounter++;
    this.def = def;
    this.x = x;
    this.y = y;
    this.r = def.radius;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.speed = def.speed;
    this.angle = 0;            // facing/aim
    this.moveDir = { x: 0, y: 0 };
    this.reloadT = 0;          // time since last shot
    this.isAI = isAI;
    this.alive = true;
    this.cubes = 0;            // power cubes collected
    this.kills = 0;
    this.killerId = null;
    this.regenT = 0;           // sec out of combat (regen after 3s)
    this.lastDamageT = 999;

    // SUPER
    this.superCharge = 0;      // 0..1
    // Pending burst (colt) state
    this.pendingBurst = null;  // {count, delay, t, angle}
    // Active dash (bull) state
    this.dash = null;          // {timeLeft, dirX, dirY, speed, dmg, hit:Set}
    // Active leap (primo / piper)
    this.leap = null;          // {tx, ty, t, total, fromX, fromY, super:def}

    // AI brain
    this.ai = isAI ? this._makeAI() : null;
  }

  _makeAI() {
    return {
      mode: "wander",      // wander | engage | retreat | seekCube
      modeT: 0,
      target: null,        // enemy Brawler
      moveTarget: null,    // {x,y} world point
      lastSeenT: 0,
      reaction: 0.15 + Math.random() * 0.25, // delayed reaction in sec
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      strafeT: 0,
      aimAngle: Math.random() * TAU,
      // skill knobs
      aggression: 0.45 + Math.random() * 0.4,
      accuracy: 0.55 + Math.random() * 0.35, // 0..1
    };
  }

  // ---------- HP / damage ----------
  takeDamage(amount, fromId, world) {
    if (!this.alive) return;
    this.hp -= amount;
    this.lastDamageT = 0;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.killerId = fromId;
    } else {
      // Take damage charges your super (~30% bar at full HP loss)
      this.superCharge = Math.min(1, this.superCharge + amount / (this.maxHp * 1.6));
    }
  }

  applyKnockback(angle, force) {
    // Very small knockback impulse - we don't model momentum, so just shift.
    this.x += Math.cos(angle) * force * 0.15;
    this.y += Math.sin(angle) * force * 0.15;
  }

  // Power-cube buff: each cube => +10% HP and +5% damage; full heal on pickup.
  pickUpCube() {
    this.cubes++;
    this.maxHp = Math.round(this.def.hp * (1 + 0.10 * this.cubes));
    this.hp = this.maxHp;
  }

  damageMultiplier() { return 1 + 0.05 * this.cubes; }

  // ---------- Core update ----------
  update(dt, ctx) {
    // ctx = { world, bullets, effects, brawlers, gameTime, input, addBullet, addEffect }
    if (!this.alive) return;

    // Out-of-combat regen
    this.lastDamageT += dt;
    if (this.lastDamageT > 3 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.18 * dt);
    }
    this.reloadT += dt;

    // Active super states
    if (this.dash) { this._updateDash(dt, ctx); }
    if (this.leap) { this._updateLeap(dt, ctx); }
    if (this.pendingBurst) { this._updateBurst(dt, ctx); }

    // Determine intent (player vs AI)
    let moveX = 0, moveY = 0;
    let wantAim = this.angle;
    let wantFire = false;
    let wantSuper = false;

    if (!this.isAI) {
      const inp = ctx.input.state;
      moveX = inp.moveX;
      moveY = inp.moveY;
      const dx = inp.aimX - this.x, dy = inp.aimY - this.y;
      if (dx || dy) wantAim = Math.atan2(dy, dx);
      wantFire = inp.fire;
      wantSuper = inp.superPressed;
    } else {
      const dec = this._aiDecide(dt, ctx);
      moveX = dec.moveX; moveY = dec.moveY;
      wantAim = dec.aim;
      wantFire = dec.fire;
      wantSuper = dec.useSuper;
    }

    // Frozen during dash/leap (movement is overridden there)
    if (!this.dash && !this.leap) {
      // Move (normalize)
      const mLen = Math.hypot(moveX, moveY);
      if (mLen > 1) { moveX /= mLen; moveY /= mLen; }
      this.moveDir.x = moveX; this.moveDir.y = moveY;

      const nx = this.x + moveX * this.speed * dt;
      const ny = this.y + moveY * this.speed * dt;
      // Resolve world collision
      const r = ctx.world.resolveCircle(nx, ny, this.r);
      this.x = r.x; this.y = r.y;
      // Resolve brawler vs brawler push
      this._resolveAgainstBrawlers(ctx.brawlers);
    }

    // Smooth aim
    this.angle = ANGLE_LERP(this.angle, wantAim, this.isAI ? 0.12 : 0.45);

    // Storm damage
    if (ctx.world.inStorm(this.x, this.y)) {
      this.takeDamage(ctx.world.storm.damagePerSec * dt, null, ctx.world);
    }

    // Cube pickup
    for (const c of ctx.world.cubes) {
      if (!c.alive) continue;
      if (Math.hypot(c.x - this.x, c.y - this.y) < this.r + 18) {
        c.alive = false;
        this.pickUpCube();
        ctx.addEffect(new Effect({
          x: this.x, y: this.y - 18, kind: "damage",
          text: "+CUBE", color: "#ffe14d", life: 0.7, vy: -40,
        }));
      }
    }

    // Fire main attack
    if (wantFire && this.reloadT >= this.def.reload && !this.dash && !this.leap) {
      this._fireMain(ctx);
      this.reloadT = 0;
    }

    // Super
    if (wantSuper && this.superCharge >= 1 && !this.dash && !this.leap && !this.pendingBurst) {
      this._fireSuper(ctx);
      this.superCharge = 0;
    }
  }

  _resolveAgainstBrawlers(others) {
    for (const o of others) {
      if (o === this || !o.alive) continue;
      const dx = this.x - o.x, dy = this.y - o.y;
      const d = Math.hypot(dx, dy);
      const min = this.r + o.r;
      if (d > 0 && d < min) {
        const push = (min - d) * 0.5;
        const nxs = dx / d, nys = dy / d;
        this.x += nxs * push; this.y += nys * push;
        o.x   -= nxs * push; o.y   -= nys * push;
      }
    }
  }

  // ---------- Attacks ----------
  _fireMain(ctx) {
    const d = this.def;
    const dmgMul = this.damageMultiplier();
    const flash = new Effect({
      x: this.x + Math.cos(this.angle) * (this.r + 4),
      y: this.y + Math.sin(this.angle) * (this.r + 4),
      kind: "muzzle", color: d.color, r0: 14, life: 0.12,
    });
    ctx.addEffect(flash);

    for (let i = 0; i < d.shots; i++) {
      const off = d.shots === 1 ? 0 : (i / (d.shots - 1) - 0.5) * d.spread;
      const a = this.angle + off;
      const b = new Bullet({
        x: this.x + Math.cos(this.angle) * (this.r + 6),
        y: this.y + Math.sin(this.angle) * (this.r + 6),
        angle: a,
        speed: d.bulletSpeed,
        size: d.bulletSize,
        damage: d.bulletDamage * dmgMul,
        range: d.range,
        ownerId: this.id,
        ownerColor: d.color,
        ramp: !!d.bulletRamp,
        rampMin: d.bulletDamage * dmgMul,
        rampMax: (d.bulletDamageMax || d.bulletDamage) * dmgMul,
      });
      ctx.addBullet(b);
    }

    // Charge super a bit per attack landed elsewhere; landing builds more.
    this.superCharge = Math.min(1, this.superCharge + 0.02);
  }

  _fireSuper(ctx) {
    const s = this.def.super;
    if (s.type === "spread") {
      const dmgMul = this.damageMultiplier();
      ctx.addEffect(new Effect({
        x: this.x, y: this.y, kind: "ring",
        color: this.def.color, r0: this.r, r1: this.r + 60, life: 0.45,
      }));
      for (let i = 0; i < s.shots; i++) {
        const off = (i / (s.shots - 1) - 0.5) * s.spread;
        const a = this.angle + off;
        ctx.addBullet(new Bullet({
          x: this.x + Math.cos(this.angle) * (this.r + 8),
          y: this.y + Math.sin(this.angle) * (this.r + 8),
          angle: a,
          speed: s.bulletSpeed,
          size: s.bulletSize,
          damage: s.bulletDamage * dmgMul,
          range: s.range,
          ownerId: this.id,
          ownerColor: this.def.color,
          knockback: s.knockback || 0,
        }));
      }
    } else if (s.type === "burst") {
      this.pendingBurst = {
        remaining: s.burst,
        delay: s.burstDelay,
        t: 0,
        baseAngle: this.angle,
      };
    } else if (s.type === "dash") {
      this.dash = {
        timeLeft: s.dashDuration,
        speed: s.dashSpeed,
        dirX: Math.cos(this.angle),
        dirY: Math.sin(this.angle),
        dmg: s.dashDamage * this.damageMultiplier(),
        radius: s.dashRadius,
        breakWalls: s.breakWalls,
        hit: new Set(),
      };
      ctx.addEffect(new Effect({
        x: this.x, y: this.y, kind: "ring",
        color: this.def.color, r0: this.r, r1: this.r + 50, life: 0.35,
      }));
    } else if (s.type === "leap") {
      // Aim point: clamped to leapMaxRange
      const aimX = ctx.input ? ctx.input.state.aimX : this.x + Math.cos(this.angle) * 200;
      const aimY = ctx.input ? ctx.input.state.aimY : this.y + Math.sin(this.angle) * 200;
      let tx, ty;
      if (this.isAI && this.ai && this.ai.target) {
        tx = this.ai.target.x; ty = this.ai.target.y;
      } else {
        tx = aimX; ty = aimY;
      }
      const dx = tx - this.x, dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      const max = s.leapMaxRange;
      const f = d > max ? max / d : 1;
      const lx = this.x + dx * f, ly = this.y + dy * f;
      const total = Math.hypot(lx - this.x, ly - this.y) / s.leapSpeed;
      this.leap = {
        fromX: this.x, fromY: this.y,
        toX: lx, toY: ly,
        t: 0, total: Math.max(total, 0.18),
        super: s,
      };
      // Piper drops grenades at the takeoff position
      if (s.grenades) {
        for (let i = 0; i < s.grenades; i++) {
          const a = (i / s.grenades) * TAU;
          const gx = this.x + Math.cos(a) * 30;
          const gy = this.y + Math.sin(a) * 30;
          // Grenade = an immediate AoE explosion (delayed via effect)
          this._scheduleGrenade(ctx, gx, gy, s.grenadeRadius, s.grenadeDamage * this.damageMultiplier());
        }
      }
    }
  }

  _scheduleGrenade(ctx, x, y, radius, damage) {
    // Visual: ring + spark
    ctx.addEffect(new Effect({
      x, y, kind: "ring", color: "#ffaaaa",
      r0: 4, r1: radius, life: 0.5,
    }));
    ctx.addEffect(new Effect({
      x, y, kind: "spark", color: "#ff7766", r0: 22, life: 0.5,
    }));
    // Damage everyone inside (including self minimally - skip self for fairness)
    for (const o of ctx.brawlers) {
      if (!o.alive || o === this) continue;
      if (Math.hypot(o.x - x, o.y - y) < radius) {
        o.takeDamage(damage, this.id, ctx.world);
        if (!o.alive && o.killerId === this.id) this.kills++;
      }
    }
    // Break nearby walls
    const tx0 = Math.floor((x - radius) / TS), tx1 = Math.floor((x + radius) / TS);
    const ty0 = Math.floor((y - radius) / TS), ty1 = Math.floor((y + radius) / TS);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const cx = tx * TS + TS / 2, cy = ty * TS + TS / 2;
        if (Math.hypot(cx - x, cy - y) < radius) ctx.world.damageWall(tx, ty);
      }
    }
  }

  _updateBurst(dt, ctx) {
    const pb = this.pendingBurst;
    pb.t -= dt;
    if (pb.t <= 0 && pb.remaining > 0) {
      const s = this.def.super;
      const dmgMul = this.damageMultiplier();
      // small jitter
      const a = this.angle + (Math.random() - 0.5) * s.spread;
      ctx.addBullet(new Bullet({
        x: this.x + Math.cos(this.angle) * (this.r + 6),
        y: this.y + Math.sin(this.angle) * (this.r + 6),
        angle: a,
        speed: s.bulletSpeed,
        size: s.bulletSize,
        damage: s.bulletDamage * dmgMul,
        range: s.range,
        ownerId: this.id,
        ownerColor: this.def.color,
      }));
      pb.remaining--;
      pb.t = s.burstDelay;
    }
    if (pb.remaining <= 0) this.pendingBurst = null;
  }

  _updateDash(dt, ctx) {
    const d = this.dash;
    d.timeLeft -= dt;
    let nx = this.x + d.dirX * d.speed * dt;
    let ny = this.y + d.dirY * d.speed * dt;

    // Optionally pulverize walls in the way (Bull)
    if (d.breakWalls) {
      const tile = ctx.world.tileAtWorld(nx, ny);
      if (tile === TILE.WALL) {
        const tx = Math.floor(nx / TS), ty = Math.floor(ny / TS);
        ctx.world.damageWall(tx, ty);
      }
    }
    // Resolve against still-solid tiles
    const r = ctx.world.resolveCircle(nx, ny, this.r);
    this.x = r.x; this.y = r.y;

    // Deal damage to brawlers we touch
    for (const o of ctx.brawlers) {
      if (!o.alive || o === this || d.hit.has(o.id)) continue;
      if (Math.hypot(o.x - this.x, o.y - this.y) < this.r + o.r + 6) {
        o.takeDamage(d.dmg, this.id, ctx.world);
        o.applyKnockback(Math.atan2(o.y - this.y, o.x - this.x), 220);
        if (!o.alive && o.killerId === this.id) this.kills++;
        d.hit.add(o.id);
      }
    }

    if (d.timeLeft <= 0) this.dash = null;
  }

  _updateLeap(dt, ctx) {
    const L = this.leap;
    L.t += dt;
    const k = Math.min(1, L.t / L.total);
    this.x = L.fromX + (L.toX - L.fromX) * k;
    this.y = L.fromY + (L.toY - L.fromY) * k;
    if (k >= 1) {
      // Slam!
      const s = L.super;
      if (s.slamRadius > 0) {
        ctx.addEffect(new Effect({
          x: this.x, y: this.y, kind: "ring", color: this.def.color,
          r0: 10, r1: s.slamRadius, life: 0.45,
        }));
        for (const o of ctx.brawlers) {
          if (!o.alive || o === this) continue;
          if (Math.hypot(o.x - this.x, o.y - this.y) < s.slamRadius) {
            o.takeDamage(s.slamDamage * this.damageMultiplier(), this.id, ctx.world);
            o.applyKnockback(Math.atan2(o.y - this.y, o.x - this.x), 200);
            if (!o.alive && o.killerId === this.id) this.kills++;
          }
        }
      }
      this.leap = null;
    }
  }

  // ---------- AI ----------
  _aiDecide(dt, ctx) {
    const a = this.ai;
    a.modeT += dt;

    // Find nearest visible enemy
    let best = null, bestD = Infinity;
    for (const o of ctx.brawlers) {
      if (!o.alive || o === this) continue;
      const d = Math.hypot(o.x - this.x, o.y - this.y);
      // Enemies in bushes are hidden unless very close
      const seeRange = ctx.world.inBush(o.x, o.y) ? 140 : 700;
      if (d > seeRange) continue;
      // LOS check via wall raycast
      const ray = ctx.world.raycastBullet(this.x, this.y, o.x, o.y);
      if (ray.hit) {
        const ddx = ray.x - this.x, ddy = ray.y - this.y;
        if (ddx * ddx + ddy * ddy < d * d * 0.95) continue; // blocked by wall
      }
      if (d < bestD) { bestD = d; best = o; }
    }

    // Find nearest cube if far from any enemy
    let cubeTarget = null;
    if (!best || bestD > 420) {
      let cd = Infinity;
      for (const c of ctx.world.cubes) {
        if (!c.alive) continue;
        const d = Math.hypot(c.x - this.x, c.y - this.y);
        if (d < cd) { cd = d; cubeTarget = c; }
      }
    }

    // Mode selection
    const lowHp = this.hp / this.maxHp < 0.32;
    if (lowHp && best && bestD < 360) {
      a.mode = "retreat";
    } else if (best) {
      a.mode = "engage";
      a.target = best;
      a.lastSeenT = 0;
    } else if (cubeTarget) {
      a.mode = "seekCube";
      a.moveTarget = cubeTarget;
    } else {
      a.mode = "wander";
      if (!a.moveTarget || a.modeT > 3) {
        a.moveTarget = {
          x: 200 + Math.random() * (ctx.world.pxW - 400),
          y: 200 + Math.random() * (ctx.world.pxH - 400),
        };
        a.modeT = 0;
      }
    }

    let moveX = 0, moveY = 0;
    let aim = this.angle;
    let fire = false;
    let useSuper = false;

    // Avoid storm
    if (ctx.world.inStorm(this.x, this.y)) {
      const cx = ctx.world.pxW / 2, cy = ctx.world.pxH / 2;
      const dx = cx - this.x, dy = cy - this.y;
      const dl = Math.hypot(dx, dy) || 1;
      moveX = dx / dl; moveY = dy / dl;
    }

    if (a.mode === "engage" && best) {
      const dx = best.x - this.x, dy = best.y - this.y;
      const d = Math.hypot(dx, dy);
      // Aim with some "miss" jitter inversely proportional to accuracy
      const jitter = (1 - a.accuracy) * 0.35;
      aim = Math.atan2(dy, dx) + (Math.random() - 0.5) * jitter;

      // Strafe pattern
      a.strafeT -= dt;
      if (a.strafeT <= 0) {
        a.strafeDir *= -1;
        a.strafeT = 0.6 + Math.random() * 0.8;
      }
      const optimal = this.def.range * 0.7;
      const closing = d > optimal + 60 ? 1 : (d < optimal - 80 ? -1 : 0);
      const fwdX = Math.cos(aim), fwdY = Math.sin(aim);
      const sideX = -fwdY, sideY = fwdX;
      moveX = fwdX * closing + sideX * a.strafeDir * 0.7;
      moveY = fwdY * closing + sideY * a.strafeDir * 0.7;

      // Fire only if roughly facing target and within range
      const facing = Math.cos(aim - Math.atan2(dy, dx));
      if (d < this.def.range && facing > 0.92) fire = true;

      // Super logic
      if (this.superCharge >= 1) {
        if (d < (this.def.super.leapMaxRange || 220) * 1.05 && Math.random() < 0.05) {
          useSuper = true;
        } else if (this.def.super.type === "dash" && d < 280) {
          useSuper = Math.random() < 0.04;
        } else if ((this.def.super.type === "spread" || this.def.super.type === "burst")
                   && d < this.def.super.range * 0.85 && facing > 0.96) {
          useSuper = Math.random() < 0.08;
        }
      }
    } else if (a.mode === "retreat" && best) {
      const dx = this.x - best.x, dy = this.y - best.y;
      const dl = Math.hypot(dx, dy) || 1;
      moveX = dx / dl; moveY = dy / dl;
      aim = Math.atan2(-dy, -dx);
      // Pop super defensively
      if (this.superCharge >= 1) useSuper = Math.random() < 0.06;
    } else if (a.mode === "seekCube" && a.moveTarget) {
      const dx = a.moveTarget.x - this.x, dy = a.moveTarget.y - this.y;
      const dl = Math.hypot(dx, dy) || 1;
      moveX = dx / dl; moveY = dy / dl;
      aim = Math.atan2(dy, dx);
    } else if (a.moveTarget) {
      const dx = a.moveTarget.x - this.x, dy = a.moveTarget.y - this.y;
      const dl = Math.hypot(dx, dy) || 1;
      if (dl < 30) a.moveTarget = null;
      else { moveX = dx / dl; moveY = dy / dl; }
      aim += (Math.random() - 0.5) * 0.05;
    }

    return { moveX, moveY, aim, fire, useSuper };
  }

  // ---------- Drawing ----------
  draw(ctx, world, isPlayer) {
    if (!this.alive) return;
    // Bush stealth: if in a bush AND not the local player, dim/hide.
    const inBush = world.inBush(this.x, this.y);
    let alpha = 1;
    if (inBush && !isPlayer) alpha = 0.05; // mostly invisible to camera

    ctx.save();
    ctx.globalAlpha = alpha;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.85, this.r * 0.95, this.r * 0.4, 0, 0, TAU);
    ctx.fill();

    // Body
    ctx.fillStyle = this.def.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = this.def.accent;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Initial badge
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.def.initial, this.x, this.y - 1);

    // Gun barrel
    const bx = this.x + Math.cos(this.angle) * (this.r + 4);
    const by = this.y + Math.sin(this.angle) * (this.r + 4);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.def.accent;
    ctx.fillRect(0, -5, 16, 10);
    ctx.fillStyle = "#222";
    ctx.fillRect(14, -3, 4, 6);
    ctx.restore();

    // HP bar over head (skipped for player to keep HUD clean)
    if (!isPlayer) {
      const w = 50, h = 6;
      const k = this.hp / this.maxHp;
      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.fillRect(this.x - w / 2 - 1, this.y - this.r - 14, w + 2, h + 2);
      ctx.fillStyle = k > 0.5 ? "#4dff6e" : k > 0.25 ? "#ffe14d" : "#ff4d6d";
      ctx.fillRect(this.x - w / 2, this.y - this.r - 13, w * k, h);
    }

    // Player aim indicator (faint dotted aim line)
    if (isPlayer) {
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x + Math.cos(this.angle) * Math.min(this.def.range, 220),
        this.y + Math.sin(this.angle) * Math.min(this.def.range, 220),
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // Bush "ripple" indicator when player walks in a bush so they know they're hidden
    if (inBush && isPlayer) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 6, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}
