// =====================================================================
// main.js - Menu wiring, brawler selection, start/restart flow
// =====================================================================

(function () {
  const cardsEl = document.getElementById("brawler-cards");
  const playBtn = document.getElementById("play-btn");
  const menuEl  = document.getElementById("menu");
  const wrapEl  = document.getElementById("game-wrap");
  const endEl   = document.getElementById("end");
  const againEl = document.getElementById("again-btn");
  const portraitEl = document.getElementById("brawler-portrait");

  let selectedId = null;
  let game = null;

  // ---------- Build brawler cards ----------
  for (const b of BRAWLER_LIST) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = b.id;
    card.innerHTML = `
      <div class="avatar" style="background:${b.color}; border-color:${b.accent};">${b.initial}</div>
      <div class="name">${b.name}</div>
      <div class="role">${b.role}</div>
      <div class="stats">
        <span title="HP">&#10084; ${Math.round(b.hp / 100) / 10}k</span>
        <span title="Range">&#8644; ${Math.round(b.range)}</span>
      </div>
    `;
    card.addEventListener("click", () => selectBrawler(b.id));
    cardsEl.appendChild(card);
  }

  function selectBrawler(id) {
    selectedId = id;
    [...cardsEl.children].forEach((c) =>
      c.classList.toggle("selected", c.dataset.id === id)
    );
    playBtn.disabled = false;
    const b = BRAWLERS[id];
    playBtn.textContent = `PLAY AS ${b.name}`;
  }

  // ---------- Start ----------
  playBtn.addEventListener("click", () => {
    if (!selectedId) return;
    startGame(selectedId);
  });

  againEl.addEventListener("click", () => {
    endEl.classList.add("hidden");
    menuEl.classList.remove("hidden");
    selectedId = null;
    [...cardsEl.children].forEach((c) => c.classList.remove("selected"));
    playBtn.disabled = true;
    playBtn.textContent = "SELECT A BRAWLER";
    if (game) { game.stop(); game = null; }
  });

  function startGame(id) {
    menuEl.classList.add("hidden");
    endEl.classList.add("hidden");
    wrapEl.classList.remove("hidden");

    // Hide reload hint (it's only shown when reload starts)
    const rh = document.getElementById("reload-hint");
    if (rh) rh.classList.add("hidden");

    // Set portrait
    const def = BRAWLERS[id];
    if (portraitEl) {
      portraitEl.style.background = def.color;
      portraitEl.style.borderColor = "#fff";
      portraitEl.textContent = def.initial;
    }

    if (game) game.stop();
    const canvas = document.getElementById("game");
    game = new Game(canvas, id);
    game.start();
  }

  // ---------- Default selection for convenience ----------
  selectBrawler("shelly");
})();
