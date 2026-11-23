// Traductions du sens du Coran (QuranEnc.com) : téléchargées telles quelles, sans modification,
// avec le numéro de version (conditions de QuranEnc). Relancé chaque mois pour suivre la dernière version.
import fs from "node:fs";
const LANGUES = ["fr", "ff", "ha"];
const api = async u => { for (let i = 1; i <= 4; i++) { try { const r = await fetch("https://quranenc.com/api/v1/" + u); if (!r.ok) throw new Error(r.status); return await r.json(); } catch (e) { if (i === 4) throw e; await new Promise(o => setTimeout(o, 2000 * i)); } } };
const index = [];
for (const lg of LANGUES) {
  const l = (await api(`translations/list/${lg}`)).translations || [];
  console.log(lg, l.map(t => `${t.key} v${t.version} · ${t.title}`).join(" | "));
  for (const t of l) {
    const F = `coran/trad/${t.key}.json`;
    const ancien = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, "utf8")) : null;
    if (ancien && String(ancien.version) === String(t.version)) { index.push({ key: t.key, langue: lg, titre: t.title, version: t.version, description: t.description || "" }); continue; }
    const s = {};
    for (let n = 1; n <= 114; n++) {
      const r = await api(`translation/sura/${t.key}/${n}`);
      s[n] = (r.result || []).map(v => [+v.aya, v.translation || "", v.footnotes || ""]);
    }
    fs.writeFileSync(F, JSON.stringify({ key: t.key, langue: lg, titre: t.title, version: t.version, source: "QuranEnc.com", maj: new Date().toISOString().slice(0, 10), s }));
    index.push({ key: t.key, langue: lg, titre: t.title, version: t.version, description: t.description || "" });
    console.log("  ✓", t.key, "v" + t.version);
  }
}
fs.writeFileSync("coran/trad/index.json", JSON.stringify({ source: "QuranEnc.com", maj: new Date().toISOString().slice(0, 10), traductions: index }, null, 1));
