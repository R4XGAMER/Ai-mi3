const https = require("https");
const http = require("http");

const CLAUDE_API_KEY = "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";
const PORT = 3000;

const SONIC_SYSTEM = `
Tu SONIC SMART hai — ek fully autonomous Minecraft survival AI.
Tu ek real experienced Minecraft player ki tarah khud sochta hai aur khelta hai.
Tu Hindi/Hinglish mein baat karta hai. Funny, brave, loyal.

DECISION RULES (PRIORITY):
1. CRITICAL: Health < 6 → AUTO_HEAL ya AUTO_FOOD_HUNT
2. HIGH: Mobs nearby → COMBAT_ATTACK ya COMBAT_FLEE
3. HIGH: Night → AUTO_NIGHT_SHELTER
4. MEDIUM: Hunger < 10 → AUTO_FOOD_HUNT
5. LOW: Player request → Jo manga karo
6. IDLE: EXPLORE_SMART ya MINE_SMART

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

const history = {};

async function think(playerName, message, context) {
  return new Promise((resolve) => {
    if (!history[playerName]) history[playerName] = [];

    const ctx = `
=== GAME STATE ===
Player: ${playerName}
Health: ${context.health || 20}/20
Hunger: ${context.hunger || 20}/20
Time: ${context.time || "day"}
Mobs: ${context.mobs || "none"}
Inventory: ${context.inventory || "unknown"}
Dangers: ${context.dangers || "none"}
Player says: "${message}"
=================
    `.trim();

    history[playerName].push({ role: "user", content: ctx });
    if (history[playerName].length > 20) history[playerName] = history[playerName].slice(-20);

    const body = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SONIC_SYSTEM,
      messages: history[playerName]
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({ action: "CHAT", message: "API error! Key check karo.", mood: "sad" });
            return;
          }
          const text = parsed.content?.[0]?.text || "{}";
          const clean = text.replace(/```json|```/g, "").trim();
          const reply = JSON.parse(clean);
          history[playerName].push({ role: "assistant", content: text });
          resolve(reply);
        } catch(e) {
          resolve({ action: "CHAT", message: "Soch raha hoon...", mood: "curious" });
        }
      });
    });

    req.on("error", () => resolve({ action: "CHAT", message: "Connection error!", mood: "sad" }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ action: "CHAT", message: "Timeout!", mood: "sad" }); });
    req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  if (req.method === "GET" && req.url === "/ping") {
    res.writeHead(200);
    res.end(JSON.stringify({ status: "online", message: "SONIC AI chal raha hai! 🎮" }));
    return;
  }

  if (req.method === "POST" && req.url === "/sonic") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const { playerName, message, context } = JSON.parse(body);
        const reply = await think(playerName, message, context || {});
        res.writeHead(200);
        res.end(JSON.stringify(reply));
      } catch(e) {
        res.writeHead(500);
        res.end(JSON.stringify({ action: "CHAT", message: "Server error!", mood: "sad" }));
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/clear") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try { const { playerName } = JSON.parse(body); if (playerName) delete history[playerName]; } catch(e) {}
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  res.writeHead(404);
  res.end("{}");
});

server.listen(PORT, () => {
  console.log("SONIC AI Server chal raha hai! Port: " + PORT);
});
