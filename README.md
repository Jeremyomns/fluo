# Fluo

L'organisation perso du quotidien : tâches, courses, notes, habitudes.

Sur ordinateur (écran ≥ 1024 px), les courses et les notes restent visibles dans la colonne de droite.
Sur mobile et tablette, elles ont chacune leur onglet en bas de l'écran. Backend Hono + SQLite, frontend Vite + React, tout en TypeScript.

## Prérequis

Node.js 22 ou plus récent (`node -v` pour vérifier). Sur Mac : `brew install node` ou via nvm.

## Lancer

```bash
npm install        # une seule fois (et après chaque mise à jour du projet)
npm run dev        # développement → http://localhost:5173 (rechargement à chaud)
npm start          # usage quotidien → http://localhost:3000 (compile le front puis sert tout)
```

Les données sont dans `data/fluo.db` (créé au premier lancement). Pour sauvegarder, copie ce fichier.

## Raccourcis

| Touche | Action |
|---|---|
| `N` | nouvelle tâche |
| `1` `2` `3` | Aujourd'hui / Semaine / Plus tard |
| `C` | courses : ajouter un article |
| `T` | mode clair / sombre |
| `F` | (panneau ouvert) ajouter / retirer du focus du jour |
| `Échap` | quitter le champ ou fermer le panneau |
| clic sur une tâche | ouvrir le détail (date, priorité, catégorie, notes) |
| glisser une tâche | réordonner (appui long sur mobile) |

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
npm test           # tests du parseur de saisie rapide et des récurrences
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

## Variables d'environnement (optionnelles)

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `3000` | port du serveur |
| `HOST` | `127.0.0.1` | `0.0.0.0` pour l'ouvrir au réseau local |
| `DATA_DIR` | `./data` | dossier de la base |
| `APP_TZ` | `Europe/Paris` | fuseau utilisé pour « aujourd'hui » |
