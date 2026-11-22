// Cherche les directs en cours sur la chaîne officielle de Médine (onglet « En direct »).
import { chromium } from "playwright";
import fs from "node:fs";
const b = await chromium.launch(); const out = [];
for (const u of ["https://www.youtube.com/channel/UCROKYPep-UuODNwyipe6JMw/streams", "https://www.youtube.com/@SaudiSunnahTv/streams", "https://www.youtube.com/results?search_query=%D9%82%D9%86%D8%A7%D8%A9+%D8%A7%D9%84%D8%B3%D9%86%D8%A9+%D8%A7%D9%84%D9%86%D8%A8%D9%88%D9%8A%D8%A9+%D8%A8%D8%AB+%D9%85%D8%A8%D8%A7%D8%B4%D8%B1&sp=EgJAAQ%253D%253D"]) {
  const p = await b.newPage();
  try {
    await p.goto(u, { waitUntil: "domcontentloaded", timeout: 45000 });
    try { await p.click('button:has-text("Accept all")', { timeout: 4000 }); } catch (e) {}
    await p.waitForTimeout(5000);
    const html = await p.content();
    const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
    const data = m ? JSON.parse(m[1]) : null; const vids = [];
    const walk = o => { if (!o || typeof o !== "object") return; const v = o.videoRenderer || o.gridVideoRenderer; if (v) { const live = JSON.stringify(v).includes('"style":"LIVE"') || JSON.stringify(v).includes("BADGE_STYLE_TYPE_LIVE_NOW"); vids.push(`${v.videoId} | live=${live} | ${(v.title && (v.title.runs ? v.title.runs.map(x => x.text).join("") : v.title.simpleText)) || ""} | chaîne=${JSON.stringify(v.ownerText || v.longBylineText || "").match(/"text":"([^"]+)"/)?.[1] || ""} | ${JSON.stringify(v.ownerText || v.longBylineText || "").match(/"browseId":"(UC[^"]+)"/)?.[1] || ""}`); } for (const k in o) walk(o[k]); };
    walk(data);
    out.push("=== " + u + "\n" + vids.slice(0, 15).join("\n"));
  } catch (e) { out.push(u + " : " + e.message); }
  await p.close();
}
await b.close();
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n\n")); console.log(out.join("\n\n"));
