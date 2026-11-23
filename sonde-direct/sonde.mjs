// Sonde : liste complète des vidéos du Cheikh Ali Dewa (recherche paginée + playlists LE MONDE MUSULMAN).
import fs from "node:fs";
const out = [], vus = new Map();
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36", "accept-language": "fr-FR,fr;q=0.9" };
const pause = ms => new Promise(r => setTimeout(r, ms));
function marcher(o, f) { if (Array.isArray(o)) o.forEach(x => marcher(x, f)); else if (o && typeof o === "object") { f(o); for (const k in o) marcher(o[k], f); } }
const txt = x => x ? (x.simpleText || (x.runs || []).map(r => r.text).join("") || "") : "";
function recolter(d, src) { let cont = null;
  marcher(d, o => { const v = o.videoRenderer || o.playlistVideoRenderer;
    if (v && v.videoId && !vus.has(v.videoId)) { const ch = (v.ownerText || v.shortBylineText)?.runs?.[0];
      vus.set(v.videoId, { titre: txt(v.title), chaine: ch?.text || "", duree: txt(v.lengthText), vues: txt(v.viewCountText), src }); }
    if (o.continuationCommand?.token) cont = o.continuationCommand.token; });
  return cont; }
async function page(url, src, max = 12) {
  const t = await (await fetch(url, { headers: UA })).text();
  const m = t.match(/var ytInitialData = (\{.*?\});<\/script>/s); if (!m) return 0;
  const cle = (t.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || [])[1], ver = (t.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || [])[1] || "2.20241101.00.00";
  let cont = recolter(JSON.parse(m[1]), src), n = 1, endpoint = url.includes("/results") ? "search" : "browse";
  while (cont && n < max) { await pause(1200); n++;
    const r = await fetch("https://www.youtube.com/youtubei/v1/" + endpoint + "?key=" + cle, { method: "POST", headers: { ...UA, "content-type": "application/json" }, body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: ver, hl: "fr" } }, continuation: cont }) });
    cont = recolter(await r.json(), src); }
  return n; }
for (const q of ["Mohamed Ali Dewa", "KITABO BOUHARI PAR CEHKE MAH ALI DEWA", "KITABOU BOUHARI PAR CEHKE MAH ALI DEWA", "Mouhamed Ali Dewa", "Modibbo Ali Dewa", "Ali Dewa rahimahoullah"]) {
  try { const n = await page("https://www.youtube.com/results?search_query=" + encodeURIComponent(q) + "&sp=EgIQAQ%253D%253D", "q:" + q); out.push("Q " + q + " pages=" + n + " total=" + vus.size); } catch (e) { out.push("Q " + q + " erreur " + e.message); }
  await pause(2500);
}
for (const [pl, nom] of [["PLW2j4WmWyU1Ui50B3U_nk7mIVowrOPpjj", "TAFSIR"], ["PLW2j4WmWyU1VDGRFsHb2UIRZH7AJ37VV4", "PREDICATIONS"], ["PLW2j4WmWyU1VLLQr2WcGZSERy_POmF3UH", "CONFERENCES"], ["PLW2j4WmWyU1UeIf1H1EYkVYnOXxzOwp-G", "SERMONS"], ["PLW2j4WmWyU1WJj1PCvWiIUiqmppXLXuyF", "INTERVIEWS"], ["PLW2j4WmWyU1UwWamfrE2Ejr88xkM3P4Qj", "HISTOIRE"]]) {
  try { await page("https://www.youtube.com/playlist?list=" + pl, "pl:" + nom, 3); out.push("PL " + nom + " total=" + vus.size); } catch (e) { out.push("PL " + nom + " erreur " + e.message); }
  await pause(2000);
}
const ok = ([, v]) => /d[eé]wa/i.test(v.titre) && !/dewa ?19|dubai|malam|santap|para dewa|mata dewa/i.test(v.titre + " " + v.chaine);
out.push("\n=== DEWA DANS LE TITRE ===");
for (const e of [...vus].filter(ok)) out.push(`${e[0]}\t${e[1].duree}\t${e[1].vues}\t${e[1].chaine}\t${e[1].titre}`);
out.push("\n=== PLAYLISTS LE MONDE MUSULMAN (sans Dewa dans le titre) ===");
for (const e of [...vus].filter(x => !ok(x) && x[1].src.startsWith("pl:"))) out.push(`${e[0]}\t${e[1].duree}\t${e[1].src}\t${e[1].titre}`);
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
