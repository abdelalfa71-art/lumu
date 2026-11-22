// Compare plusieurs façons d'intégrer les directs pour trouver celle qui s'affiche.
import { chromium } from "playwright";
import http from "node:http";
const CH = { mecque: "UCos52azQNBgW63_9uDJoPDA", medine: "UCROKYPep-UuODNwyipe6JMw" };
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
// 1) trouver l'identifiant du direct en cours via la page de la chaîne
const ids = {};
for (const [k, ch] of Object.entries(CH)) {
  const p = await b.newPage();
  try { await p.goto(`https://www.youtube.com/channel/${ch}/live`, { waitUntil: "domcontentloaded", timeout: 45000 });
    try { await p.click('button[aria-label*="Accept"], button:has-text("Accept all"), button:has-text("Tout accepter")', { timeout: 5000 }); } catch (e) {}
    await p.waitForTimeout(5000);
    const u = p.url(), html = await p.content();
    ids[k] = (/[?&]v=([\w-]{11})/.exec(u) || /"videoId":"([\w-]{11})"/.exec(html) || [])[1] || "";
    console.log(k, "url", u, "id", ids[k], "live", /"isLiveNow":true|"isLive":true/.test(html));
  } catch (e) { console.log(k, e.message); }
  await p.close();
}
const variantes = {
  "chaine-sandbox": ch => `https://www.youtube.com/embed/live_stream?channel=${ch}&autoplay=1&mute=1|sandbox`,
  "chaine-libre": ch => `https://www.youtube.com/embed/live_stream?channel=${ch}&autoplay=1&mute=1|`,
  "id-sandbox": (ch, k) => ids[k] ? `https://www.youtube.com/embed/${ids[k]}?autoplay=1&mute=1|sandbox` : "",
  "id-sandbox-popups": (ch, k) => ids[k] ? `https://www.youtube.com/embed/${ids[k]}?autoplay=1&mute=1|sandboxpop` : "",
  "id-libre": (ch, k) => ids[k] ? `https://www.youtube.com/embed/${ids[k]}?autoplay=1&mute=1|` : "",
};
let courant = "";
const srv = http.createServer((q, r) => { const [src, sb] = courant.split("|"); const sx = sb === "sandbox" ? 'sandbox="allow-scripts allow-same-origin allow-presentation"' : sb === "sandboxpop" ? 'sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"' : "";
  r.writeHead(200, { "content-type": "text/html" }); r.end(`<!doctype html><body style="margin:0;background:#000"><iframe src="${src}" ${sx} referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; fullscreen" style="width:412px;height:232px;border:0"></iframe>`); }).listen(8099);
for (const [k, ch] of Object.entries(CH)) for (const [nom, f] of Object.entries(variantes)) {
  courant = f(ch, k); if (!courant) continue;
  const p = await b.newPage({ viewport: { width: 412, height: 240 } });
  await p.goto("http://localhost:8099/x"); await p.waitForTimeout(12000);
  const fr = p.frames()[1]; let info = "";
  try { info = await fr.evaluate(() => { const e = document.querySelector(".ytp-error"); const v = document.querySelector("video"); return e && e.offsetParent ? "ERREUR " + e.innerText.replace(/\s+/g, " ").slice(0, 80) : "ok vidéo t=" + (v ? v.currentTime.toFixed(1) : "-"); }); } catch (e) { info = "?" + e.message.slice(0, 60); }
  console.log(k, nom, info);
  await p.screenshot({ path: `sonde-direct/${k}-${nom}.png` }); await p.close();
}
await b.close(); srv.close();
