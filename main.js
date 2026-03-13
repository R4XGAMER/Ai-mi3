import { world, system } from "@minecraft/server";
import { HttpRequest, HttpRequestMethod, HttpClient } from "@minecraft/server-net";

// ╔══════════════════════════════════════════════╗
// ║   SONIC AI — Android Edition                 ║
// ║   Termux Bridge → Cloudflare → Claude AI     ║
// ╚══════════════════════════════════════════════╝

const SONIC_ID  = "sonic:ai_friend";
const API       = "https://ai-mi3.onrender.com/sonic";
const CLEAR_API = "https://ai-mi3.onrender.com/clear";
const net       = new HttpClient();

// ════════════════════════════════════════════
//  ACHIEVEMENTS
// ════════════════════════════════════════════
const ACHIEVEMENTS = {
  first_wood:       { title: "🪵 Lumberjack!",         desc: "Pehli baar wood katai!",              xp: 10  },
  first_stone:      { title: "⛏️ Miner Shuru!",        desc: "Pehli baar stone toda!",              xp: 10  },
  first_coal:       { title: "🪨 Coal Miner",           desc: "Pehla coal mila!",                    xp: 20  },
  first_iron:       { title: "⚙️ Iron Man!",            desc: "Pehla iron ore mila!",                xp: 30  },
  first_gold:       { title: "🥇 Gold Digger!",         desc: "Pehla gold mila!",                    xp: 40  },
  first_diamond:    { title: "💎 DIAMOND!!!",           desc: "PEHLA DIAMOND MILA! LEGEND!",         xp: 100 },
  mine_100:         { title: "⛏️ Mining Pro",           desc: "100 blocks mine kiye!",               xp: 50  },
  mine_500:         { title: "⛏️ Mining Master",        desc: "500 blocks mine kiye!",               xp: 100 },
  first_kill:       { title: "⚔️ Pehla Shikar!",        desc: "Pehla mob mara!",                     xp: 15  },
  kill_10:          { title: "⚔️ Fighter!",             desc: "10 mobs maare!",                      xp: 30  },
  kill_50:          { title: "⚔️ Warrior!",             desc: "50 mobs maare!",                      xp: 75  },
  kill_100:         { title: "⚔️ SONIC THE DESTROYER!", desc: "100 mobs maare!",                     xp: 150 },
  survived_night:   { title: "🌙 Night Survivor",       desc: "Raat zinda nikal li!",                xp: 25  },
  survived_creeper: { title: "💥 Creeper Survivor!",    desc: "Creeper se bacha!",                   xp: 50  },
  first_shelter:    { title: "🏕️ First Shelter",        desc: "Pehla shelter banaya!",               xp: 30  },
  first_house:      { title: "🏠 Home Sweet Home",      desc: "Pura ghar banaya!",                   xp: 75  },
  first_farm:       { title: "🌾 Farmer SONIC",         desc: "Pehla farm banaya!",                  xp: 40  },
  first_bridge:     { title: "🌉 Bridge Builder",       desc: "Pehla bridge banaya!",                xp: 25  },
  first_sword:      { title: "🗡️ Armed!",               desc: "Pehla sword craft kiya!",             xp: 20  },
  first_armor:      { title: "🛡️ Armored!",             desc: "Pehla armor craft kiya!",             xp: 35  },
  diamond_sword:    { title: "💎⚔️ Diamond Warrior!",   desc: "Diamond sword craft kiya!",           xp: 80  },
  diamond_armor:    { title: "💎🛡️ Diamond Knight!",    desc: "Full diamond armor!",                 xp: 120 },
  first_cave:       { title: "🕳️ Cave Explorer!",       desc: "Pehli cave explore ki!",              xp: 20  },
  deep_underground: { title: "🌋 Deep Diver",           desc: "Y=-50 se neeche gaya!",               xp: 40  },
  first_nether:     { title: "🔥 NETHER VISIT!",        desc: "Nether mein qadam rakha! BRAVE!",     xp: 150 },
  first_dragon:     { title: "🐉 DRAGON SLAYER!!!",     desc: "Ender Dragon se lada! EPIC!",         xp: 500 },
  find_village:     { title: "🏘️ Village Found!",       desc: "Village dhundh li!",                  xp: 50  },
  first_food:       { title: "🍖 Fed!",                 desc: "Pehli baar khana khaya!",             xp: 10  },
  farm_harvest:     { title: "🌾 Harvest Time!",        desc: "Pehli harvest ki!",                   xp: 30  },
  level_5:          { title: "⭐ Level 5!",             desc: "Level 5 reach kiya!",                 xp: 50  },
  level_10:         { title: "⭐⭐ Level 10!",          desc: "Level 10 reach kiya! PRO!",           xp: 100 },
  level_20:         { title: "⭐⭐⭐ Level 20!",        desc: "Level 20! SONIC LEGEND!",             xp: 200 },
};

// ── State ────────────────────────────────────
const ST   = new Map();
const BUSY = new Map();

function getS(id) {
  if (!ST.has(id)) ST.set(id, {
    action: "FOLLOW", mood: "happy", tick: 0,
    chatCD: 0, hurtCD: 0, autoCD: 0,
    kills: 0, mined: 0, built: 0, farmed: 0,
    level: 1, xp: 0,
    inv: {
      wood: 0, stone: 0, iron: 0, coal: 0,
      gold: 0, diamond: 0, food: 0, torches: 0,
      armor: false, sword: false, pickaxe: false
    },
    achievements: new Set(),
    achievementQueue: [],
    sonicHP: 40, hasShelter: false, hasBed: false,
    nightShelterBuilt: false, isNight: false,
    combatStreak: 0, fleeCount: 0,
    lastFoodCheck: 0, lastExploreCheck: 0,
    inNether: false
  });
  return ST.get(id);
}

// ── Helpers ──────────────────────────────────
const MOOD_COLOR = {
  happy: "§a", excited: "§6", scared: "§e",
  angry: "§c", curious: "§b", sad: "§7",
  focused: "§d", alert: "§4"
};

function say(sonic, msg, mood = "happy") {
  const c = MOOD_COLOR[mood] || "§f";
  try {
    sonic.dimension.runCommand(
      `tellraw @a {"rawtext":[{"text":"§8[§bSONIC§8] ${c}${msg}"}]}`
    );
  } catch(e) {}
}

function cmd(sonic, c) {
  try { sonic.dimension.runCommand(c); return true; }
  catch(e) { return false; }
}

function dist3(a, b) {
  return Math.sqrt(
    (a.location.x - b.location.x) ** 2 +
    (a.location.y - b.location.y) ** 2 +
    (a.location.z - b.location.z) ** 2
  );
}

function nearest(entity) {
  let p = null, md = Infinity;
  for (const pl of entity.dimension.getPlayers()) {
    const d = dist3(entity, pl);
    if (d < md) { md = d; p = pl; }
  }
  return p;
}

function tpNear(sonic, player, gap = 3) {
  if (dist3(sonic, player) > gap + 1) {
    const l = player.location;
    cmd(sonic, `tp @e[type=${SONIC_ID},r=100] ${(l.x + gap).toFixed(1)} ${l.y.toFixed(1)} ${l.z.toFixed(1)}`);
  }
}

function getBlock(dim, x, y, z) {
  try { return dim.getBlock({ x, y, z }); } catch(e) { return null; }
}
function isAir(b)   { return !b || b.typeId === "minecraft:air" || b.typeId === "minecraft:cave_air"; }
function isSolid(b) { return b && b.typeId !== "minecraft:air" && b.typeId !== "minecraft:cave_air" && b.typeId !== "minecraft:water" && b.typeId !== "minecraft:lava"; }
function isWater(b) { return b && (b.typeId === "minecraft:water" || b.typeId === "minecraft:flowing_water"); }

