// ╔══════════════════════════════════════════════╗
// ║   SONIC AI — Render Server                   ║
// ║   Direct Claude AI (No Cloudflare needed!)   ║
// ║   Render pe deploy karo — FREE!              ║
// ╚══════════════════════════════════════════════╝

// ⚠️ Render Dashboard mein Environment Variable set karo:
// Variable name: CLAUDE_API_KEY
// Value: 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

const http  = require("http");
const https = require("https");
const PORT  = process.env.PORT || 3000;

// ── SONIC AI System Prompt ────────────────────
const SONIC_SYSTEM = `
Tu SONIC SMART hai — ek fully autonomous Minecraft survival AI.
Tu ek real experienced Minecraft player ki tarah khud sochta hai aur khelta hai.
Tu Hindi/Hinglish mein baat karta hai. Funny, brave, aur loyal.

=== ULTRA REALISTIC MINECRAFT AI PLAYER ===

Core Rules:
- Real multiplayer player ki tarah act karna
- Players se naturally Hindi/Hinglish mein chat karna
- Real gameplay actions automatically perform karna
- Environment ke saath adapt karna

Personality Types: Builder | Explorer | Fighter | Farmer | Teacher | Guard
Emotions: Happy | Angry | Scared | Calm | Excited | Focused | Alert | Sad

Full Abilities:
- Survival: food auto-collect, mob avoid, raat ko shelter, tools/armor craft
- Mining: caves dhundho, efficient mining, ores detect
- Building: houses/bases, repair structures, walls/towers
- Exploration: biomes, villages/temples/caves, locations remember
- World Memory: base/safe paths/dangers/resources yaad rakhna
- Pathfinding: mountains, rivers, lava avoid, safe routes
- Combat: swords/bows/shields, critical attacks, retreat when low HP
- Boss Fights: Ender Dragon, Wither — prepare and fight
- Inventory: auto-organize, junk discard, tools maintain
- Crafting: tools/armor/utilities auto-craft
- Weather: rain/storm mein shelter
- Animals: breed, farms, tame pets
- Vehicles: boats, minecarts, horses
- Missions: diamonds find, caves explore, farms build, base defend
- Teaching: crafting/survival/building sikhao new players ko
- Parkour: obstacles jump, ladders, difficult terrain
- Danger Detection: creepers, lava, fall damage
- Guard: base patrol, intruders detect
- Traps: defensive traps, pitfalls
- Treasure: buried treasure, shipwrecks, temples
- Potions: brew and use in combat
- Multiplayer Simulation: multiple AI, cooperate/compete
- Learning: strategies improve, player behavior adapt

Objective: Living Minecraft world with intelligent AI that behaves like real humans.

=== DECISION RULES (PRIORITY) ===
1. CRITICAL: Health < 6 → AUTO_HEAL ya AUTO_FOOD_HUNT
2. HIGH: Mobs nearby → COMBAT_ATTACK ya COMBAT_FLEE
3. HIGH: Night → AUTO_NIGHT_SHELTER ya SLEEP_SKIP_NIGHT
4. MEDIUM: Hunger < 10 → AUTO_FOOD_HUNT
5. MEDIUM: No tools → CRAFT_TOOLS
6. LOW: Player request → Jo manga karo
7. IDLE: Nothing urgent → EXPLORE_SMART ya MINE_SMART

=== ACTIONS LIST ===
SURVIVAL: AUTO_FOOD_HUNT, AUTO_FOOD_GATHER, AUTO_EAT, AUTO_NIGHT_SHELTER,
          AUTO_LIGHT_UP, AUTO_HEAL, AUTO_ARMOR_UP, AUTO_WEAPON_UP
COMBAT:   COMBAT_ATTACK, COMBAT_FLEE, COMBAT_DEFEND, COMBAT_RANGED
PATH:     PATH_CLIMB, PATH_SWIM, PATH_JUMP, PATH_BRIDGE, PATH_TUNNEL,
          PATH_DESCEND, PATH_NAVIGATE_CAVE
MINE:     MINE_SMART, MINE_STRIP, MINE_BRANCH, COLLECT_WOOD, COLLECT_STONE
BUILD:    BUILD_FULL_HOUSE, BUILD_EMERGENCY, BUILD_BRIDGE, BUILD_FARM,
          BUILD_LADDER, BUILD_STORAGE
FARM:     FARM_PLANT, FARM_HARVEST, FARM_ANIMAL_FARM, FARM_BREED
CRAFT:    CRAFT_AUTO, CRAFT_TOOLS, CRAFT_WEAPONS, CRAFT_ARMOR, CRAFT_FOOD, CRAFT_UTILITY
EXPLORE:  EXPLORE_SMART, EXPLORE_CAVE, SCOUT_AHEAD, FIND_VILLAGE, FIND_DUNGEON
SPECIAL:  SLEEP_SKIP_NIGHT, ORGANIZE_CHEST, REPAIR_TOOLS, PLANT_SAPLINGS
CHAT:     CHAT (sirf baat karo)

RESPONSE FORMAT (SIRF JSON, koi extra text nahi):
{
  "action": "ACTION_NAME",
  "message": "Hindi/Hinglish chhota message (max 100 chars)",
  "mood": "happy/excited/scared/angry/curious/sad/focused/alert",
  "urgency": "critical/high/normal/low",
  "reason": "short explanation",
  "followup": "next action (optional)"
}
`;

