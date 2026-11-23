// Sonde : vidéos de Moussa Aldjayi (Garoua).
import fs from "node:fs";
const out = [], vus = new Map();
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36", "accept-language": "fr-FR,fr;q=0.9" };
const pause = ms => new Promise(r => setTimeout(r, ms));
function marcher(o, f) { if (Array.isArray(o)) o.forEach(x => marcher(x, f)); else if (o && typeof o === "object") { f(o); for (const k in o) marcher(o[k], f); } }
const txt = x => x ? (x.simpleText || (x.runs || []).map(r => r.text).join("") || x.content || "") : "";
const types = {};
function recolter(d, src) { let cont = null;
  marcher(d, o => {
    for (const k in o) if (o[k] && typeof o[k] === "object" && (o[k].videoId || o[k].contentId)) types[k] = (types[k] || 0) + 1;
    const v = o.videoRenderer || o.playlistVideoRenderer || o.compactVideoRenderer;
    if (v && v.videoId && !vus.has(v.videoId)) { const ch = (v.ownerText || v.shortBylineText)?.runs?.[0];
      vus.set(v.videoId, { titre: txt(v.title), chaine: ch?.text || "", duree: txt(v.lengthText) || v.lengthSeconds || "", src }); }
    if (o.continuationCommand?.token) cont = o.continuationCommand.token; });
  return cont; }
async function page(url, src, max = 6) {
  const t = await (await fetch(url, { headers: UA })).text();
  const m = t.match(/var ytInitialData = (\{.*?\});<\/script>/s); if (!m) return "pas de données";
  const cle = (t.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || [])[1], ver = (t.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || [])[1];
  let cont = recolter(JSON.parse(m[1]), src), n = 1, ep = url.includes("/results") ? "search" : "browse";
  while (cont && n < max) { await pause(1200); n++;
    const r = await fetch("https://www.youtube.com/youtubei/v1/" + ep + "?key=" + cle, { method: "POST", headers: { ...UA, "content-type": "application/json" }, body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: ver, hl: "fr" } }, continuation: cont }) });
    cont = recolter(await r.json(), src); }
  return n; }
for (const q of ["Moussa Aldjayi", "Moussa Aldjayi Garoua", "Moussa Al Djayi", "Moussa Aldjaii", "Moussa Aldjai Garoua", "Cheick Moussa Al Djayi", "Malam Moussa Garoua", "Mala Moussa Garoua tafsir", "Moussa Aldjayi tafsir", "Moussa Aldjayi wazou", "Moussa Aljayi fulfulde", "Moussa Al-Jayi"]) {
  try { out.push("Q " + q + " " + await page("https://www.youtube.com/results?search_query=" + encodeURIComponent(q) + "&sp=EgIQAQ%253D%253D", "q:" + q, 5) + " total=" + vus.size); } catch (e) { out.push("Q " + q + " erreur " + e.message); }
  await pause(2500);
}
out.push("types: " + JSON.stringify(types));
out.push("\n=== LISTE ===");
for (const [id, v] of vus) out.push(`${id}\t${v.duree}\t${v.src}\t${v.chaine}\t${v.titre}`);
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
