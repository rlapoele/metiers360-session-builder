# Métiers360 — préparer une séance de découverte

Une application pour les conseillers, enseignants et éducateurs qui préparent une sélection de vidéos métiers à faire découvrir à un groupe, souvent sur tablette et avec peu de temps.

## Lancer le projet

Node.js **22.23.4 minimum** et npm. Vérification réalisée avec Node 24.14.1 et npm 11.17.0.

```bash
npm ci
npm --prefix server ci
npm run dev
```

Application : [localhost:4321](http://localhost:4321). API simulée : [localhost:4000](http://localhost:4000). Aucun fichier d’environnement n’est nécessaire. Pour une autre adresse d’API, définir la variable serveur `CATALOG_API_URL`.

Pour le serveur de production, démarrer l’API dans un terminal :

```bash
npm run start:api
```

Puis l’application dans un autre :

```bash
npm run build
npm start
```

## Utiliser l’application

1. Rechercher une vidéo **par titre**, puis filtrer par métier, casque ou public.
2. Consulter ses détails et l’ajouter à **Ma séance**. Sans filtre casque, la carte présente toutes ses compatibilités ; avec un filtre, elle affiche le casque choisi.
3. Utiliser **Monter**, **Descendre** et **Retirer** pour préparer l’ordre de lecture. Le brouillon est conservé dans ce navigateur lors d’un rechargement ou d’un changement de page.
4. Choisir **Finaliser ma séance**, saisir un nom et, éventuellement, un casque. Consulter les avertissements de compatibilité avant d’enregistrer.
5. Retrouver la confirmation, la liste et le programme enregistré dans **Mes séances**.

![Catalogue sur ordinateur avec les filtres visibles et le brouillon à droite](docs/screenshots/desktop-catalogue.png)
*Le catalogue et la séance restent consultables ensemble sur ordinateur.*

<details>
<summary>Voir les vues tablette et mobile</summary>

![Détails complets d’une vidéo dans un panneau latéral sur tablette](docs/screenshots/tablet-details.png)
*Les détails s’ouvrent sans quitter le catalogue.*

![Formulaire d’enregistrement sur mobile avec le nom, le casque et l’ordre de lecture](docs/screenshots/mobile-finalisation.png)
*La dernière étape regroupe les informations utiles à l’enregistrement.*

</details>

## Trois hypothèses structurantes

1. **Un seul brouillon local suffit.** La préparation en cours appartient au navigateur utilisé ; aucun compte ou partage entre appareils n’a été ajouté.
2. **Reconsulter les séances enregistrées est utile.** L’API expose une collection : une liste et un programme en lecture seule prolongent donc le parcours après l’enregistrement.
3. **L’utilisateur garde la décision sur le casque.** Le choix reste facultatif comme dans l’API ; une incompatibilité est signalée explicitement, sans supprimer automatiquement des vidéos de la sélection.

## Trois choix d’interface

- **Deux destinations, un brouillon transversal.** `Catalogue` et `Mes séances` structurent la navigation. Le panneau sur ordinateur et la feuille sur tablette/mobile gardent la préparation à portée de main.
- **Des actions explicites.** Les commandes d’ordre fonctionnent au clavier et au toucher. Après un retrait, le focus reste dans la séance, y compris lorsqu’elle devient vide.
- **Des erreurs récupérables.** Chargement, absence de résultats, données indisponibles et échec d’enregistrement sont distingués. Un échec conserve le brouillon ; les requêtes d’écriture ne sont pas rejouées automatiquement.

## Stack et organisation

**Astro avec son outillage Vite**, React 18 et TypeScript strict : Astro prend en charge les pages et les routes serveur ; React porte les interactions. Une fine couche BFF relaie les appels du navigateur vers l’API fournie et garde son adresse côté serveur.

Zod valide les données externes et persistées. TanStack Query gère les données distantes ; Nano Stores partage le brouillon entre les îlots React. Tailwind, des primitives locales issues de shadcn/Base UI et Heroicons forment la couche d’interface. Les filtres et la pagination restent dans l’URL.

Voir [l’architecture](docs/architecture.md) et [le contrat de l’API](API.md).

## Vérifier

```bash
npm run verify
npx playwright install chromium
npm run test:browser
```

`verify` regroupe formatage, ESLint, vérification Astro/TypeScript stricte, **95 tests unitaires/composants** et build serveur. La suite navigateur démarre ses propres services sur les ports **4100 et 4323**, couvre ordinateur, tablette et mobile, et conserve les traces en cas d’échec. Le [protocole de vérification](docs/delivery-verification.md) décrit les parcours, les résultats et leurs limites.

L’accessibilité a fait l’objet de vérifications axe et manuelles : clavier, focus, libellés, contraste, réduction des mouvements et débordements. Les contrôles compacts de séance mesurent 36px de haut et satisfont le minimum AA de 24px. Ces vérifications **ne constituent pas une déclaration de conformité WCAG/RGAA** ; aucun audit exhaustif avec lecteur d’écran n’est revendiqué. Voir [le détail des audits](docs/accessibility-audit.md).

## Limites et suite

Les séances enregistrées sont **en mémoire dans l’API** et disparaissent à son redémarrage. Le brouillon local n’est pas une sauvegarde partagée. La recherche suit le contrat fourni : sous-chaîne du titre, sans recherche sémantique.

Pas d’édition/suppression des séances enregistrées, d’authentification, de diffusion réelle vers les casques ou de glisser-déposer : ces capacités dépassent l’API ou ne sont pas nécessaires au parcours démontré. Aucun déploiement n’est inclus à ce stade.

Avec une journée de plus : tester le parcours avec un professionnel de l’accompagnement, mener une session dédiée avec lecteur d’écran et approfondir les cas de focus/zoom ; ensuite seulement, envisager la persistance serveur et le partage selon le besoin réel.

## IA, travail personnel et attention

J’ai utilisé l’IA pour explorer l’architecture, produire et faire évoluer les composants, écrire des tests, préparer les audits et maintenir les documents. Les méthodes appliquées sont recensées dans [le registre des skills](docs/skill-log.md).

J’ai dirigé les choix, relu chaque étape dans **WebStorm**, testé manuellement dans **Firefox et/ou Chrome**, et apporté des modifications de code et de CSS entre les étapes. Le dernier correctif de focus a également été retesté manuellement avant commit et push. Les commandes automatisées et les mesures consignées dans les rapports ont été exécutées par l’agent.

**Décision principale contre une proposition de l’IA :** l’outil recommandait initialement React 18 et TypeScript seuls, jugeant Astro excessif pour cet exercice. J’ai retenu Astro et les îlots React pour servir le contenu initial côté serveur et limiter l’hydratation aux interactions. L’objectif était un meilleur chargement initial ; aucun benchmark comparatif avec une SPA React n’a été réalisé. J’ai aussi demandé d’afficher tous les casques compatibles au lieu d’en masquer une partie, et de préserver les wireframes originaux plutôt que de les réécrire après l’implémentation.

**Attention estimée : environ 6 h 30, réparties sur 7 à 8 sessions.** Ce total dépasse le budget initial d’une demi-journée ; il exclut l’exécution autonome de l’agent et inclut cadrage, lecture, revue et tests manuels. Voir [le journal de l’exercice](docs/exercise-log.md).

Le [sujet original, conservé à l’identique](docs/source/exercise-brief.md), reste la source des exigences. Les [wireframes initiaux](docs/wireframes) sont conservés comme exploration préalable, pas comme une spécification exhaustive de l’interface livrée.
