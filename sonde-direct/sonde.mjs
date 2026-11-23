// Sonde : playlists des chaînes qui publient le Cheikh Ali Dewa.
import fs from "node:fs";
const out = [];
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36", "accept-language": "fr-FR,fr;q=0.9" };
function marcher(o, f) { if (Array.isArray(o)) o.forEach(x => marcher(x, f)); else if (o && typeof o === "object") { f(o); for (const k in o) marcher(o[k], f); } }
const txt = x => x ? (x.simpleText || (x.runs || []).map(r => r.text).join("") || x.content || "") : "";
for (const ch of ["UCEyUd_eUgT9-O-h3SHFBezA", "UCOhVG_9yzaMMErk5UQMNHdA", "UCoc_LeydZoZY3AGJ3Dcqx0Q", "UCM8wNYoBcrFlzFRVrnC3ApQ", "UC30QO3nj3jSBOsQ35XgVEVw"]) {
  await new Promise(r => setTimeout(r, 2000));
  try {
    const t = await (await fetch("https://www.youtube.com/channel/" + ch + "/playlists", { headers: UA })).text();
    const m = t.match(/var ytInitialData = (\{.*?\});<\/script>/s); if (!m) { out.push(ch + " pas de données"); continue; }
    const d = JSON.parse(m[1]); out.push("\n=== " + ch + " " + (d.metadata?.channelMetadataRenderer?.title || ""));
    const vus = new Set();
    marcher(d, o => {
      const l = o.lockupViewModel; if (l && l.contentId && /^PL|^OL/.test(l.contentId) && !vus.has(l.contentId)) { vus.add(l.contentId);
        const titre = l.metadata?.lockupMetadataViewModel?.title?.content || ""; let nb = ""; marcher(l, z => { if (z.thumbnailBadgeViewModel?.text) nb = z.thumbnailBadgeViewModel.text; });
        out.push(l.contentId + "\t" + nb + "\t" + titre); }
      const p = o.gridPlaylistRenderer || o.playlistRenderer; if (p && p.playlistId && !vus.has(p.playlistId)) { vus.add(p.playlistId); out.push(p.playlistId + "\t" + txt(p.videoCountText || p.videoCountShortText) + "\t" + txt(p.title)); }
    });
    if (!vus.size) out.push("(aucune playlist)");
  } catch (e) { out.push(ch + " erreur " + e.message); }
}
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
