// Vérifie que les directs s'affichent dans un cadre verrouillé (comme dans l'application).
import { chromium } from "playwright";
import http from "node:http";
const page = ch => `<!doctype html><meta name=viewport content="width=device-width"><body style="margin:0;background:#000"><iframe src="https://www.youtube.com/embed/live_stream?channel=${ch}&autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1" sandbox="allow-scripts allow-same-origin allow-presentation" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; fullscreen" style="width:100vw;height:56vw;border:0"></iframe>`;
const srv = http.createServer((q, r) => { r.writeHead(200, { "content-type": "text/html" }); r.end(page(q.url.slice(1))); }).listen(8099);
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
for (const [k, ch] of [["mecque", "UCos52azQNBgW63_9uDJoPDA"], ["medine", "UCROKYPep-UuODNwyipe6JMw"]]) {
  const p = await b.newPage({ viewport: { width: 412, height: 400 } });
  await p.goto("http://localhost:8099/" + ch); await p.waitForTimeout(15000);
  await p.screenshot({ path: `sonde-direct/${k}.png` });
  const f = p.frames()[1]; let info = "";
  try { info = await f.evaluate(() => (document.querySelector(".ytp-error, .ytp-error-content") || {}).innerText || ("titre: " + ((document.querySelector(".ytp-title-link") || {}).innerText || "?") + " · vidéo: " + !!document.querySelector("video") + " · temps: " + ((document.querySelector("video") || {}).currentTime || 0))); } catch (e) { info = e.message; }
  console.log(k, info);
}
await b.close(); srv.close();