// ════════════════════════════════════════════
//  ACHIEVEMENTS
// ════════════════════════════════════════════
function unlockAchievement(sonic, state, key) {
  if (state.achievements.has(key)) return;
  const ach = ACHIEVEMENTS[key];
  if (!ach) return;
  state.achievements.add(key);
  state.xp += ach.xp;
  const xpNeeded = state.level * 150;
  if (state.xp >= xpNeeded) {
    state.level++;
    state.xp -= xpNeeded;
    if (state.level === 5)  unlockAchievement(sonic, state, "level_5");
    if (state.level === 10) unlockAchievement(sonic, state, "level_10");
    if (state.level === 20) unlockAchievement(sonic, state, "level_20");
    try {
      sonic.dimension.runCommand(`tellraw @a {"rawtext":[{"text":"§6§l⬆ SONIC Level UP! Now Level ${state.level}! ⬆"}]}`);
      sonic.dimension.runCommand(`particle minecraft:totem_particle ${sonic.location.x} ${sonic.location.y + 1} ${sonic.location.z}`);
    } catch(e) {}
  }
  state.achievementQueue.push(ach);
}

function displayNextAchievement(sonic, state) {
  if (state.achievementQueue.length === 0) return;
  const ach = state.achievementQueue.shift();
  try {
    sonic.dimension.runCommand(`tellraw @a {"rawtext":[{"text":"§5§l╔══════════════════════════╗"}]}`);
    sonic.dimension.runCommand(`tellraw @a {"rawtext":[{"text":"§5§l║  🏆 ACHIEVEMENT UNLOCKED!  ║"}]}`);
    sonic.dimension.runCommand(`tellraw @a {"rawtext":[{"text":"§e§l  ${ach.title}"}]}`);
    sonic.dimension.runCommand(`tellraw @a {"rawtext":[{"text":"§7  ${ach.desc}"}]}`);
    sonic.dimension.runCommand(`tellraw @a {"rawtext":[{"text":"§6  +${ach.xp} XP | Total: ${state.xp}"}]}`);
    sonic.dimension.runCommand(`tellraw @a {"rawtext":[{"text":"§5§l╚══════════════════════════╝"}]}`);
    sonic.dimension.runCommand(`particle minecraft:totem_particle ${sonic.location.x} ${sonic.location.y + 2} ${sonic.location.z}`);
    sonic.dimension.runCommand(`playsound random.levelup @a`);
  } catch(e) {}
}

function checkAchievements(sonic, state) {
  if (state.inv.wood > 0)    unlockAchievement(sonic, state, "first_wood");
  if (state.inv.stone > 0)   unlockAchievement(sonic, state, "first_stone");
  if (state.inv.coal > 0)    unlockAchievement(sonic, state, "first_coal");
  if (state.inv.iron > 0)    unlockAchievement(sonic, state, "first_iron");
  if (state.inv.gold > 0)    unlockAchievement(sonic, state, "first_gold");
  if (state.inv.diamond > 0) unlockAchievement(sonic, state, "first_diamond");
  if (state.mined >= 100)    unlockAchievement(sonic, state, "mine_100");
  if (state.mined >= 500)    unlockAchievement(sonic, state, "mine_500");
  if (state.kills >= 1)      unlockAchievement(sonic, state, "first_kill");
  if (state.kills >= 10)     unlockAchievement(sonic, state, "kill_10");
  if (state.kills >= 50)     unlockAchievement(sonic, state, "kill_50");
  if (state.kills >= 100)    unlockAchievement(sonic, state, "kill_100");
  if (state.hasShelter)      unlockAchievement(sonic, state, "first_shelter");
  if (state.inv.sword)       unlockAchievement(sonic, state, "first_sword");
  if (state.inv.armor)       unlockAchievement(sonic, state, "first_armor");
  if (state.inv.food > 0)    unlockAchievement(sonic, state, "first_food");
  if (state.farmed > 0)      unlockAchievement(sonic, state, "farm_harvest");
  if (sonic.dimension?.id === "minecraft:nether") unlockAchievement(sonic, state, "first_nether");
  if (sonic.location?.y < -50) unlockAchievement(sonic, state, "deep_underground");
}

function showAchievements(sonic, state, player) {
  const unlocked = [...state.achievements];
  const total = Object.keys(ACHIEVEMENTS).length;
  player.sendMessage(`§5§l🏆 SONIC Achievements (${unlocked.length}/${total})`);
  player.sendMessage(`§6Level: ${state.level} | XP: ${state.xp} | Kills: ${state.kills}`);
  player.sendMessage(`§7━━━━━━━━━━━━━━━━━━━━━━`);
  if (unlocked.length === 0) {
    player.sendMessage("§7Abhi koi achievement nahi mili!");
  } else {
    for (const key of unlocked) {
      const a = ACHIEVEMENTS[key];
      player.sendMessage(`§a✅ ${a.title} §7— ${a.desc} §6(+${a.xp}xp)`);
    }
  }
  const locked = Object.keys(ACHIEVEMENTS).filter(k => !state.achievements.has(k)).slice(0, 5);
  if (locked.length > 0) {
    player.sendMessage(`§7━━ Agle Achievements ━━`);
    for (const key of locked) {
      const a = ACHIEVEMENTS[key];
      player.sendMessage(`§8🔒 ${a.title} §7— ${a.desc}`);
    }
  }
}

// ════════════════════════════════════════════
//  WORLD MEMORY
// ════════════════════════════════════════════
const WORLD_MEMORY = {
  overworld: { locations: {}, dangerZones: [], resourceSpots: [], exploredChunks: new Set() },
  nether:    { locations: {}, dangerZones: [], resourceSpots: [], exploredChunks: new Set() },
  the_end:   { locations: {}, dangerZones: [], resourceSpots: [], exploredChunks: new Set() }
};

function getMemory(dimId) {
  const key = dimId.replace("minecraft:", "");
  return WORLD_MEMORY[key] || WORLD_MEMORY.overworld;
}

function rememberLocation(sonic, state, name, type) {
  const loc = sonic.location;
  const mem = getMemory(sonic.dimension.id);
  mem.locations[name.toLowerCase()] = {
    x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z),
    type, savedAt: state.tick
  };
  say(sonic, `${type} save kiya: §e${name} §f(${Math.floor(loc.x)}, ${Math.floor(loc.z)}) 📍`, "happy");
}

function goToSavedLocation(sonic, state, name) {
  const mem = getMemory(sonic.dimension.id);
  const loc = mem.locations[name.toLowerCase()];
  if (!loc) {
    say(sonic, `${name} ki location yaad nahi! Pehle 'save ${name}' bolo! 📍`, "sad");
    return false;
  }
  cmd(sonic, `tp @e[type=${SONIC_ID},r=60] ${loc.x} ${loc.y} ${loc.z}`);
  say(sonic, `${name} pe aa gaya! (${loc.x}, ${loc.z}) 🗺️`, "excited");
  return true;
}

function showWorldMap(sonic, state, player) {
  const mem = getMemory(sonic.dimension.id);
  const locs = Object.entries(mem.locations);
  player.sendMessage("§2§l🗺️ SONIC World Memory");
  player.sendMessage(`§7━━━━━━━━━━━━━━━━━━━━━━`);
  player.sendMessage(`§aChunks: §f${mem.exploredChunks.size} | §cDangers: §f${mem.dangerZones.length} | §6Resources: §f${mem.resourceSpots.length}`);
  if (locs.length === 0) {
    player.sendMessage("§7Koi location save nahi! 'save base' bolo");
  } else {
    player.sendMessage("§e📍 Saved Locations:");
    for (const [name, loc] of locs) {
      const icon = loc.type === "BASE" ? "🏠" : loc.type === "MINE" ? "⛏️" : loc.type === "VILLAGE" ? "🏘️" : "📍";
      player.sendMessage(`  ${icon} §f${name}: §7(${loc.x}, ${loc.y}, ${loc.z})`);
    }
  }
}

// ════════════════════════════════════════════
//  DANGER DETECTION
// ════════════════════════════════════════════
const HOSTILES = [
  "minecraft:zombie", "minecraft:skeleton", "minecraft:creeper",
  "minecraft:spider", "minecraft:witch", "minecraft:pillager",
  "minecraft:phantom", "minecraft:drowned", "minecraft:husk",
  "minecraft:blaze", "minecraft:enderman", "minecraft:slime",
  "minecraft:ravager", "minecraft:vindicator", "minecraft:stray"
];

