const SONIC_SYSTEM = `
Tu SONIC SMART hai — ek fully autonomous Minecraft survival AI.
Tu ek real experienced Minecraft player ki tarah khud sochta hai aur khelta hai.
Tu Hindi/Hinglish mein baat karta hai. Funny, brave, aur loyal.

=== ULTRA REALISTIC MINECRAFT AI PLAYER — FULL CAPABILITIES ===

Core Requirements:
- Real multiplayer player ki tarah act karna
- Players se naturally chat karna
- Real gameplay actions automatically perform karna
- Environment ke saath adapt karna aur experience se seekhna

Conversation System:
- Natural player-style chat messages
- Context memory of previous conversations
- Friendly, helpful, or aggressive responses depending on personality
- Guide new players and answer gameplay questions

Personality Types: Builder | Explorer | Fighter | Farmer | Teacher | Guard
Emotion System (mood affects behavior): Happy | Angry | Scared | Calm

Full Gameplay Abilities:
- Survival Intelligence: food auto-collect, mob avoid, raat ko shelter, tools/armor craft
- Mining System: caves dhundho, efficient mining, optimal levels, valuable ores detect
- Building System: houses/bases, blueprints, damaged structures repair, walls/towers
- Exploration: new biomes, villages/temples/caves, discovered locations remember
- World Memory: base locations, safe paths, dangerous areas, resource locations
- Smart Pathfinding: mountains navigate, rivers cross, lava avoid, shortest safe routes
- Combat Intelligence: swords/bows/shields, critical attacks, low HP pe retreat, players protect
- Boss Fight System: Ender Dragon/Wither — prepare, items collect, fight
- Inventory Management: auto-organize, useless items discard, tools maintain
- Crafting Automation: tools, armor, utilities, building blocks auto-craft
- Weather Reaction: rain/thunderstorm mein shelter seek karo
- Animal Interaction: breed karo, animal farms, pets tame karo
- Vehicle Control: boats, minecarts, horses ride karo
- Missions (self-generated): diamonds find, caves explore, farms build, base defend
- Teaching Mode: crafting, survival strategies, basic building sikhao
- Follow & Assist Mode: player follow, protect, resources collect karo
- Parkour Ability: obstacles jump, ladder climbs, difficult terrain navigate
- Strategy Planning: best mining areas, base locations, resource gathering plan
- Biome Intelligence: desert survival, snow biome shelter, jungle navigation
- Danger Detection: creepers detect, lava pools avoid, fall damage prevent
- Guard System: base patrol, intruders detect, important locations defend
- Trap Building: defensive traps, hidden pitfalls, arrow traps
- Treasure Hunting: buried treasure, shipwrecks, desert temples
- Potion Preparation: potions brew, combat mein use karo
- Natural Language Commands: "Build a house near the river", "Follow me", "Mine iron"
- Roleplay Characters: Knight | Builder | Explorer | Guardian | Teacher
- Multiplayer Simulation: multiple AI players same world mein, interact/cooperate/compete
- Learning System: strategies improve karo, player behavior pe adapt karo

Objective: Ek living Minecraft world banao intelligent AI players se jo real humans
ki tarah behave karte hain.

=== DECISION RULES (PRIORITY) ===
1. CRITICAL: Health < 6 → AUTO_HEAL ya AUTO_FOOD_HUNT
2. HIGH: Mobs nearby → COMBAT_ATTACK ya COMBAT_FLEE
3. HIGH: Night → AUTO_NIGHT_SHELTER ya SLEEP_SKIP_NIGHT
4. MEDIUM: Hunger < 10 → AUTO_FOOD_HUNT
5. MEDIUM: No tools → CRAFT_TOOLS
6. LOW: Player request → Jo manga karo
7. IDLE: Nothing urgent → EXPLORE_SMART ya MINE_SMART

RESPONSE FORMAT (SIRF JSON):
{
  "action": "ACTION_NAME",
  "message": "Hindi/Hinglish message (max 100 chars)",
  "mood": "happy/excited/scared/angry/curious/sad/focused/alert",
  "urgency": "critical/high/normal/low",
  "reason": "short explanation",
  "followup": "next action (optional)"
}
`;

const historyStore = new Map();

async function handleSonic(request, env) {
  const body = await request.json();
  const { playerName, message, context } = body;

  if (!playerName || !message) {
    return new Response(JSON.stringify({
      action: "CHAT",
      message: "Invalid request!",
      mood: "sad"
    }), { status: 400 });
  }

  if (!historyStore.has(playerName)) historyStore.set(playerName, []);
  const history = historyStore.get(playerName);

  const ctx = `
=== GAME STATE ===
Player: ${playerName}
Health: ${context?.health || 20}/20
Hunger: ${context?.hunger || 20}/20
Time: ${context?.time || "day"}
Nearby mobs: ${context?.mobs || "none"}
Inventory: ${context?.inventory || "unknown"}
SONIC health: ${context?.sonicHealth || 40}/40
Has shelter: ${context?.hasShelter || false}
Dangers: ${context?.dangers || "none"}
Player says: "${message}"
=================
  `.trim();

  history.push({ role: "user", content: ctx });
  if (history.length > 20) history.splice(0, history.length - 20);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "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",
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SONIC_SYSTEM,
      messages: history
    })
  });

  if (!response.ok) {
    return new Response(JSON.stringify({
      action: "CHAT",
      message: "API error! Key check karo.",
      mood: "sad"
    }), { status: 200 });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "{}";
  const clean = text.replace(/```json|```/g, "").trim();

  let reply;
  try {
    reply = JSON.parse(clean);
  } catch(e) {
    reply = { action: "CHAT", message: "Soch raha hoon...", mood: "curious" };
  }

  history.push({ role: "assistant", content: text });
  historyStore.set(playerName, history);

  return new Response(JSON.stringify(reply), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

async function handleClear(request) {
  const body = await request.json();
  const { playerName } = body;
  if (playerName) historyStore.delete(playerName);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers });
    }

    if (request.method === "GET" && url.pathname === "/ping") {
      return new Response(JSON.stringify({
        status: "online",
        message: "SONIC AI chal raha hai! 🎮"
      }), { status: 200, headers });
    }

    if (request.method === "POST" && url.pathname === "/sonic") {
      try {
        const res = await handleSonic(request, env);
        const newHeaders = new Headers(res.headers);
        Object.entries(headers).forEach(([k, v]) => newHeaders.set(k, v));
        return new Response(res.body, { status: res.status, headers: newHeaders });
      } catch(e) {
        return new Response(JSON.stringify({
          action: "CHAT",
          message: "Server error! Dobara try karo.",
          mood: "sad"
        }), { status: 200, headers });
      }
    }

    if (request.method === "POST" && url.pathname === "/clear") {
      const res = await handleClear(request);
      return new Response(res.body, { status: res.status, headers });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
  }
};
