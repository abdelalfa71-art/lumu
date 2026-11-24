// Sonde : collections audio haoussa sur archive.org.
import fs from "node:fs";
const out = [];
for (const q of ["language:(hau OR hausa) AND mediatype:audio", "(tafsir OR tafseer OR wa'azi OR karatun) AND hausa AND mediatype:audio", "(jaafar OR \"ja'afar\" OR albani zaria OR daurawa OR pantami OR gumi OR rijiyar) AND mediatype:audio", "subject:(hausa) AND mediatype:audio"]) {
  try { const j = await (await fetch("https://archive.org/advancedsearch.php?q=" + encodeURIComponent(q) + "&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=licenseurl&fl[]=item_size&fl[]=downloads&sort[]=downloads+desc&rows=80&output=json")).json();
    out.push("\n=== " + q + " : " + j.response.numFound);
    for (const d of j.response.docs) out.push(`${d.identifier}\t${d.downloads || 0}\t${Math.round((d.item_size || 0) / 1e6)}Mo\t${[].concat(d.creator || "").join(",").slice(0, 40)}\t${d.licenseurl || ""}\t${String(d.title).slice(0, 90)}`);
  } catch (e) { out.push("erreur " + e.message); }
}
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