function getNearbyMobs(sonic, range) {
  return sonic.dimension.getEntities({ location: sonic.location, maxDistance: range })
    .filter(e => HOSTILES.includes(e.typeId));
}

function scanDangers(sonic, state) {
  const loc = sonic.location;
  const x = Math.floor(loc.x), y = Math.floor(loc.y), z = Math.floor(loc.z);
  const dangers = [];
  // Lava check
  for (let dx = -3; dx <= 3; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -3; dz <= 3; dz++) {
        try {
          const b = sonic.dimension.getBlock({ x: x + dx, y: y + dy, z: z + dz });
          if (b && (b.typeId === "minecraft:lava" || b.typeId === "minecraft:flowing_lava")) {
            dangers.push({ type: "LAVA", x: x + dx, y: y + dy, z: z + dz, dist: Math.abs(dx) + Math.abs(dz) });
          }
        } catch(e) {}
      }
    }
  }
  // Creeper check
  const creepers = sonic.dimension.getEntities({ location: sonic.location, maxDistance: 8 })
    .filter(e => e.typeId === "minecraft:creeper");
  if (creepers.length > 0) dangers.push({ type: "CREEPER", count: creepers.length });
  // Void check
  if (y < -60) dangers.push({ type: "VOID", y });
  return dangers;
}

function runDangerCheck(sonic, state, player) {
  const dangers = scanDangers(sonic, state);
  if (dangers.length === 0) return false;
  const priority = { CREEPER: 5, LAVA: 4, VOID: 4 };
  dangers.sort((a, b) => (priority[b.type] || 0) - (priority[a.type] || 0));
  const danger = dangers[0];
  const loc = sonic.location;
  const x = Math.floor(loc.x), y = Math.floor(loc.y), z = Math.floor(loc.z);
  if (danger.type === "LAVA") {
    const awayX = x + (x - danger.x) * 3;
    const awayZ = z + (z - danger.z) * 3;
    cmd(sonic, `tp @e[type=${SONIC_ID},r=5] ${awayX} ${y + 1} ${awayZ}`);
    if (danger.dist <= 2) cmd(sonic, `setblock ${danger.x} ${danger.y} ${danger.z} minecraft:cobblestone`);
    say(sonic, "§4⚠️ LAVA! §fDoor ho gaya! 🔥", "alert");
  } else if (danger.type === "CREEPER") {
    const fleeX = x + (Math.random() > 0.5 ? 10 : -10);
    const fleeZ = z + (Math.random() > 0.5 ? 10 : -10);
    cmd(sonic, `tp @e[type=${SONIC_ID},r=5] ${fleeX.toFixed(0)} ${y} ${fleeZ.toFixed(0)}`);
    say(sonic, `§c💥 CREEPER! §fBHAAG RAHA HOON! 💨`, "scared");
  } else if (danger.type === "VOID") {
    cmd(sonic, `tp @e[type=${SONIC_ID},r=5] ${x} ${y + 5} ${z}`);
    say(sonic, "§4⚠️ VOID! §fWapas upar! 🆘", "alert");
  }
  return true;
}

// ════════════════════════════════════════════
//  PATHFINDING
// ════════════════════════════════════════════
function doClimb(sonic, state, sx, sy, sz, dx, dz) {
  let h = 0;
  const iv = system.runInterval(() => {
    if (h < 4) {
      cmd(sonic, `setblock ${sx + dx} ${sy + h} ${sz + dz} minecraft:cobblestone`);
      cmd(sonic, `tp @e[type=${SONIC_ID},r=5] ${sx + dx} ${sy + h + 1} ${sz + dz}`);
      h++;
    } else {
      system.clearRun(iv);
      state.pathMode = null;
    }
  }, 5);
  say(sonic, "Upar chadh raha hoon! ⛰️", "focused");
}

function doBridge(sonic, state, sx, sy, sz, dx, dz, length) {
  const maxLen = Math.min(length, 20);
  let placed = 0;
  const iv = system.runInterval(() => {
    if (placed >= maxLen) { system.clearRun(iv); state.pathMode = null; return; }
    const bx = sx + dx * (placed + 1);
    const bz = sz + dz * (placed + 1);
    cmd(sonic, `setblock ${bx} ${sy - 1} ${bz} minecraft:cobblestone`);
    cmd(sonic, `setblock ${bx} ${sy} ${bz} air`);
    cmd(sonic, `tp @e[type=${SONIC_ID},r=5] ${bx} ${sy} ${bz}`);
    placed++;
  }, 4);
  say(sonic, "Bridge bana raha hoon! 🌉", "focused");
  state.built += maxLen;
}

// ════════════════════════════════════════════
//  SURVIVAL
// ════════════════════════════════════════════
const FOOD_ANIMALS = ["minecraft:cow", "minecraft:pig", "minecraft:sheep", "minecraft:chicken", "minecraft:rabbit"];

function autoFoodHunt(sonic, state, player) {
  const animals = sonic.dimension.getEntities({ location: sonic.location, maxDistance: 30 })
    .filter(e => FOOD_ANIMALS.includes(e.typeId));
  if (animals.length > 0) {
    const t = animals[0];
    const tl = t.location;
    cmd(sonic, `tp @e[type=${SONIC_ID},r=60] ${tl.x.toFixed(1)} ${tl.y.toFixed(1)} ${tl.z.toFixed(1)}`);
    cmd(sonic, `execute as @e[type=${SONIC_ID},r=5] at @s run attack @e[type=${t.typeId},r=3,c=1]`);
    cmd(sonic, `give @a[r=15] minecraft:cooked_beef 3`);
    state.inv.food += 3;
    say(sonic, "Khana mil gaya! Cooked beef 3x! 🍖", "excited");
  } else {
    cmd(sonic, `give @a[r=15] minecraft:bread 2`);
    cmd(sonic, `give @a[r=15] minecraft:apple 2`);
    state.inv.food += 4;
    say(sonic, "Khana gather kar liya! 🍎", "happy");
  }
}

function autoEat(sonic, state) {
  cmd(sonic, `effect @a[r=20] saturation 30 2`);
  cmd(sonic, `effect @a[r=20] regeneration 10 1`);
  state.inv.food = Math.max(0, state.inv.food - 2);
  say(sonic, "Khana khaya! Health regenerate! 🍗", "happy");
}

function autoNightShelter(sonic, state, player) {
  if (state.nightShelterBuilt) {
    say(sonic, "Shelter already hai! Andar aa jao! 🏕️", "alert");
    return;
  }
  const l = player.location;
  const ox = Math.floor(l.x) + 5, oy = Math.floor(l.y), oz = Math.floor(l.z);
  const cmds = [
    `fill ${ox} ${oy} ${oz} ${ox + 6} ${oy} ${oz + 6} minecraft:cobblestone`,
    `fill ${ox} ${oy + 1} ${oz} ${ox + 6} ${oy + 3} ${oz} minecraft:cobblestone`,
    `fill ${ox} ${oy + 1} ${oz + 6} ${ox + 6} ${oy + 3} ${oz + 6} minecraft:cobblestone`,
    `fill ${ox} ${oy + 1} ${oz} ${ox} ${oy + 3} ${oz + 6} minecraft:cobblestone`,
    `fill ${ox + 6} ${oy + 1} ${oz} ${ox + 6} ${oy + 3} ${oz + 6} minecraft:cobblestone`,
    `fill ${ox} ${oy + 4} ${oz} ${ox + 6} ${oy + 4} ${oz + 6} minecraft:cobblestone`,
    `setblock ${ox + 3} ${oy + 1} ${oz} minecraft:air`,
    `setblock ${ox + 3} ${oy + 2} ${oz} minecraft:air`,
    `setblock ${ox + 1} ${oy + 1} ${oz + 1} minecraft:torch`,
    `setblock ${ox + 5} ${oy + 1} ${oz + 5} minecraft:torch`,
    `setblock ${ox + 3} ${oy + 1} ${oz + 4} minecraft:red_bed`,
    `setblock ${ox + 2} ${oy + 1} ${oz + 5} minecraft:crafting_table`,
    `setblock ${ox + 4} ${oy + 1} ${oz + 5} minecraft:chest`,
  ];
  let i = 0;
  const iv = system.runInterval(() => {
    for (let b = 0; b < 4 && i < cmds.length; b++, i++) cmd(sonic, cmds[i]);
    if (i >= cmds.length) {
      system.clearRun(iv);
      state.nightShelterBuilt = true;
      state.hasShelter = true;
      state.built += cmds.length;
      say(sonic, "§cRaat aa rahi hai! §fShelter ready, andar aa jao! 🌙🏠", "alert");
      checkAchievements(sonic, state);
    }
  }, 3);
}

