// Met à jour maj/directs.json : identifiant de la vidéo en direct de chaque chaîne officielle (La Mecque / Médine).
// Lu par l'application ; garde l'ancien identifiant si la chaîne n'est pas en direct au moment de la vérification.
import { chromium } from "playwright";
import fs from "node:fs";
const CH = { mecque: "UCos52azQNBgW63_9uDJoPDA", medine: "UCROKYPep-UuODNwyipe6JMw" };
const F = "maj/directs.json";
const ancien = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, "utf8")) : {};
const neuf = { maj: new Date().toISOString() };
const b = await chromium.launch();
for (const [k, ch] of Object.entries(CH)) {
  const p = await b.newPage();
  let id = "", live = false;
  try {
    await p.goto(`https://www.youtube.com/channel/${ch}/live`, { waitUntil: "domcontentloaded", timeout: 45000 });
    try { await p.click('button:has-text("Accept all"), button:has-text("Tout accepter")', { timeout: 4000 }); } catch (e) {}
    await p.waitForTimeout(4000);
    const u = p.url(), html = await p.content();
    live = /"isLiveNow":true/.test(html);
    id = (/[?&]v=([\w-]{11})/.exec(u) || [])[1] || "";
  } catch (e) { console.log(k, e.message); }
  await p.close();
  neuf[k] = live && id ? { id, direct: true, vu: neuf.maj } : { ...(ancien[k] || {}), direct: false };
  console.log(k, JSON.stringify(neuf[k]));
}
await b.close();
fs.writeFileSync(F, JSON.stringify(neuf, null, 1) + "\n");
