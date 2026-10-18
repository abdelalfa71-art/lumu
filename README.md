# Lumu Android — application autonome (site embarqué)

L'application web est **dans l'APK** (app/src/app/assets et app/src/admin/assets) :
aucune adresse à saisir, démarrage instantané, même hors connexion (les données viennent de Supabase).

## Variantes
- **app** : Lumu (public)
- **admin** : Lumu Admin (publication)
Choisir dans Android Studio : View > Tool Windows > Build Variants, puis Run ▶ ou Build > Build APK(s).

## À renseigner (liens de partage WhatsApp)
Dans app/build.gradle.kts, variante app : SITE_URL = "https://VOTRE-SITE.netlify.app"
(adresse publique du site Lumu, utilisée seulement pour créer les liens à partager).

## Mettre à jour le contenu
Remplacer app/src/app/assets/index.html par le nouveau index.html du site (idem pour admin), puis recompiler.

## Sélecteur
Audios / vidéos : sélecteur Lumu intégré (lit la bibliothèque du téléphone, comme WhatsApp).
PDF / images : sélecteur du système.

## Compilation en ligne (GitHub)
Envoyer ce dossier sur GitHub : l'onglet Actions fabrique les APK (Lumu-APK).
