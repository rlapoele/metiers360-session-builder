# Architecture après implémentation

Ce diagramme décrit l’application Métiers360 **après son implémentation**. Créé le 27 octobre 2026 à partir du commit `17d809f` (`v1.0.1`), il présente les frontières d’exécution et la répartition de l’état.

**Cet instantané documentaire ne doit pas servir de spécification pour les évolutions futures.** Consulter le [sujet original](../source/exercise-brief.md), les [consignes du projet](../../AGENTS.md), le [document d’architecture](../architecture.md) et le code en vigueur avant toute évolution.

![Architecture de Métiers360 : navigateur, serveur Astro et BFF, API simulée séparée, brouillon local et séances en mémoire](./architecture.svg)

## Lecture du diagramme

- **Astro** rend les pages et charge leurs données initiales directement par le client API serveur. Les îlots React portent les interactions ; `SessionDraftButton` est monté uniquement dans le navigateur.
- **L’état** se répartit entre l’URL (recherche, filtres, pagination), TanStack Query (données distantes), Nano Stores et `localStorage` (brouillon partagé). Les métadonnées vidéo et les valeurs dérivées ne sont pas persistées ; les panneaux restent gérés localement.
- **Le BFF** reçoit les appels navigateur sur `/api/*`, valide l’enregistrement et relaie les SVG. Le client serveur valide les réponses JSON avec Zod, normalise les erreurs et réécrit les URL de vignettes. Un enregistrement confirmé permet de vider le brouillon.
- **L’API séparée** charge le catalogue JSON et conserve les séances en mémoire : les créations disparaissent au redémarrage. La topologie Railway représentée (web public, API privée) vient du [guide de déploiement](../deployment.md), sans nouvel audit du déploiement.

Les flèches représentent des échanges ou dépendances, sans ordre chronologique. Les composants de présentation, tests et contrôles de santé sont omis.

## Fichiers et génération

- [Diagramme SVG](./architecture.svg) : rendu par [Pele](https://github.com/obsidianmd/pele), version **1.12.0**, puis vérifié visuellement.
- [Source Mermaid](./architecture.mmd) : version texte modifiable du diagramme.
- [Script de génération](./render.mjs) : produit le SVG avec un thème autonome, sans ajouter de dépendance à l’application.

Pour régénérer le SVG depuis la racine du dépôt, installer Pele dans un dossier temporaire puis passer le chemin de son module au script :

```bash
pele_dir="$(mktemp -d)"
npm install --prefix "$pele_dir" --ignore-scripts --no-audit --no-fund --save-exact pele@1.12.0
node docs/architecture/render.mjs "$pele_dir/node_modules/pele/dist/pele.js"
```
