# Fluo

L'organisation perso du quotidien : tâches, courses, notes, habitudes.

Sur ordinateur (écran ≥ 1024 px), objectifs, habitudes, courses et notes restent visibles dans la colonne de droite.
Sur mobile et tablette, chacun a son onglet en bas de l'écran. Backend Hono + SQLite, frontend Vite + React, tout en TypeScript.

## Prérequis

Node.js 22 ou plus récent (`node -v` pour vérifier). Sur Mac : `brew install node` ou via nvm.

## Lancer

```bash
npm install        # une seule fois (et après chaque mise à jour du projet)
npm run dev        # développement → http://localhost:5173 (rechargement à chaud)
npm start          # usage quotidien → http://localhost:3000 (compile le front puis sert tout)
```

Les données sont dans `data/fluo.db` (créé au premier lancement).

## Sauvegarde

En bas de page, **Sauvegarde et réglages** :
- **Télécharger la sauvegarde** : un fichier JSON avec toutes tes données (à garder hors de l'ordinateur).
- **Restaurer une sauvegarde** : remplace toutes les données par celles du fichier. Avant chaque restauration,
  une copie de la base est gardée dans `data/sauvegardes/` (les 10 dernières).
  Un fichier abîmé est refusé sans rien modifier.

## Raccourcis

| Touche | Action |
|---|---|
| `N` | nouvelle tâche |
| `1` `2` `3` | Aujourd'hui / Semaine / Plus tard |
| `C` | courses : ajouter un article |
| `T` | mode clair / sombre |
| `?` | aide des raccourcis |
| `J` / `K` | tâche suivante / précédente |
| `X` (ou Espace) | cocher / décocher la tâche sélectionnée |
| `Entrée` | ouvrir le détail de la tâche sélectionnée |
| `F` | focus du jour (tâche sélectionnée ou panneau ouvert) |
| `D` | reporter la tâche sélectionnée à demain |
| `Suppr` | supprimer la tâche sélectionnée (5 s pour annuler) |
| `Échap` | quitter le champ ou fermer le panneau |
| clic sur une tâche | ouvrir le détail (date, priorité, catégorie, notes) |
| glisser une tâche | réordonner (appui long sur mobile) |

Sur téléphone : **glisser une tâche vers la droite** la coche, **vers la gauche** la reporte à demain.

## Saisie rapide

Tout ce qui n'est pas reconnu forme le titre. Un aperçu s'affiche sous le champ pendant la frappe.

| Tu tapes | Résultat |
|---|---|
| `demain`, `après-demain`, `aujourd'hui` | échéance |
| `lundi` … `dimanche` (+ `prochain`) | prochain jour de ce nom |
| `12/10`, `12/10/27`, `12 octobre`, `le 12` | date précise |
| `dans 3 jours`, `dans 2 semaines`, `dans 1 mois` | date relative |
| `semaine prochaine`, `week-end` | lundi prochain, samedi |
| `!haute` ou `!!`, `!basse` | priorité |
| `#maison`, `#admin`… | catégorie (début du nom, accents ignorés) |
| `*` | épingler dans le focus du jour |
| `chaque mardi`, `tous les lundis et jeudis` | répétition hebdomadaire |
| `chaque jour`, `tous les 3 jours`, `chaque jour de semaine` | répétition quotidienne |
| `tous les mois le 5`, `chaque mois`, `toutes les 2 semaines` | répétition mensuelle / espacée |
| `chaque année` | répétition annuelle (à la date du jour) |

Sans date tapée : aujourd'hui depuis la vue Aujourd'hui, demain depuis Semaine, sans date depuis Plus tard.

## Courses

- Les articles déjà achetés sont proposés pendant la saisie (flèches ↑↓ puis Entrée) ; le × d'une suggestion l'oublie.
- Les « habituels » (achetés au moins 2 fois) s'ajoutent en un clic.
- Toucher une ligne la coche ; « Vider le panier » retire les articles cochés (5 s pour annuler).
- Pas de doublon : « oeufs » et « Œufs » sont le même article.

## Objectifs de la semaine

Quelques objectifs par semaine (du lundi au dimanche). Le lundi, Fluo propose de reporter ceux de la
semaine précédente qui ne sont pas terminés (ou de les ignorer).

## Habitudes

- Une grille L M M J V S D par habitude : un clic coche le jour (les jours à venir sont désactivés).
- 🔥 indique la série en cours ; les jours non prévus (bordure pointillée) ne la cassent pas,
  et comptent en bonus si tu les coches.
- ‹ › pour revenir sur une semaine passée et rattraper un oubli.
- Clic sur le nom d'une habitude : la modifier (jours prévus, emoji) ou la supprimer.

## Notes

Un bloc-notes libre, enregistré automatiquement pendant la frappe (indicateur « Enregistré »).

## Tâches récurrentes

Une tâche récurrente n'a qu'une occurrence ouverte à la fois. En la cochant, la suivante apparaît.
Cochée en retard, la suivante repart d'aujourd'hui : les occurrences manquées ne s'empilent pas.
Le × d'une ligne *passe* l'occurrence ; « Supprimer la série » (panneau de détail) arrête la répétition.

## Focus du jour

Jusqu'à 3 tâches épinglées (étoile, `F`, ou `*` en saisie rapide), remises à zéro chaque matin.
Sans épingle, Fluo propose les tâches les plus urgentes.

## Tests

```bash
npm test           # tests : saisie rapide, récurrences, habitudes
npm run typecheck  # vérification des types sur tout le projet
```

## Structure

```
shared/   types + schémas Zod + règles de dates, partagés front/back
server/   API Hono, base SQLite (Drizzle), migrations dans server/drizzle/
web/      interface React (Vite)
data/     base de données (ignorée par git)
```

## Faire évoluer le schéma

1. Modifier `server/src/db/schema.ts`
2. `npm run db:generate` → crée une migration SQL dans `server/drizzle/`
3. Relancer : les migrations s'appliquent automatiquement au démarrage.

## Bonus : accès depuis un téléphone sur le Wi-Fi de la maison

```bash
npm run reseau
```

Un QR code s'affiche dans le terminal : scanne-le avec l'appareil photo du téléphone (même Wi-Fi).
Fluo reste protégé par une clé d'accès (dans `data/cle-acces.txt`, à supprimer pour révoquer tous
les appareils). L'ordinateur doit rester allumé, écran ouvert.

## Variables d'environnement (optionnelles)

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `3000` | port du serveur |
| `HOST` | `127.0.0.1` | `0.0.0.0` pour l'ouvrir au réseau local |
| `DATA_DIR` | `./data` | dossier de la base |
| `APP_TZ` | `Europe/Paris` | fuseau utilisé pour « aujourd'hui » |
| `FLUO_TRUST_LOCALHOST` | `true` | `false` derrière un proxy (hébergement) : voir `server/src/config.ts` |