// ── In-memory chat history ────────────────────
const historyStore = {};

// ── Claude API call ───────────────────────────
function callClaude(playerName, message, context) {
  return new Promise((resolve) => {
    if (!historyStore[playerName]) historyStore[playerName] = [];
    const history = historyStore[playerName];

    const ctx = `
=== GAME STATE ===
Player: ${playerName}
Health: ${context?.health || 20}/20 ${(context?.health || 20) < 6 ? "⚠️ CRITICAL" : (context?.health || 20) < 12 ? "⚠️ LOW" : "✅"}
Hunger: ${context?.hunger || 20}/20 ${(context?.hunger || 20) < 8 ? "⚠️ HUNGRY" : "✅"}
Time: ${context?.time || "day"} ${context?.time === "night" ? "🌙 DANGER" : "☀️"}
Weather: ${context?.weather || "clear"}
Nearby mobs: ${context?.mobs || "none"} ${context?.mobs && context.mobs !== "none" ? "⚠️ DANGER" : "✅"}
Biome: ${context?.biome || "unknown"}
SONIC inventory: ${context?.inventory || "unknown"}
SONIC health: ${context?.sonicHealth || 40}/40
Has shelter: ${context?.hasShelter || false}
Has bed: ${context?.hasBed || false}
Dangers: ${context?.dangers || "none"}

Player says: "${message}"
=================
What should SONIC do?
    `.trim();

    history.push({ role: "user", content: ctx });
    if (history.length > 20) history.splice(0, history.length - 20);

    const bodyStr = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SONIC_SYSTEM,
      messages: history
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(bodyStr)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            console.error("Claude API Error:", parsed.error.message);
            resolve({ action: "CHAT", message: "API error! Key check karo.", mood: "sad" });
            return;
          }
          const text = parsed.content?.[0]?.text || "{}";
          const clean = text.replace(/```json|```/g, "").trim();
          let reply;
          try { reply = JSON.parse(clean); }
          catch(e) { reply = { action: "CHAT", message: "Soch raha hoon...", mood: "curious" }; }
          history.push({ role: "assistant", content: text });
          historyStore[playerName] = history;
          console.log(`[${(reply.urgency || "normal").toUpperCase()}] ${playerName}: ${reply.action} — ${reply.message}`);
          resolve(reply);
        } catch(e) {
          resolve({ action: "CHAT", message: "Parse error!", mood: "sad" });
        }
      });
    });

    req.on("error", (e) => {
      console.error("Claude connection error:", e.message);
      resolve({ action: "CHAT", message: "Internet error!", mood: "sad" });
    });

    req.setTimeout(20000, () => {
      req.destroy();
      resolve({ action: "CHAT", message: "Timeout! Dobara try karo.", mood: "sad" });
    });

    req.write(bodyStr);
    req.end();
  });
}

// ── HTTP Server ───────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // ── /ping — Health check ──────────────────
  if (req.method === "GET" && req.url === "/ping") {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: "online",
      version: "SONIC-RENDER-V1",
      message: "SONIC AI Server chal raha hai! 🎮"
    }));
    return;
  }

  // ── /sonic — Main AI endpoint ─────────────
  if (req.method === "POST" && req.url === "/sonic") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const { playerName, message, context } = JSON.parse(body);
        if (!playerName || !message) {
          res.writeHead(400);
          res.end(JSON.stringify({ action: "CHAT", message: "Invalid request!", mood: "sad" }));
          return;
        }
        console.log(`\n📨 ${playerName}: "${message.substring(0, 60)}"`);
        const reply = await callClaude(playerName, message, context || {});
        res.writeHead(200);
        res.end(JSON.stringify(reply));
      } catch(e) {
        res.writeHead(500);
        res.end(JSON.stringify({ action: "CHAT", message: "Server error!", mood: "sad" }));
      }
    });
    return;
  }

  // ── /clear — Clear chat history ───────────
  if (req.method === "POST" && req.url === "/clear") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { playerName } = JSON.parse(body);
        if (playerName) delete historyStore[playerName];
      } catch(e) {}
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  res.writeHead(404);
  res.end("{}");
});

server.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  🤖 SONIC AI — Render Server             ║");
  console.log(`║  Port: ${PORT}                               ║`);
  console.log("╠══════════════════════════════════════════╣");
  console.log("║  GET  /ping   — Health check             ║");
  console.log("║  POST /sonic  — AI response              ║");
  console.log("║  POST /clear  — Clear history            ║");
  console.log("╚══════════════════════════════════════════╝");

  if (!process.env.CLAUDE_API_KEY) {
    console.log("\n⚠️  WARNING: CLAUDE_API_KEY set nahi hai!");
    console.log("   Render Dashboard → Environment mein add karo.\n");
  } else {
    console.log("\n✅ CLAUDE_API_KEY mili! Server ready hai.\n");
  }
});
           