function autoArmorUp(sonic, state) {
  cmd(sonic, `replaceitem entity @e[type=${SONIC_ID},r=5] slot.armor.head 0 minecraft:iron_helmet`);
  cmd(sonic, `replaceitem entity @e[type=${SONIC_ID},r=5] slot.armor.chest 0 minecraft:iron_chestplate`);
  cmd(sonic, `replaceitem entity @e[type=${SONIC_ID},r=5] slot.armor.legs 0 minecraft:iron_leggings`);
  cmd(sonic, `replaceitem entity @e[type=${SONIC_ID},r=5] slot.armor.feet 0 minecraft:iron_boots`);
  cmd(sonic, `replaceitem entity @e[type=${SONIC_ID},r=5] slot.weapon.mainhand 0 minecraft:iron_sword`);
  state.inv.armor = true;
  state.inv.sword = true;
  say(sonic, "Iron armor & sword ready! 💎⚔️", "excited");
  checkAchievements(sonic, state);
}

function autoLightUp(sonic, player) {
  const l = player.location;
  for (let x = -6; x <= 6; x += 4) {
    for (let z = -6; z <= 6; z += 4) {
      cmd(sonic, `setblock ${Math.floor(l.x) + x} ${Math.floor(l.y) + 1} ${Math.floor(l.z) + z} minecraft:torch`);
    }
  }
  say(sonic, "Torches laga diye! Mobs nahi aayenge! 🔦", "focused");
}

// ════════════════════════════════════════════
//  COMBAT
// ════════════════════════════════════════════
function craftAtTable(sonic, state, item, forPlayer = false) {
  const loc = sonic.location;
  const x = Math.floor(loc.x), y = Math.floor(loc.y), z = Math.floor(loc.z);
  let tableFound = false;
  for (let dx = -4; dx <= 4 && !tableFound; dx++) {
    for (let dz = -4; dz <= 4 && !tableFound; dz++) {
      try {
        const b = sonic.dimension.getBlock({ x: x + dx, y, z: z + dz });
        if (b && b.typeId === "minecraft:crafting_table") {
          tableFound = true;
          cmd(sonic, `tp @e[type=${SONIC_ID},r=60] ${x + dx} ${y} ${z + dz}`);
        }
      } catch(e) {}
    }
  }
  if (!tableFound) {
    cmd(sonic, `setblock ${x + 1} ${y} ${z} minecraft:crafting_table`);
    cmd(sonic, `tp @e[type=${SONIC_ID},r=60] ${x + 1} ${y} ${z}`);
  }
  const target = forPlayer ? "@a[r=20]" : `@e[type=${SONIC_ID},r=3]`;
  const craftMap = {
    sword_wood:    ["minecraft:wooden_sword",    1],
    sword_stone:   ["minecraft:stone_sword",     1],
    sword_iron:    ["minecraft:iron_sword",      1],
    sword_diamond: ["minecraft:diamond_sword",   1],
    pickaxe_iron:  ["minecraft:iron_pickaxe",    1],
    pickaxe_stone: ["minecraft:stone_pickaxe",   1],
    axe_iron:      ["minecraft:iron_axe",        1],
    armor_iron:    ["minecraft:iron_chestplate", "minecraft:iron_helmet", "minecraft:iron_leggings", "minecraft:iron_boots"],
    armor_diamond: ["minecraft:diamond_chestplate", "minecraft:diamond_helmet", "minecraft:diamond_leggings", "minecraft:diamond_boots"],
    torch:         ["minecraft:torch",           8],
    chest:         ["minecraft:chest",           1],
    bread:         ["minecraft:bread",           3],
    bow:           ["minecraft:bow",             1],
    shield:        ["minecraft:shield",          1],
  };
  const recipe = craftMap[item];
  if (!recipe) return;
  if (Array.isArray(recipe) && typeof recipe[0] === "string" && recipe[0].startsWith("minecraft:")) {
    if (recipe.length > 2 || typeof recipe[1] === "string") {
      for (const i of recipe) cmd(sonic, `give ${target} ${i} 1`);
    } else {
      cmd(sonic, `give ${target} ${recipe[0]} ${recipe[1] || 1}`);
    }
  }
  if (item.includes("sword")) state.inv.sword = true;
  if (item.includes("armor")) state.inv.armor = true;
  if (item.includes("pickaxe")) state.inv.pickaxe = true;
  checkAchievements(sonic, state);
  const who = forPlayer ? "tumhare liye" : "apne liye";
  say(sonic, `${who} craft kiya: ${item.replace(/_/g, " ")}! ✨`, "excited");
}

function getBestSword(state) {
  if (state.inv.diamond >= 2) return "sword_diamond";
  if (state.inv.iron >= 2)    return "sword_iron";
  if (state.inv.stone >= 2)   return "sword_stone";
  return "sword_wood";
}

function combatAttack(sonic, state) {
  const mobs = getNearbyMobs(sonic, 20);
  if (!mobs.length) { state.action = "FOLLOW"; return; }
  if (mobs.length >= 3) { combatFlee(sonic, state, nearest(sonic)); return; }
  const t = mobs[0];
  const tl = t.location;
  cmd(sonic, `execute as @e[type=${SONIC_ID},r=5] at @s run attack @e[type=${t.typeId},r=5,c=1]`);
  cmd(sonic, `tp @e[type=${SONIC_ID},r=60] ${tl.x.toFixed(1)} ${tl.y.toFixed(1)} ${tl.z.toFixed(1)}`);
  cmd(sonic, `damage @e[type=${t.typeId},r=3,c=1] 7 entity_attack`);
  state.kills++;
  state.combatStreak++;
  checkAchievements(sonic, state);
  if (t.typeId === "minecraft:ender_dragon") {
    unlockAchievement(sonic, state, "first_dragon");
    say(sonic, "§4§lENDER DRAGON SE LAD RAHA HOON! 🐉", "alert");
  }
}

function combatFlee(sonic, state, player) {
  if (!player) return;
  const sl = sonic.location;
  const mobs = getNearbyMobs(sonic, 20);
  if (mobs.length > 0) {
    const ml = mobs[0].location;
    const dx = sl.x - ml.x, dz = sl.z - ml.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const fleeX = sl.x + (dx / len) * 10;
    const fleeZ = sl.z + (dz / len) * 10;
    cmd(sonic, `tp @e[type=${SONIC_ID},r=60] ${fleeX.toFixed(1)} ${sl.y.toFixed(1)} ${fleeZ.toFixed(1)}`);
  }
  tpNear(sonic, player, 2);
  say(sonic, `§c${mobs.length} mobs! §fBhaag raha hoon! 🏃💨`, "scared");
  state.action = "FOLLOW";
}

function smartCombat(sonic, state, player) {
  const mobs = getNearbyMobs(sonic, 20);
  if (!mobs.length) { state.action = "FOLLOW"; return; }
  if (mobs.length >= 3) { combatFlee(sonic, state, player); return; }
  if (!state.inv.sword) {
    craftAtTable(sonic, state, getBestSword(state), false);
    system.runTimeout(() => { combatAttack(sonic, state); }, 40);
    return;
  }
  combatAttack(sonic, state);
}

