// Sonde : catalogue IslamHouse (foulfouldé / français) et HadeethEnc, et conditions d'utilisation.
import fs from "node:fs";
const out = [];
const get = async (u, n = 1500) => { try { const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0" } }); const t = await r.text(); out.push(`=== ${u} [${r.status}]\n${t.slice(0, n)}`); return t; } catch (e) { out.push(`=== ${u} : ${e.message}`); return ""; } };
const K = "paV29H2gm56kvLPy";
await get(`https://api3.islamhouse.com/v3/${K}/main/sitecontent/ff/json`, 2500);
await get(`https://api3.islamhouse.com/v3/${K}/main/audios/ff/ff/1/5/json`, 4000);
await get(`https://api3.islamhouse.com/v3/${K}/main/videos/ff/ff/1/5/json`, 3000);
await get(`https://api3.islamhouse.com/v3/${K}/main/audios/fr/fr/1/3/json`, 2500);
const h = await get("https://islamhouse.com/fr/", 200);
const lien = (h.match(/href="([^"]*(?:terms|conditions|copyright|droits|privacy)[^"]*)"/i) || [])[1];
if (lien) await get(lien.startsWith("http") ? lien : "https://islamhouse.com" + lien, 3000);
await get("https://islamhouse.com/fr/main/copyright", 3000);
await get("https://hadeethenc.com/api/v1/languages", 1500);
await get("https://hadeethenc.com/api/v1/categories/roots/?language=ff", 1500);
await get("https://hadeethenc.com/api/v1/hadeeths/list/?language=fr&category_id=1&page=1&per_page=2", 1500);
await get("https://hadeethenc.com/fr/home/terms", 3000);
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n\n"));
