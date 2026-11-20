// Vérifie quels récitateurs ont des repères de temps par verset (mp3quran) correspondant à nos fichiers
import fs from "node:fs";
const out = []; const log = s => { out.push(s); console.log(s); };
const j = async u => { const r = await fetch(u); if (!r.ok) throw new Error(r.status + " " + u); return r.json(); };
try {
  const reads = await j("https://mp3quran.net/api/v3/ayat_timing/reads");
  log("READS " + JSON.stringify(reads).slice(0, 6000));
  const liste = Array.isArray(reads) ? reads : (reads.reads || reads.data || []);
  for (const r of liste.slice(0, 80)) {
    const id = r.id || r.read_id;
    try { const t = await j(`https://mp3quran.net/api/v3/ayat_timing?surah=1&read=${id}`); log(`TIMING read=${id} ${r.name || ""} ${r.folder_url || r.url || ""} -> ${JSON.stringify(t).slice(0, 300)}`); }
    catch (e) { log(`TIMING read=${id} erreur ${e.message}`); }
  }
} catch (e) { log("reads erreur " + e.message); }
try { const q = await j("https://api.quran.com/api/v4/resources/recitations"); log("QURANCOM " + JSON.stringify(q).slice(0, 3000)); } catch (e) { log("qurancom erreur " + e.message); }
fs.writeFileSync("import-coran/resultat-timings.txt", out.join("\n") + "\n");
