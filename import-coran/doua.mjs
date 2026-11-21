// Importe des invocations (douaa) récitées par nos récitateurs : archive.org → stockage Lumu, catégorie « Invocation ».
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const URL_SB = "https://edzzikmtxeslhvowbnix.supabase.co";
const ANON = fs.readFileSync("recompress/run.mjs", "utf8").match(/const ANON = "([^"]+)"/)[1];
const FN = `${URL_SB}/functions/v1/lumu-import-coran`;
const sb = createClient(URL_SB, ANON, { auth: { persistSession: false } });
const D = JSON.parse(fs.readFileSync("import-coran/demande-doua.json", "utf8"));
const cle = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
async function jeton() {
  const r = await fetch(`${process.env.ACTIONS_ID_TOKEN_REQUEST_URL}&audience=lumu-import-coran`, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` } });
  return (await r.json()).value;
}
async function appel(corps) {
  const r = await fetch(FN, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await jeton()}`, apikey: ANON }, body: JSON.stringify(corps) });
  const t = await r.text(); if (!r.ok) throw new Error(`fonction ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t);
}
const pause = ms => new Promise(r => setTimeout(r, ms));
async function telecharger(url) {
  for (let i = 1; i <= 4; i++) { try { const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); return Buffer.from(await r.arrayBuffer()); } catch (e) { if (i === 4) throw e; await pause(3000 * i); } }
}
let erreurs = 0; const aPublier = new Set();
for (const I of D.invocations) {
  try {
    const m = await (await fetch(`https://archive.org/metadata/${I.archive}`)).json();
    let fichiers = (m.files || []).filter(f => /\.mp3$/i.test(f.name) && f.source === "original").map(f => f.name).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    if (I.fichier) fichiers = fichiers.filter(n => n === I.fichier);
    if (!I.serie) fichiers = fichiers.slice(0, 1);
    if (!fichiers.length) throw new Error("aucun mp3");
    const { deja } = await appel({ a: "deja_doua", lecteur: I.lecteur });
    for (let i = 0; i < fichiers.length; i++) {
      const k = I.serie ? cle(I.archive).slice(0, 44) + "-" + String(i + 1).padStart(2, "0") : cle(I.archive);
      if (deja.includes(k)) { console.log(`${I.lecteur} · ${k} déjà là`); continue; }
      const titre = I.serie ? `${I.titre} · ${i + 1}` : I.titre;
      const buf = await telecharger(`https://archive.org/download/${I.archive}/${encodeURIComponent(fichiers[i])}`);
      if (buf.length < 20000) throw new Error("fichier trop petit");
      fs.writeFileSync("d.mp3", buf);
      const duree = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", "d.mp3"]).toString());
      const s = await appel({ a: "signer_doua", lecteur: I.lecteur, k });
      const up = await sb.storage.from("yt-media").uploadToSignedUrl(s.path, s.token, buf, { contentType: "audio/mpeg", upsert: true });
      if (up.error) throw up.error;
      await appel({ a: "creer_doua", lecteur: I.lecteur, k, titre, duree, taille: buf.length, description: `${titre}, par ${I.lecteur}. Source : ${D.source_nom}.`, source_nom: D.source_nom, source_url: `https://archive.org/details/${I.archive}` });
      aPublier.add(I.lecteur);
      console.log(`${I.lecteur} · ${titre} · ${(buf.length / 1048576).toFixed(1)} Mo · ${Math.round(duree / 60)} min`);
    }
    aPublier.add(I.lecteur);
  } catch (e) { erreurs++; console.log(`::warning::${I.lecteur} · ${I.titre} : ${String(e && e.message || e).slice(0, 200)}`); }
}
for (const L of aPublier) { const p = await appel({ a: "publier", lecteur: L }); console.log(`::notice::${L} : ${p.publies} invocation(s) publiée(s)`); }
if (erreurs) console.log(`::warning::${erreurs} invocation(s) non importée(s)`);
