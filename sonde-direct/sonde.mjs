// Sonde : vidéos de Mahmoud Goni et Dr Moussa Souleymane (recherche + playlists).
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
const PL = [["PLgn7eQvOT2xqcHf2RPh-o7gWu00eaerym", "G:Ahdari"], ["PLgn7eQvOT2xqbGNklMgguNMn-BW8MaeoH", "G:Salasa"], ["PLgn7eQvOT2xoWbWkAlMfMNCPHEHpyso_Z", "G:Robé"], ["PLgn7eQvOT2xpllpBCvoOmfwFnf02dqqDZ", "G:Oumda"],
  ["PLgn7eQvOT2xr5izCGN0AmehVPfQXfkAEL", "M:Khutba SH"], ["PLgn7eQvOT2xq5CWAEWC0MR50Nz7rTLBax", "M:Tafsir SH"], ["PLZ1o6u6-WCcY", "M:Manasik"], ["PLSebmXFlN5So", "M:Odhiya"], ["PLI7V77UBoloJ80hvbW-Wv6OPC88-YETgq", "M:Manasik2"],
  ["PLI7V77UBoloL5x88F94NNbcuVAIieyBHB", "M:Douala4"], ["PLI7V77UBoloKgfPVO-Ty1pF_-nggEV_hm", "M:Douala3"], ["PLI7V77UBoloK1E2vLT8tYn4arfcavtBxr", "M:Douala2"], ["PLI7V77UBoloJjMPtmhDG3Z_BR7nI2bVQ2", "M:Douala1"], ["PLI7V77UBoloLUXhLpWaXn53ts4tXdybGW", "M:Tafsir2"], ["PLGScATMgoIHg", "M:Kisre"], ["PLZXI7NRVwaC8", "M:Djoulbe"], ["PLd_QruZLfUCY", "M:Minhaj"]];
for (const [pl, nom] of PL) { try { out.push("PL " + nom + " " + await page("https://www.youtube.com/playlist?list=" + pl, "pl:" + nom, 3) + " total=" + vus.size); } catch (e) { out.push("PL " + nom + " erreur " + e.message); } await pause(1500); }
for (const q of ["Mahmoud Goni", "Ustaz Mahmoud Goni", "Mahmoud Goni tafsir", "Mahmoud Goni fulfulde", "Moussa Souleymane maroua", "Dr Moussa Souleymane", "Malam Moussa Souleymane", "Moussa Soulaymane foulfoulde", "Malam Moussa fulfulde", "Dr Moussa Souleymane tafsir"]) {
  try { out.push("Q " + q + " " + await page("https://www.youtube.com/results?search_query=" + encodeURIComponent(q) + "&sp=EgIQAQ%253D%253D", "q:" + q, 5) + " total=" + vus.size); } catch (e) { out.push("Q " + q + " erreur " + e.message); }
  await pause(2500);
}
out.push("types: " + JSON.stringify(types));
out.push("\n=== LISTE ===");
for (const [id, v] of vus) out.push(`${id}\t${v.duree}\t${v.src}\t${v.chaine}\t${v.titre}`);
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
