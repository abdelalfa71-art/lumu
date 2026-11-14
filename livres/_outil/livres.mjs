// Outil de la bibliothèque, lancé par GitHub Actions quand livres/_demande.json change.
// action "chercher" : cherche des livres scannés sur archive.org et écrit la liste dans livres/_recherche/.
// action "ajouter"  : télécharge un PDF scanné, le découpe en pages JPEG (sans retouche du contenu) et calcule les empreintes.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const d = JSON.parse(fs.readFileSync("livres/_demande.json", "utf8"));
const json = async u => { const r = await fetch(u, { headers: { "user-agent": "lumu-bibliotheque/1.0" } }); if (!r.ok) throw new Error("HTTP " + r.status + " " + u); return r.json(); };

if (d.action === "chercher") {
  fs.mkdirSync("livres/_recherche", { recursive: true });
  for (const q of d.requetes) {
    const out = { requete: q.q, date: new Date().toISOString(), resultats: [] };
    try {
      const u = "https://archive.org/advancedsearch.php?q=" + encodeURIComponent("(" + q.q + ") AND mediatype:texts") + "&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&fl[]=downloads&fl[]=language&rows=" + (q.n || 25) + "&sort[]=downloads+desc&output=json";
      const docs = ((await json(u)).response || {}).docs || [];
      for (const doc of docs) {
        let pdfs = [];
        try {
          const m = await json("https://archive.org/metadata/" + doc.identifier);
          pdfs = (m.files || []).filter(f => /\.pdf$/i.test(f.name)).map(f => ({ nom: f.name, format: f.format, mo: Math.round((+f.size || 0) / 1048576 * 10) / 10 }));
          doc.droits = (m.metadata && (m.metadata.licenseurl || m.metadata.rights || m.metadata["possible-copyright-status"])) || "";
          doc.editeur = (m.metadata && (m.metadata.publisher || "")) || "";
          doc.date = (m.metadata && (m.metadata.date || "")) || "";
        } catch (e) { doc.erreur = String(e.message || e); }
        out.resultats.push({ ...doc, pdfs });
      }
    } catch (e) { out.erreur = String(e.message || e); }
    fs.writeFileSync("livres/_recherche/" + q.nom + ".json", JSON.stringify(out, null, 1));
    console.log(q.nom, out.resultats.length, out.erreur || "");
  }
} else if (d.action === "ajouter") {
  for (const L of (d.livres || [d])) {
    for (const f of fs.readdirSync("/tmp").filter(f => /^p-\d+\.jpg$/.test(f))) fs.rmSync("/tmp/" + f);
    const dir = "livres/" + L.id;
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    { let ok = false, err = null;
      for (let essai = 0; essai < 4 && !ok; essai++) {
        try { const r = await fetch(L.url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (lumu-bibliotheque)" } }); if (!r.ok) throw new Error("HTTP " + r.status); fs.writeFileSync("/tmp/livre.pdf", Buffer.from(await r.arrayBuffer())); ok = true; }
        catch (e) { err = e; console.log("essai", essai + 1, String(e.message || e), e.cause ? String(e.cause.message || e.cause) : ""); await new Promise(r => setTimeout(r, 5000)); }
      }
      if (!ok) throw err; }
    const tete = fs.readFileSync("/tmp/livre.pdf").subarray(0, 5).toString();
    if (tete !== "%PDF-") throw new Error("Le fichier téléchargé n'est pas un PDF");
    const args = ["-jpeg", "-jpegopt", "quality=88", "-scale-to-x", String(L.largeur || 1400), "-scale-to-y", "-1"];
    if (L.debut) args.push("-f", String(L.debut));
    if (L.fin) args.push("-l", String(L.fin));
    execFileSync("pdftoppm", [...args, "/tmp/livre.pdf", "/tmp/p"], { stdio: "inherit" });
    const fichiers = fs.readdirSync("/tmp").filter(f => /^p-\d+\.jpg$/.test(f)).sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));
    const emp = {};
    fichiers.forEach((f, i) => { const b = fs.readFileSync("/tmp/" + f); fs.writeFileSync(dir + "/" + (i + 1) + ".jpg", b); emp[i + 1] = crypto.createHash("sha256").update(b).digest("hex"); });
    const pdf = fs.readFileSync("/tmp/livre.pdf");
    fs.writeFileSync(dir + "/empreintes.json", JSON.stringify({ pages: fichiers.length, algorithme: "sha256", origine: L.url, pdf_sha256: crypto.createHash("sha256").update(pdf).digest("hex"), pdf_octets: pdf.length, empreintes: emp }, null, 0));
    console.log("pages:", fichiers.length);
    if (!fichiers.length) throw new Error("Aucune page produite");
  }
} else throw new Error("action inconnue");
