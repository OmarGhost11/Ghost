// =====================================================================
// brawlers.js - Brawler roster: stats + super behaviors
// =====================================================================
// Each brawler is a "class" of fighter with unique numbers and a super.
// Stats are intentionally tuned so different brawlers play differently.
// All numbers are in WORLD UNITS. World units == pixels at zoom = 1.
// =====================================================================

const BRAWLERS = {
  shelly: {
    id: "shelly",
    name: "SHELLY",
    role: "SHOTGUNNER",
    color: "#ff8a3d",
    accent: "#5a2a0a",
    initial: "S",
    hp: 3800,
    speed: 200,         // px/sec
    range: 360,         // bullet travel
    reload: 1.5,        // sec between shots (full reload)
    shots: 5,           // pellets per shot
    spread: 0.42,       // radians total cone
    bulletSpeed: 720,
    bulletSize: 9,
    bulletDamage: 320,  // per pellet, drops with distance
    radius: 22,
    // SUPER: Super Shell - wide cone of heavy pellets that knock back
    super: {
      type: "spread",
      shots: 9,
      spread: 0.85,
      bulletSpeed: 820,
      bulletSize: 14,
      bulletDamage: 540,
      range: 420,
      knockback: 220,
    },
  },

  colt: {
    id: "colt",
    name: "COLT",
    role: "SHARPSHOOTER",
    color: "#3da9ff",
    accent: "#0a2a5a",
    initial: "C",
    hp: 3000,
    speed: 220,
    range: 560,
    reload: 0.35,
    shots: 1,
    spread: 0.02,
    bulletSpeed: 1100,
    bulletSize: 7,
    bulletDamage: 360,
    radius: 22,
    // SUPER: Bullet Storm - long burst of fast bullets straight ahead
    super: {
      type: "burst",
      burst: 12,
      burstDelay: 0.05,
      spread: 0.04,
      bulletSpeed: 1200,
      bulletSize: 9,
      bulletDamage: 380,
      range: 700,
    },
  },

  bull: {
    id: "bull",
    name: "BULL",
    role: "HEAVYWEIGHT",
    color: "#c2b280",
    accent: "#3b2f10",
    initial: "B",
    hp: 5200,
    speed: 195,
    range: 300,
    reload: 1.7,
    shots: 6,
    spread: 0.30,
    bulletSpeed: 700,
    bulletSize: 11,
    bulletDamage: 360,
    radius: 26,
    // SUPER: Berserker Charge - dash through walls, smashing enemies
    super: {
      type: "dash",
      dashSpeed: 900,
      dashDuration: 0.55,
      dashDamage: 1200,
      dashRadius: 38,
      breakWalls: true,
    },
  },

  primo: {
    id: "primo",
    name: "EL PRIMO",
    role: "BRAWLER",
    color: "#ff4d6d",
    accent: "#3b0a18",
    initial: "P",
    hp: 5600,
    speed: 215,
    range: 130,           // melee-ish
    reload: 0.7,
    shots: 4,             // a flurry of fists in a tight arc
    spread: 0.6,
    bulletSpeed: 600,
    bulletSize: 14,
    bulletDamage: 420,
    radius: 26,
    // SUPER: Flying Elbow Drop - leap to cursor, AoE on landing
    super: {
      type: "leap",
      leapSpeed: 1300,
      leapMaxRange: 420,
      slamRadius: 110,
      slamDamage: 1500,
    },
  },

  piper: {
    id: "piper",
    name: "PIPER",
    role: "SNIPER",
    color: "#ff85c1",
    accent: "#5a1f3a",
    initial: "I",
    hp: 2600,
    speed: 205,
    range: 720,
    reload: 1.6,
    shots: 1,
    spread: 0.005,
    bulletSpeed: 1300,
    bulletSize: 8,
    // damage scales with travelled distance via "ramp"
    bulletDamage: 280,
    bulletDamageMax: 1100,
    bulletRamp: true,
    radius: 22,
    // SUPER: Bouquet Drop - fling 4 grenades around her on jump
    super: {
      type: "leap",
      leapSpeed: 1200,
      leapMaxRange: 380,
      slamRadius: 0,           // no AoE itself
      slamDamage: 0,
      grenades: 4,             // dropped at takeoff position
      grenadeRadius: 90,
      grenadeDamage: 900,
    },
  },
};

// Convenience array (used by menu)
const BRAWLER_LIST = Object.values(BRAWLERS);
