# Fluo

L'organisation perso du quotidien : tâches, courses, notes, habitudes.

Sur ordinateur (écran ≥ 1024 px), objectifs, habitudes, courses et notes restent visibles dans la colonne de droite.
Sur mobile et tablette, chacun a son onglet en bas de l'écran. Tout en TypeScript.

## Architecture

- **Interface** : React (Vite), **API** : Hono, **base de données** : Postgres chez **Supabase**.
- **Connexion** : Supabase Auth, par lien magique ou code à 6 chiffres reçu par e-mail.
  Seules les adresses listées dans `ALLOWED_EMAILS` ont accès.
- **Hébergement** : **Vercel** (interface + API en fonction serveur, région Paris `cdg1`).
- Les tables vivent dans le schéma `fluo` de Supabase, avec la sécurité RLS activée :
  elles ne sont jamais lisibles via la clé publique, seul le serveur de Fluo y accède.

## Prérequis

Node.js 22 ou plus récent (`node -v` pour vérifier).

## Configuration

Copie `.env.example` en `.env` à la racine du projet et remplis-le (voir les commentaires du fichier).

## Lancer en local

```bash
npm install        # une seule fois (et après chaque mise à jour du projet)
npm run db:migrate # crée ou met à jour les tables dans Supabase
npm run dev        # → http://localhost:5173 (rechargement à chaud)
```

En local, Fluo utilise **la même base Supabase** que la version en ligne : ce que tu y modifies est réel.

## Déployer

Chaque `git push` sur la branche principale est déployé automatiquement par Vercel
(`npm run build:vercel` produit le dossier `.vercel/output`). Si le schéma de la base change,
lance d'abord `npm run db:migrate` depuis ton ordinateur.

## Identité visuelle

Direction « Aplats » : fond bleu très pâle, focus du jour sur un aplat orange fluo, colonne latérale
bleu nuit, onglets et filtres en pastilles, ruban orange et bleu dans l'en-tête. Mode sombre presque noir
où l'orange « s'allume ». Toutes les couleurs sont des variables dans `web/src/styles/global.css`
(`--fluo` pour la couleur signature, `--panel` pour le bleu nuit…).

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
server/   API Hono, base Postgres via Drizzle, migrations dans server/drizzle/
scripts/  construction pour Vercel (build-vercel.mjs)
web/      interface React (Vite)
```

## Faire évoluer le schéma

1. Modifier `server/src/db/schema.ts`
2. `npm run db:generate` → crée une migration SQL dans `server/drizzle/`
3. Relancer : les migrations s'appliquent automatiquement au démarrage.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `VITE_SUPABASE_URL` | adresse du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé publique Supabase |
| `DATABASE_URL` | adresse de la base (Transaction pooler, port 6543) — **secret** |
| `ALLOWED_EMAILS` | adresse(s) autorisée(s), séparées par des virgules |
| `APP_TZ` | fuseau pour « aujourd'hui » (défaut `Europe/Paris`) |