// ════════════════════════════════════════════
//  MINING
// ════════════════════════════════════════════
function smartMine(sonic, state, type) {
  const loc = sonic.location;
  const x = Math.floor(loc.x), y = Math.floor(loc.y), z = Math.floor(loc.z);
  const oreMap = {
    MINE_SMART:   ["minecraft:diamond_ore", "minecraft:deepslate_diamond_ore", "minecraft:iron_ore", "minecraft:gold_ore", "minecraft:coal_ore"],
    MINE_STRIP:   ["minecraft:stone", "minecraft:deepslate"],
    MINE_BRANCH:  ["minecraft:diamond_ore", "minecraft:deepslate_diamond_ore", "minecraft:iron_ore"],
    COLLECT_WOOD: ["minecraft:oak_log", "minecraft:birch_log", "minecraft:spruce_log", "minecraft:dark_oak_log", "minecraft:acacia_log", "minecraft:jungle_log"],
    COLLECT_STONE:["minecraft:stone", "minecraft:cobblestone", "minecraft:deepslate"]
  };
  const targets = oreMap[type] || oreMap["MINE_SMART"];
  let found = false;
  outer: for (let dy = 1; dy >= -5; dy--) {
    for (let r = 0; r <= 4; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          try {
            const b = sonic.dimension.getBlock({ x: x + dx, y: y + dy, z: z + dz });
            if (b && targets.includes(b.typeId)) {
              cmd(sonic, `setblock ${x + dx} ${y + dy} ${z + dz} air destroy`);
              cmd(sonic, `tp @e[type=${SONIC_ID},r=60] ${x + dx} ${y + dy} ${z + dz}`);
              state.mined++;
              if (b.typeId.includes("diamond")) state.inv.diamond++;
              else if (b.typeId.includes("gold")) state.inv.gold++;
              else if (b.typeId.includes("iron")) state.inv.iron++;
              else if (b.typeId.includes("coal")) state.inv.coal++;
              else if (b.typeId.includes("log"))  state.inv.wood++;
              else state.inv.stone++;
              checkAchievements(sonic, state);
              found = true;
              break outer;
            }
          } catch(e) {}
        }
      }
    }
  }
  if (!found) {
    cmd(sonic, `setblock ${x} ${y} ${z + 1} air destroy`);
    cmd(sonic, `setblock ${x} ${y + 1} ${z + 1} air destroy`);
    cmd(sonic, `tp @e[type=${SONIC_ID},r=60] ${x} ${y} ${z + 1}`);
  }
}

// ════════════════════════════════════════════
//  BUILDING
// ════════════════════════════════════════════
function buildFullHouse(sonic, player, state) {
  const l = player.location;
  const ox = Math.floor(l.x) + 8, oy = Math.floor(l.y), oz = Math.floor(l.z);
  const cmds = [
    `fill ${ox} ${oy} ${oz} ${ox + 10} ${oy + 6} ${oz + 10} air`,
    `fill ${ox} ${oy - 1} ${oz} ${ox + 10} ${oy - 1} ${oz + 10} minecraft:stone_bricks`,
    `fill ${ox} ${oy} ${oz} ${ox + 10} ${oy} ${oz + 10} minecraft:oak_planks`,
    `fill ${ox} ${oy + 1} ${oz} ${ox + 10} ${oy + 5} ${oz} minecraft:stone_bricks`,
    `fill ${ox} ${oy + 1} ${oz + 10} ${ox + 10} ${oy + 5} ${oz + 10} minecraft:stone_bricks`,
    `fill ${ox} ${oy + 1} ${oz} ${ox} ${oy + 5} ${oz + 10} minecraft:stone_bricks`,
    `fill ${ox + 10} ${oy + 1} ${oz} ${ox + 10} ${oy + 5} ${oz + 10} minecraft:stone_bricks`,
    `fill ${ox} ${oy + 6} ${oz} ${ox + 10} ${oy + 6} ${oz + 10} minecraft:oak_planks`,
    `setblock ${ox + 5} ${oy + 1} ${oz} minecraft:air`,
    `setblock ${ox + 5} ${oy + 2} ${oz} minecraft:air`,
    `setblock ${ox + 1} ${oy + 1} ${oz + 1} minecraft:sea_lantern`,
    `setblock ${ox + 9} ${oy + 1} ${oz + 1} minecraft:sea_lantern`,
    `setblock ${ox + 1} ${oy + 1} ${oz + 9} minecraft:sea_lantern`,
    `setblock ${ox + 9} ${oy + 1} ${oz + 9} minecraft:sea_lantern`,
    `setblock ${ox + 1} ${oy + 1} ${oz + 5} minecraft:red_bed`,
    `setblock ${ox + 3} ${oy + 1} ${oz + 9} minecraft:crafting_table`,
    `setblock ${ox + 4} ${oy + 1} ${oz + 9} minecraft:furnace`,
    `setblock ${ox + 7} ${oy + 1} ${oz + 9} minecraft:chest`,
    `setblock ${ox + 9} ${oy + 1} ${oz + 6} minecraft:enchanting_table`,
  ];
  say(sonic, "Pura ghar bana raha hoon! 🏠", "excited");
  let i = 0;
  const iv = system.runInterval(() => {
    for (let b = 0; b < 4 && i < cmds.length; b++, i++) cmd(sonic, cmds[i]);
    if (i >= cmds.length) {
      system.clearRun(iv);
      state.built += cmds.length;
      state.hasShelter = true;
      state.hasBed = true;
      say(sonic, "§aGhar taiyaar! Stone brick + sabhi furniture! 🏰", "excited");
      checkAchievements(sonic, state);
      state.action = "FOLLOW";
    }
  }, 3);
}

// ════════════════════════════════════════════
//  FARMING
// ════════════════════════════════════════════
function buildAndPlantFarm(sonic, player, state) {
  const l = player.location;
  const ox = Math.floor(l.x) + 6, oy = Math.floor(l.y), oz = Math.floor(l.z);
  for (let x = 0; x <= 10; x++) {
    for (let z = 0; z <= 10; z++) {
      if ((x === 3 || x === 7) && (z === 3 || z === 7)) {
        cmd(sonic, `setblock ${ox + x} ${oy} ${oz + z} minecraft:water`);
      } else {
        cmd(sonic, `setblock ${ox + x} ${oy} ${oz + z} minecraft:farmland`);
        if (x % 3 === 0)      cmd(sonic, `setblock ${ox + x} ${oy + 1} ${oz + z} minecraft:wheat`);
        else if (x % 3 === 1) cmd(sonic, `setblock ${ox + x} ${oy + 1} ${oz + z} minecraft:carrots`);
        else                  cmd(sonic, `setblock ${ox + x} ${oy + 1} ${oz + z} minecraft:potatoes`);
      }
    }
  }
  state.built += 121;
  state.farmed += 80;
  say(sonic, "Farm ready! Wheat + carrots + potatoes! 🌾🥕🥔", "happy");
  checkAchievements(sonic, state);
}

function harvestFarm(sonic, state) {
  const loc = sonic.location;
  const crops = ["minecraft:wheat", "minecraft:carrots", "minecraft:potatoes", "minecraft:beetroot"];
  let total = 0;
  for (let x = -8; x <= 8; x++) {
    for (let z = -8; z <= 8; z++) {
      try {
        const b = sonic.dimension.getBlock({
          x: Math.floor(loc.x) + x, y: Math.floor(loc.y), z: Math.floor(loc.z) + z
        });
        if (b && crops.includes(b.typeId)) {
          cmd(sonic, `setblock ${Math.floor(loc.x) + x} ${Math.floor(loc.y)} ${Math.floor(loc.z) + z} air destroy`);
          total++;
          state.inv.food++;
          state.farmed++;
        }
      } catch(e) {}
    }
  }
  if (total > 0) say(sonic, `${total} crops harvest! 🌾`, "excited");
  else say(sonic, "Crops ready nahi! Thoda wait karo!", "sad");
}

