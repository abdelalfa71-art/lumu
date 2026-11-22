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
    live = /"isLiveNow":true|"isLive":true|"isLiveContent":true/.test(html) && !/LIVE_STREAM_OFFLINE|"isUpcoming":true/.test(html);
    id = (/[?&]v=([\w-]{11})/.exec(u) || [])[1] || "";
  } catch (e) { console.log(k, e.message); }
  await p.close();
  neuf[k] = live && id ? { id, direct: true, vu: neuf.maj } : { ...(ancien[k] || {}), direct: false };
  console.log(k, JSON.stringify(neuf[k]));
}
await b.close();
// Radios du Coran (mp3quran.net, flux libres pour les applications) : liste rafraîchie avec les directs
try {
  const lr = async lang => (await (await fetch(`https://mp3quran.net/api/v3/radios?language=${lang}`)).json()).radios || [];
  const ar = await lr("ar"), fr = await lr("fr").catch(() => []), noms = new Map(fr.map(x => [x.id, x.name]));
  const radios = ar.filter(x => /^https:\/\//.test(x.url)).map(x => ({ id: x.id, ar: x.name, fr: noms.get(x.id) || "", url: x.url }));
  if (radios.length > 10) fs.writeFileSync("maj/radios.json", JSON.stringify({ maj: neuf.maj, source: "mp3quran.net", radios }) + "\n");
  console.log("radios", radios.length);
} catch (e) { console.log("radios", e.message); }
fs.writeFileSync(F, JSON.stringify(neuf, null, 1) + "\n");
