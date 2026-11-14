# Bibliothèque de Lumu

Chaque livre est un dossier `livres/<id>/` qui contient les pages scannées du livre imprimé (`1.jpg`, `2.jpg`, …), sans retouche, et un fichier `empreintes.json` (empreinte SHA-256 de chaque page).

`catalogue.json` liste les livres affichés dans l'onglet Livre :

- `id`, `titre` (arabe), `titreFr`, `auteur` (arabe), `auteurFr`, `theme`, `couleur` ;
- `pages` (nombre de pages), `ext` (jpg) ;
- `rev` : le commit du dépôt qui contient les pages ;
- `emp` : l'empreinte SHA-256 du fichier `empreintes.json` ;
- `source` : l'édition imprimée d'où viennent les pages.

L'application contrôle chaque page avec son empreinte avant de l'afficher. Ne jamais modifier les pages d'un livre publié.