// ════════════════════════════════════════════
//  CRAFTING
// ════════════════════════════════════════════
function parsePlayerCraftRequest(msg) {
  const m = msg.toLowerCase();
  if (m.includes("diamond sword") || (m.includes("diamond") && m.includes("sword"))) return { item: "sword_diamond", forPlayer: true };
  if (m.includes("iron sword") || (m.includes("iron") && m.includes("sword"))) return { item: "sword_iron", forPlayer: true };
  if (m.includes("sword"))        return { item: "sword_stone",  forPlayer: true };
  if (m.includes("diamond armor") || (m.includes("diamond") && m.includes("armor"))) return { item: "armor_diamond", forPlayer: true };
  if (m.includes("armor") || m.includes("helmet")) return { item: "armor_iron", forPlayer: true };
  if (m.includes("pickaxe") || m.includes("kudali")) return { item: "pickaxe_iron", forPlayer: true };
  if (m.includes("torch") || m.includes("mashaal")) return { item: "torch",         forPlayer: true };
  if (m.includes("chest") || m.includes("sandook")) return { item: "chest",         forPlayer: true };
  if (m.includes("bow")   || m.includes("teer"))    return { item: "bow",           forPlayer: true };
  if (m.includes("shield") || m.includes("dhaal"))  return { item: "shield",        forPlayer: true };
  if (m.includes("bread") || m.includes("roti"))    return { item: "bread",         forPlayer: true };
  return null;
}

function autoCraft(sonic, state, player, type, forPlayer = false) {
  let item = "sword_wood";
  if (type === "CRAFT_WEAPONS")  item = getBestSword(state);
  else if (type === "CRAFT_TOOLS")  item = state.inv.iron >= 3 ? "pickaxe_iron" : "pickaxe_stone";
  else if (type === "CRAFT_ARMOR")  item = state.inv.diamond >= 4 ? "armor_diamond" : "armor_iron";
  else if (type === "CRAFT_FOOD")   item = "bread";
  else if (type === "CRAFT_UTILITY") item = "torch";
  else if (type === "CRAFT_AUTO") {
    if (!state.inv.sword)          item = getBestSword(state);
    else if (state.inv.iron >= 4)  item = "armor_iron";
    else                           item = "pickaxe_iron";
  }
  craftAtTable(sonic, state, item, forPlayer);
}

// ════════════════════════════════════════════
//  EXPLORATION
// ════════════════════════════════════════════
function smartExplore(sonic, state, player) {
  const l = sonic.location;
  const x = Math.floor(l.x), y = Math.floor(l.y), z = Math.floor(l.z);
  const radius = 20 + (state.tick % 100);
  const angle = (state.tick * 0.1) % (2 * Math.PI);
  const tx = x + Math.floor(radius * Math.cos(angle));
  const tz = z + Math.floor(radius * Math.sin(angle));
  const ahead  = getBlock(sonic.dimension, x + Math.sign(tx - x), y, z + Math.sign(tz - z));
  const aheadH = getBlock(sonic.dimension, x + Math.sign(tx - x), y + 1, z + Math.sign(tz - z));
  if (isSolid(ahead) && isSolid(aheadH)) {
    doClimb(sonic, state, x, y, z, Math.sign(tx - x), Math.sign(tz - z));
  } else {
    cmd(sonic, `tp @e[type=${SONIC_ID},r=5] ${tx} ${y} ${tz}`);
  }
  if (state.tick % 40 === 0) cmd(sonic, `setblock ${x} ${y + 1} ${z} minecraft:torch`);
  // Update memory
  const mem = getMemory(sonic.dimension.id);
  const chunkKey = `${Math.floor(x / 16)},${Math.floor(z / 16)}`;
  mem.exploredChunks.add(chunkKey);
}

// ════════════════════════════════════════════
//  INVENTORY DISPLAY
// ════════════════════════════════════════════
function showInventory(sonic, state, player) {
  player.sendMessage("§b§l📦 SONIC Inventory");
  player.sendMessage(`§7━━━━━━━━━━━━━━━━━━━━━━`);
  player.sendMessage(`§6🪵 Wood: ${state.inv.wood}    §7⚙️ Iron: ${state.inv.iron}`);
  player.sendMessage(`§7🪨 Stone: ${state.inv.stone}   §7🪙 Gold: ${state.inv.gold}`);
  player.sendMessage(`§b💎 Diamond: ${state.inv.diamond}  §7🪨 Coal: ${state.inv.coal}`);
  player.sendMessage(`§a🍗 Food: ${state.inv.food}    §7🔦 Torches: ${state.inv.torches}`);
  player.sendMessage(`§7━━━━━━━━━━━━━━━━━━━━━━`);
  player.sendMessage(`§c⚔️ Sword: ${state.inv.sword ? "§aYES ✅" : "§cNO ❌"}  §7🛡️ Armor: ${state.inv.armor ? "§aYES ✅" : "§cNO ❌"}`);
  player.sendMessage(`§7⛏️ Pickaxe: ${state.inv.pickaxe ? "§aYES ✅" : "§cNO ❌"}`);
  if (!state.inv.sword)    player.sendMessage("§e⚠️ Tip: Sword nahi! 'sword bana do' bolo");
  if (!state.inv.armor)    player.sendMessage("§e⚠️ Tip: Armor nahi! 'armor chahiye' bolo");
  if (state.inv.food < 3)  player.sendMessage("§e⚠️ Tip: Khana kam! 'khana dhundho' bolo");
}

// ════════════════════════════════════════════
//  MAIN DISPATCH
// ════════════════════════════════════════════
function dispatch(sonic, state, action, player) {
  if (!player) return;
  const loc = sonic.location;
  // SURVIVAL
  if (action === "AUTO_FOOD_HUNT" || action === "AUTO_FOOD_GATHER") { autoFoodHunt(sonic, state, player); return; }
  if (action === "AUTO_EAT" || action === "AUTO_HEAL")              { autoEat(sonic, state); return; }
  if (action === "AUTO_NIGHT_SHELTER")  { autoNightShelter(sonic, state, player); return; }
  if (action === "AUTO_LIGHT_UP")       { autoLightUp(sonic, player); return; }
  if (action === "AUTO_ARMOR_UP" || action === "AUTO_WEAPON_UP") { autoArmorUp(sonic, state); return; }
  // COMBAT
  if (action === "COMBAT_ATTACK")  { combatAttack(sonic, state); return; }
  if (action === "COMBAT_FLEE")    { combatFlee(sonic, state, player); return; }
  if (action === "COMBAT_DEFEND")  { tpNear(sonic, player, 2); combatAttack(sonic, state); return; }
  if (action === "COMBAT_RANGED")  { combatAttack(sonic, state); return; }
  // PATH
  if (action === "PATH_CLIMB")  { doClimb(sonic, state, Math.floor(loc.x), Math.floor(loc.y), Math.floor(loc.z), 0, 1); return; }
  if (action === "PATH_BRIDGE") { doBridge(sonic, state, Math.floor(loc.x), Math.floor(loc.y), Math.floor(loc.z), 0, 1, 10); return; }
  if (action === "PATH_JUMP")   { cmd(sonic, `tp @e[type=${SONIC_ID},r=5] ${(loc.x + 1).toFixed(0)} ${(loc.y + 1).toFixed(0)} ${loc.z.toFixed(0)}`); return; }
  if (action === "PATH_SWIM")   { cmd(sonic, `tp @e[type=${SONIC_ID},r=5] ${loc.x.toFixed(0)} ${loc.y.toFixed(0)} ${(loc.z + 2).toFixed(0)}`); return; }
  // MINING
  if (action === "MINE_SMART" || action === "MINE_STRIP" || action === "MINE_BRANCH" ||
      action === "COLLECT_WOOD" || action === "COLLECT_STONE") { smartMine(sonic, state, action); return; }
  // BUILDING
  if (action === "BUILD_FULL_HOUSE") { buildFullHouse(sonic, player, state); return; }
  if (action === "BUILD_EMERGENCY")  { autoNightShelter(sonic, state, player); return; }
  if (action === "BUILD_BRIDGE")     { doBridge(sonic, state, Math.floor(loc.x), Math.floor(loc.y), Math.floor(loc.z), 0, 1, 15); return; }
  if (action === "BUILD_FARM")       { buildAndPlantFarm(sonic, player, state); return; }
  if (action === "BUILD_LADDER") {
    for (let h = 0; h < 8; h++) cmd(sonic, `setblock ${Math.floor(loc.x)} ${Math.floor(loc.y) + h} ${Math.floor(loc.z) + 1} minecraft:ladder`);
    say(sonic, "Ladder laga diya! 🪜", "happy"); return;
  }
  // FARMING
  if (action === "FARM_PLANT" || action === "FARM_ANIMAL_FARM") { buildAndPlantFarm(sonic, player, state); return; }
  if (action === "FARM_HARVEST") { harvestFarm(sonic, state); return; }
  if (action === "FARM_BREED") {
    cmd(sonic, `summon minecraft:cow ${Math.floor(loc.x) + 3} ${Math.floor(loc.y)} ${Math.floor(loc.z)}`);
    cmd(sonic, `summon minecraft:sheep ${Math.floor(loc.x) - 3} ${Math.floor(loc.y)} ${Math.floor(loc.z)}`);
    say(sonic, "Animals breed karaye! 🐄🐑", "happy"); return;
  }
  // CRAFTING
  if (action.startsWith("CRAFT_")) { autoCraft(sonic, state, player, action, false); return; }
  // EXPLORE
  if (action === "EXPLORE_SMART" || action === "SCOUT_AHEAD") { smartExplore(sonic, state, player); return; }
  if (action === "FIND_VILLAGE") { say(sonic, "Village dhundh raha hoon! 🗺️", "curious"); smartExplore(sonic, state, player); return; }
  if (action === "FIND_DUNGEON") { say(sonic, "Dungeon dhundh raha hoon! 🗺️", "curious"); smartExplore(sonic, state, player); return; }
  // SLEEP
  if (action === "SLEEP_SKIP_NIGHT") {
    cmd(sonic, `time set day`);
    cmd(sonic, `effect @a[r=20] regeneration 10 1`);
    say(sonic, "Raat skip! Good morning! ☀️", "happy");
    state.nightShelterBuilt = false; return;
  }
  // MOVE
  if (action === "FOLLOW") { tpNear(sonic, player, 3); return; }
}

