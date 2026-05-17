// =====================================================================
// input.js - Keyboard + mouse input. Reads canvas-relative mouse coords
// and exposes a per-frame snapshot consumed by the player update.
// =====================================================================

const Input = (() => {
  const keys = new Set();
  const state = {
    // Movement axis, normalized to length<=1
    moveX: 0,
    moveY: 0,
    // Mouse position in CSS pixels relative to canvas top-left
    mouseX: 0,
    mouseY: 0,
    // World-space aim, written by game each frame from camera transform
    aimX: 0,
    aimY: 0,
    // Held flags
    fire: false,
    superHeld: false,
    // Edge-trigger super (one-shot per press)
    superPressed: false,
  };

  let canvas = null;

  function attach(c) {
    canvas = c;
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", () => keys.clear());
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    const isDown = e.type === "keydown";
    if (isDown) keys.add(k); else keys.delete(k);

    if (k === " ") {
      if (isDown && !e.repeat) state.superPressed = true;
      state.superHeld = isDown;
      e.preventDefault();
    }
  }

  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - r.left;
    state.mouseY = e.clientY - r.top;
  }
  function onMouseDown(e) {
    if (e.button === 0) state.fire = true;
    if (e.button === 2) {
      state.superPressed = true;
      state.superHeld = true;
    }
  }
  function onMouseUp(e) {
    if (e.button === 0) state.fire = false;
    if (e.button === 2) state.superHeld = false;
  }

  // Called once per frame BEFORE player update
  function poll() {
    let mx = 0, my = 0;
    if (keys.has("a") || keys.has("arrowleft"))  mx -= 1;
    if (keys.has("d") || keys.has("arrowright")) mx += 1;
    if (keys.has("w") || keys.has("arrowup"))    my -= 1;
    if (keys.has("s") || keys.has("arrowdown"))  my += 1;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    state.moveX = mx;
    state.moveY = my;
  }

  // Called by game AFTER consuming superPressed
  function clearEdgeTriggers() {
    state.superPressed = false;
  }

  return { attach, poll, clearEdgeTriggers, state };
})();
