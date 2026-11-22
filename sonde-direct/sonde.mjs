// Repère les flux officiels (m3u8) des directs de La Mecque et Médine sur la plateforme publique saoudienne Aloula.
import { chromium } from "playwright";
import fs from "node:fs";
const pages = { quran: "https://aloula.sba.sa/live/quran", sunnah: "https://aloula.sba.sa/live/sunnah" };
const out = [];
const b = await chromium.launch();
for (const [k, u] of Object.entries(pages)) {
  const ctx = await b.newContext({ userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36" });
  const p = await ctx.newPage(); const vus = new Set();
  p.on("request", r => { const x = r.url(); if (/m3u8|\/api\/|faulio|\.mpd|manifest|live/i.test(x) && !/\.(js|css|png|jpg|svg|woff2?)(\?|$)/.test(x)) vus.add(r.method() + " " + x); });
  p.on("response", async r => { const x = r.url(); if (/\/api\/.*(channel|live|stream)/i.test(x)) { try { out.push(`--- réponse ${x}\n${(await r.text()).slice(0, 3000)}`); } catch (e) {} } });
  try { await p.goto(u, { waitUntil: "networkidle", timeout: 60000 }); } catch (e) { out.push(`${k} : ${e.message}`); }
  await p.waitForTimeout(15000);
  try { await p.click("video, .vjs-big-play-button, button[aria-label*=lay]", { timeout: 3000 }); await p.waitForTimeout(8000); } catch (e) {}
  out.unshift(`=== ${k} (${u})\n${[...vus].join("\n")}`);
  await ctx.close();
}
await b.close();
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n\n"));
console.log(out.join("\n\n").slice(0, 6000));