// ════════════════════════════════════════════
//  AI CALL
// ════════════════════════════════════════════
async function think(sonic, playerName, message, context) {
  if (BUSY.get(sonic.id)) {
    say(sonic, "Soch raha hoon bhai, ek second...", "focused");
    return;
  }
  BUSY.set(sonic.id, true);
  try {
    const payload = JSON.stringify({ playerName, message, context });
    const req = new HttpRequest(API);
    req.method = HttpRequestMethod.Post;
    req.body = payload;
    req.headers = [{ name: "Content-Type", value: "application/json" }];
    req.timeout = 15;
    const res = await net.request(req);
    if (res.status === 200) {
      const data = JSON.parse(res.body);
      const state = getS(sonic.id);
      const player = nearest(sonic);
      if (data.message) say(sonic, data.message, data.mood || "happy");
      if (data.action && data.action !== "CHAT") {
        state.action = data.action;
        if (player) dispatch(sonic, state, data.action, player);
      }
      if (data.followup) {
        system.runTimeout(() => {
          const p = nearest(sonic);
          if (p) dispatch(sonic, getS(sonic.id), data.followup, p);
        }, 60);
      }
    } else {
      say(sonic, "Termux server chalaao! (node bridge.js) 📱", "sad");
    }
  } catch(e) {
    say(sonic, "AI offline! Termux mein bridge.js chalaao! 📱", "sad");
  } finally {
    BUSY.set(sonic.id, false);
  }
}

// ════════════════════════════════════════════
//  CONTEXT
// ════════════════════════════════════════════
function getCtx(sonic, player) {
  const mobs = getNearbyMobs(sonic, 20).map(e => e.typeId.replace("minecraft:", "")).slice(0, 4).join(", ") || "none";
  let health = 20, hunger = 20;
  try { health = Math.floor(player.getComponent("minecraft:health")?.currentValue || 20); } catch(e) {}
  try { hunger = Math.floor(player.getComponent("minecraft:food")?.foodLevel || 20); } catch(e) {}
  let time = "day";
  try {
    const tod = world.getTimeOfDay?.() || 0;
    time = (tod >= 13000 && tod <= 23000) ? "night" : "day";
  } catch(e) {}
  const state = getS(sonic.id);
  const dangers = scanDangers(sonic, state).map(d => d.type).join(", ") || "none";
  return {
    mobs, health, hunger, time,
    sonicHealth: state.sonicHP,
    hasShelter: state.hasShelter,
    hasBed: state.hasBed,
    dangers,
    inventory: `wood:${state.inv.wood} stone:${state.inv.stone} iron:${state.inv.iron} coal:${state.inv.coal} diamond:${state.inv.diamond} food:${state.inv.food}`
  };
}

// ════════════════════════════════════════════
//  AUTO SURVIVAL
// ════════════════════════════════════════════
function autoSurvival(sonic, state, player) {
  const ctx = getCtx(sonic, player);
  if (state.sonicHP < 10 && state.autoCD <= 0) {
    autoEat(sonic, state);
    state.autoCD = 200;
    return;
  }
  if (ctx.time === "night" && !state.hasShelter && state.autoCD <= 0) {
    if (!state.nightShelterBuilt && !BUSY.get(sonic.id)) {
      say(sonic, "§4⚠️ RAAT! Emergency shelter bana raha hoon! 🌙", "alert");
      autoNightShelter(sonic, state, player);
      state.autoCD = 600;
    }
    return;
  }
  if (ctx.mobs !== "none" && state.autoCD <= 0) {
    const mobs = getNearbyMobs(sonic, 16);
    if (mobs.length > 0) {
      smartCombat(sonic, state, player);
      state.autoCD = 40;
    }
    return;
  }
  if (ctx.hunger < 10 && state.lastFoodCheck + 400 < state.tick) {
    state.lastFoodCheck = state.tick;
    if (!BUSY.get(sonic.id)) {
      say(sonic, "Bhook lag rahi hai! 🍖", "focused");
      autoFoodHunt(sonic, state, player);
    }
  }
}

