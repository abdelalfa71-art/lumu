// Sonde : vidéos de Mouhammad Ali Dewa et Mahmoud Goni sur TikTok, Dailymotion et Vimeo.
import fs from "node:fs";
const out = [];
const UA = { "user-agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36", "accept-language": "fr-FR,fr;q=0.9" };
const pause = ms => new Promise(r => setTimeout(r, ms));
const Q = ["ali dewa", "mohamed ali dewa", "mouhamed ali dewa", "mahmoud goni", "mahmud goni", "modibbo dewa", "dewa fulfulde", "goni fulfulde"];
for (const q of Q) {
  for (const u of ["https://www.tiktok.com/search/video?q=" + encodeURIComponent(q), "https://www.tiktok.com/tag/" + encodeURIComponent(q.replace(/\s+/g, ""))]) {
    try { const r = await fetch(u, { headers: UA, redirect: "follow" }); const t = await r.text();
      const ids = [...new Set([...t.matchAll(/\/@([\w.]+)\/video\/(\d{15,22})/g)].map(m => m[1] + "/" + m[2]))];
      const ids2 = [...new Set([...t.matchAll(/"id":"(\d{18,20})"/g)].map(m => m[1]))];
      out.push(`TT ${r.status} ${u} : ${ids.length} liens, ${ids2.length} ids, ${t.length} octets ${ids.slice(0, 15).join(" ")}`);
    } catch (e) { out.push("TT erreur " + u + " " + e.message); }
    await pause(2000);
  }
  try { const j = await (await fetch("https://api.dailymotion.com/videos?fields=id,title,owner.screenname,duration,allow_embed&limit=50&search=" + encodeURIComponent(q))).json();
    out.push(`DM ${q} : ${j.total}`); for (const v of j.list || []) out.push(`  ${v.id}\t${v.duration}\t${v.allow_embed}\t${v["owner.screenname"]}\t${v.title}`);
  } catch (e) { out.push("DM erreur " + e.message); }
  try { const t = await (await fetch("https://vimeo.com/search?q=" + encodeURIComponent(q), { headers: UA })).text();
    const ids = [...new Set([...t.matchAll(/vimeo\.com\\?\/(\d{6,11})/g)].map(m => m[1]))]; out.push(`VM ${q} : ${ids.length} ${ids.slice(0, 10).join(" ")}`);
  } catch (e) { out.push("VM erreur " + e.message); }
  await pause(1500);
}
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
