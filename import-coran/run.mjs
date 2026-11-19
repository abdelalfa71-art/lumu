// Importe une récitation complète du Coran (114 sourates) dans Lumu : télécharge chaque MP3,
// l'envoie dans le stockage Supabase, crée la publication, puis publie tout d'un coup (sans notifications).
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const URL_SB = "https://edzzikmtxeslhvowbnix.supabase.co";
const ANON = fs.readFileSync("recompress/run.mjs", "utf8").match(/const ANON = "([^"]+)"/)[1];
const FN = `${URL_SB}/functions/v1/lumu-import-coran`;
const sb = createClient(URL_SB, ANON, { auth: { persistSession: false } });
const D = JSON.parse(fs.readFileSync("import-coran/demande.json", "utf8"));
const NOMS = fs.readFileSync("app/src/app/assets/index.html", "utf8").match(/NOMS: "([^"]+)"\.split/)[1].split(",");
if (NOMS.length !== 114) throw new Error("liste des sourates invalide");

async function jeton() {
  const r = await fetch(`${process.env.ACTIONS_ID_TOKEN_REQUEST_URL}&audience=lumu-import-coran`, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` } });
  if (!r.ok) throw new Error("jeton " + r.status);
  return (await r.json()).value;
}
async function appel(corps) {
  const r = await fetch(FN, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await jeton()}`, apikey: ANON }, body: JSON.stringify({ lecteur: D.lecteur, ...corps }) });
  const t = await r.text();
  if (!r.ok) throw new Error(`fonction ${r.status} ${t.slice(0, 200)}`);
  return JSON.parse(t);
}
const pause = ms => new Promise(r => setTimeout(r, ms));
async function telecharger(url) {
  for (let essai = 1; essai <= 4; essai++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (essai === 4) throw e; await pause(3000 * essai); }
  }
}

const net = x => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
let API = null;
async function serveurDe(L) {
  if (L.modele_url) return L.modele_url;
  if (!API) { const r = await fetch("https://www.mp3quran.net/api/v3/reciters?language=eng"); if (!r.ok) throw new Error("API mp3quran " + r.status); API = (await r.json()).reciters || []; }
  const cand = API.filter(x => L.cherche.some(k => net(x.name).includes(net(k))));
  for (const pref of [m => /hafs/i.test(m.name) && /murattal/i.test(m.name), m => /hafs/i.test(m.name), () => true])
    for (const x of cand) for (const m of x.moshaf || []) if (+m.surah_total === 114 && pref(m)) { console.log(`${L.lecteur} → ${x.name} · ${m.name} · ${m.server}`); return m.server.replace(/\/?$/, "/") + "{nnn}.mp3"; }
  throw new Error("récitateur introuvable sur mp3quran (" + cand.map(x => x.name).join(", ") + ")");
}
let erreurs = 0;
for (const L of D.lecteurs) {
  D.lecteur = L.lecteur;
  const source_nom = L.source_nom || D.source_nom, source_page = L.source_page || D.source_page;
  try {
    const modele = await serveurDe(L);
    const { deja } = await appel({ a: "deja" });
    const faits = new Set(deja);
    if (faits.size === 114) { const p = await appel({ a: "publier" }); console.log(`${L.lecteur} : déjà complet${p.publies ? ", " + p.publies + " publiées" : ""}`); continue; }
    console.log(`${L.lecteur} : ${faits.size} sourates déjà importées`);
    let ok = 0, echecs = 0;
    for (let n = 1; n <= 114; n++) {
      if (faits.has(n)) continue;
      const nnn = String(n).padStart(3, "0"), url = modele.replace("{nnn}", nnn);
      try {
        const buf = await telecharger(url);
        if (buf.length < 20000) throw new Error("fichier trop petit (" + buf.length + " octets)");
        fs.writeFileSync("s.mp3", buf);
        const duree = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", "s.mp3"]).toString());
        const s = await appel({ a: "signer", n });
        const up = await sb.storage.from("yt-media").uploadToSignedUrl(s.path, s.token, buf, { contentType: "audio/mpeg", upsert: true });
        if (up.error) throw up.error;
        await appel({ a: "creer", n, titre: `Sourate ${NOMS[n - 1]}`, duree, taille: buf.length,
          description: `Récitation de la sourate ${NOMS[n - 1]} (n° ${n}) par ${L.lecteur}. Source : ${source_nom}.`, source_nom, source_url: source_page });
        ok++; console.log(`${L.lecteur} [${n}/114] ok ${NOMS[n - 1]} · ${(buf.length / 1048576).toFixed(1)} Mo`);
      } catch (e) {
        echecs++; console.log(`::warning::${L.lecteur} [${n}/114] ÉCHEC ${NOMS[n - 1]} : ${String(e && e.message || e).replace(/\n/g, " ").slice(0, 200)}`);
        if (echecs >= 5 && ok === 0) throw new Error("5 échecs d'affilée, lecteur abandonné");
      }
    }
    if (faits.size + ok === 114) { const p = await appel({ a: "publier" }); console.log(`::notice::${L.lecteur} : 114 sourates, ${p.publies} publiées.`); }
    else { erreurs++; console.log(`::error::${L.lecteur} : ${faits.size + ok}/114 (${echecs} échecs). Non publié : relancez.`); }
  } catch (e) { erreurs++; console.log(`::error::${L.lecteur} : ${String(e && e.message || e).slice(0, 300)}`); }
}
if (erreurs) process.exit(1);