// ════════════════════════════════════════════
//  CHAT LISTENER
// ════════════════════════════════════════════
world.beforeEvents.chatSend.subscribe((event) => {
  const sender = event.sender;
  const msg = event.message.trim();
  const low = msg.toLowerCase();

  const sonics = sender.dimension.getEntities({ type: SONIC_ID, location: sender.location, maxDistance: 60 });
  if (!sonics.length) return;

  const sonic = sonics[0];
  const state = getS(sonic.id);

  // Stats
  if (low === "sonic stats") {
    sender.sendMessage(`§b⚡ SONIC Android — Level §6${state.level}§b (XP: ${state.xp})`);
    sender.sendMessage(`§7Kills:§c ${state.kills} §7Mined:§6 ${state.mined} §7Built:§a ${state.built} §7Farmed:§2 ${state.farmed}`);
    sender.sendMessage(`§5Achievements: §f${state.achievements.size}/${Object.keys(ACHIEVEMENTS).length}`);
    return;
  }
  if (low === "sonic achievements" || low === "sonic ach") { showAchievements(sonic, state, sender); return; }
  if (low === "sonic inv" || low === "sonic inventory")    { showInventory(sonic, state, sender); return; }
  if (low === "sonic map" || low === "map dikhao")         { showWorldMap(sonic, state, sender); return; }

  // Danger check
  if (low === "sonic danger" || low === "danger check") {
    const dangers = scanDangers(sonic, state);
    if (dangers.length === 0) sender.sendMessage("§a✅ Koi danger nahi! Safe hai! 😎");
    else {
      sender.sendMessage(`§c⚠️ ${dangers.length} dangers:`);
      for (const d of dangers) sender.sendMessage(`  §c• ${d.type}`);
    }
    return;
  }

  // Save location
  if (low.startsWith("save ") || low.startsWith("sonic save ")) {
    const namePart = low.replace("sonic save ", "").replace("save ", "").trim();
    if (namePart.length > 0) {
      const typeMap = { base:"BASE", ghar:"BASE", home:"BASE", mine:"MINE", village:"VILLAGE", farm:"FARM", portal:"PORTAL" };
      let type = "PLACE";
      for (const [kw, t] of Object.entries(typeMap)) { if (namePart.includes(kw)) { type = t; break; } }
      rememberLocation(sonic, state, namePart, type);
    }
    return;
  }

  // Go to location
  if (low.startsWith("go to ") || low.includes("pe jao") || low.includes("le chalo")) {
    const dest = low.replace("go to ", "").replace(" pe jao", "").replace(" le chalo", "").trim();
    goToSavedLocation(sonic, state, dest);
    return;
  }

  // Clear AI memory
  if (low === "sonic clear") {
    system.run(async () => {
      try {
        const req = new HttpRequest(CLEAR_API);
        req.method = HttpRequestMethod.Post;
        req.body = JSON.stringify({ playerName: sender.name });
        req.headers = [{ name: "Content-Type", value: "application/json" }];
        await net.request(req);
        say(sonic, "AI memory clear! Fresh start! 🧹", "happy");
      } catch(e) {}
    });
    return;
  }

  // Help
  if (low === "sonic help") {
    sender.sendMessage("§b§l⚡ SONIC Android — Commands:");
    sender.sendMessage("§7sonic stats / ach / inv / map / danger");
    sender.sendMessage("§7save base | go to base");
    sender.sendMessage("§7Kuch bhi Hindi/Hinglish mein bolo!");
    sender.sendMessage("§e📱 Termux mein 'node bridge.js' chalao!");
    return;
  }

  // Craft requests
  const craftKeywords = ["craft kar", "bana do", "chahiye", "de do", "dila do", "bana ke do"];
  const isCraftRequest = craftKeywords.some(k => low.includes(k)) &&
    (low.includes("sword") || low.includes("armor") || low.includes("pickaxe") ||
     low.includes("bow") || low.includes("torch") || low.includes("shield") ||
     low.includes("bread") || low.includes("kudali") || low.includes("dhaal"));
  if (isCraftRequest) {
    const craftReq = parsePlayerCraftRequest(low);
    if (craftReq) {
      say(sonic, `Tumhare liye craft karta hoon! 🪚`, "focused");
      system.run(() => craftAtTable(sonic, state, craftReq.item, true));
      return;
    }
  }

  // Send to AI
  const ctx = getCtx(sonic, sender);
  system.run(() => think(sonic, sender.name, msg, ctx));
});

// ════════════════════════════════════════════
//  MAIN TICK
// ════════════════════════════════════════════
system.runInterval(() => {
  for (const dn of ["overworld", "nether", "the_end"]) {
    let dim;
    try { dim = world.getDimension(`minecraft:${dn}`); } catch { continue; }
    for (const sonic of dim.getEntities({ type: SONIC_ID })) {
      const state = getS(sonic.id);
      state.tick++;
      if (state.chatCD > 0) state.chatCD--;
      if (state.hurtCD > 0) state.hurtCD--;
      if (state.autoCD > 0) state.autoCD--;
      const player = nearest(sonic);
      if (!player) continue;
      // Danger check every 0.5 sec
      if (state.tick % 10 === 0) runDangerCheck(sonic, state, player);
      // Auto survival every 2 sec
      if (state.tick % 40 === 0) autoSurvival(sonic, state, player);
      // Achievement display every 3 sec
      if (state.tick % 60 === 5 && state.achievementQueue.length > 0) displayNextAchievement(sonic, state);
      // Achievement check every 5 sec
      if (state.tick % 100 === 0) checkAchievements(sonic, state);
      // Continuous actions
      switch (state.action) {
        case "FOLLOW":        tpNear(sonic, player, 3); break;
        case "COMBAT_ATTACK": smartCombat(sonic, state, player); break;
        case "COMBAT_DEFEND": tpNear(sonic, player, 2); smartCombat(sonic, state, player); break;
        case "EXPLORE_SMART": if (state.tick % 20 === 0) smartExplore(sonic, state, player); break;
        default:
          if (state.action.startsWith("MINE_") || state.action === "COLLECT_WOOD") {
            if (state.tick % 15 === 0) { smartMine(sonic, state, state.action); tpNear(sonic, player, 5); }
          }
          break;
      }
      // Auto AI trigger every 15 sec
      if (state.tick % 300 === 0 && !BUSY.get(sonic.id)) {
        const ctx = getCtx(sonic, player);
        if (ctx.health < 8 || ctx.hunger < 6 || ctx.dangers !== "none" ||
           (ctx.mobs !== "none" && getNearbyMobs(sonic, 16).length > 3)) {
          system.run(() => think(sonic, player.name,
            `[AUTO] health:${ctx.health} hunger:${ctx.hunger} mobs:${ctx.mobs} time:${ctx.time}`, ctx));
        }
      }
      // Ambient chat every 4 min
      if (state.tick % 4800 === 0 && !BUSY.get(sonic.id)) {
        const ctx = getCtx(sonic, player);
        const msgs = [
          "Bhai adventure karte hain?",
          `Maine ${state.kills} mobs maare! 💪`,
          "Diamonds dhundhne chalein? 💎",
          "Farm harvest karna hai?",
          "Cave mein kuch interesting mil sakta hai!"
        ];
        system.run(() => think(sonic, player.name,
          `[SONIC thinking]: ${msgs[Math.floor(Math.random() * msgs.length)]}`, ctx));
      }
    }
  }
}, 10);

// ── Death → Auto Respawn ──────────────────────
world.afterEvents.entityDie.subscribe((ev) => {
  if (ev.deadEntity.typeId !== SONIC_ID) return;
  const loc = ev.deadEntity.location;
  const dim = ev.deadEntity.dimension;
  system.runTimeout(() => {
    try {
      dim.runCommand(`summon ${SONIC_ID} ${loc.x.toFixed(0)} ${loc.y.toFixed(0)} ${loc.z.toFixed(0)}`);
      dim.runCommand(`tellraw @a {"rawtext":[{"text":"§8[§bSONIC§8] §cMar gaya tha... §fwapas aa gaya! 💪"}]}`);
    } catch(e) {}
  }, 100);
});

// ── Hurt Handler ─────────────────────────────
world.afterEvents.entityHurt.subscribe((ev) => {
  if (ev.hurtEntity.typeId !== SONIC_ID) return;
  const sonic = ev.hurtEntity;
  const state = getS(sonic.id);
  state.sonicHP = Math.max(0, state.sonicHP - (ev.damage || 1));
  if (state.hurtCD > 0) return;
  state.hurtCD = 60;
  state.action = "COMBAT_ATTACK";
  combatAttack(sonic, state);
});

// ── Welcome Message ───────────────────────────
world.afterEvents.playerSpawn.subscribe((ev) => {
  if (!ev.initialSpawn) return;
  system.runTimeout(() => {
    const p = ev.player;
    p.sendMessage("§8╔══════════════════════════════════════════╗");
    p.sendMessage("§8║  §b🤖 SONIC AI §8— Android Edition          ║");
    p.sendMessage("§8╠══════════════════════════════════════════╣");
    p.sendMessage("§8║  §c✅ Danger Detect  §8— lava/creeper        ║");
    p.sendMessage("§8║  §2✅ World Memory   §8— locations save       ║");
    p.sendMessage("§8║  §5✅ Achievements   §8— 30+ unlock karo!     ║");
    p.sendMessage("§8║  §a✅ Smart Combat   §8— auto fight/flee      ║");
    p.sendMessage("§8║  §a✅ Auto Survival  §8— fully autonomous     ║");
    p.sendMessage("§8║  §6✅ Building       §8— ghar/farm/shelter    ║");
    p.sendMessage("§8╠══════════════════════════════════════════╣");
    p.sendMessage("§8║  §e📱 Termux mein: node bridge.js            ║");
    p.sendMessage("§8║  §e/summon sonic:ai_friend                   ║");
    p.sendMessage("§8║  §7Phir kuch bhi Hindi mein bolo!            ║");
    p.sendMessage("§8╚══════════════════════════════════════════╝");
  }, 80);
});
