// Sonde : vidéos YouTube d'Mal Hamadjam (recherche, avec pages suivantes).
import fs from "node:fs";
const out = [], vus = new Map();
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36", "accept-language": "fr-FR,fr;q=0.9" };
const pause = ms => new Promise(r => setTimeout(r, ms));
function marcher(o, f) { if (Array.isArray(o)) o.forEach(x => marcher(x, f)); else if (o && typeof o === "object") { f(o); for (const k in o) marcher(o[k], f); } }
const txt = x => x ? (x.simpleText || (x.runs || []).map(r => r.text).join("") || "") : "";
const Q = [
 ["hamadjam", "Mal Hamadjam"], ["hamadjam", "Malam Hamadjam"], ["hamadjam", "Mallam Hamadjam"], ["hamadjam", "Mal Hamadjam fulfulde"], ["hamadjam", "Hamadjam waazu"],
 ["hamadjam", "Hamadjam tafsir"], ["hamadjam", "Oustaz Hamadjam"], ["hamadjam", "Hamadjam Garoua"], ["hamadjam", "Hamadjam Maroua"], ["hamadjam", "Hamadjam Ngaoundéré"],
 ["hamadjam", "Hamadjam Cameroun"], ["hamadjam", "Mal Hamadjam waazou"], ["hamadjam", "Hamadjam Yaoundé"], ["hamadjam", "Malloum Hamadjam"], ["hamadjam", "Mal Amadjam"]
];
for (const [g, q] of Q) {
  let url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  try {
    const t = await (await fetch(url, { headers: UA })).text();
    const m = t.match(/var ytInitialData = (\{.*?\});<\/script>/s); if (!m) { out.push("Q " + q + " pas de données"); continue; }
    let data = JSON.parse(m[1]);
    const key = (t.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || [])[1], cv = (t.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || [])[1];
    for (let pg = 0; pg < 4; pg++) {
      let cont = null;
      marcher(data, o => {
        if (o.continuationCommand && o.continuationCommand.token) cont = o.continuationCommand.token;
        const v = o.videoRenderer; if (!v || !v.videoId || vus.has(v.videoId)) return;
        const ch = (v.ownerText?.runs || [])[0];
        vus.set(v.videoId, { g, q, chaine: ch?.text || "", chId: ch?.navigationEndpoint?.browseEndpoint?.browseId || "", titre: txt(v.title), duree: txt(v.lengthText), vues: txt(v.viewCountText), desc: (v.detailedMetadataSnippets || []).map(d => txt(d.snippetText)).join(" ").slice(0, 160) });
      });
      if (!cont || !key) break;
      await pause(1500);
      const r = await fetch("https://www.youtube.com/youtubei/v1/search?key=" + key, { method: "POST", headers: { ...UA, "content-type": "application/json" }, body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: cv, hl: "fr", gl: "CM" } }, continuation: cont }) });
      data = await r.json();
    }
  } catch (e) { out.push("Q " + q + " erreur " + e.message); }
  await pause(2000);
}
out.push("=== " + vus.size + " vidéos ===");
for (const [id, v] of vus) out.push([v.g, id, v.duree, v.vues, v.chaine, v.chId, v.titre.replace(/\t/g, " "), v.desc.replace(/\t/g, " ")].join("\t"));
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
