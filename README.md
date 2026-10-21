# Exercice technique — développeur·se front-end / UI (React / TypeScript)

## Le cadre

- **Effort : une demi-journée de votre attention, pas plus.** Le temps où un agent travaille seul ne
  compte pas ; comptez celui que vous passez à lire, cadrer, guider, relire et tester. Nous ne cherchons
  pas un rendu exhaustif. S'arrêter à temps et expliquer ce qui manque fait partie de l'exercice.
- **Délai de rendu : 7 jours** après réception du sujet, à organiser comme vous le souhaitez.
- **La spécification est volontairement incomplète.** C'est notre quotidien : le besoin arrive rarement
  sous une forme définitive. Vous pouvez nous poser des questions par mail à tout moment
  (réponse sous une demi-journée ouvrée ; pour les questions posées les 22 et 23 octobre, réponse le
  lundi 26). Vous pouvez aussi trancher vous-même : notez alors l'hypothèse prise.
- **Les assistants IA sont autorisés**, et même bienvenus : c'est notre façon de travailler. Dites-nous
  simplement comment vous les avez utilisés et ce que vous avez vérifié par vous-même.
- Ce code ne sera jamais utilisé en production. Il sert uniquement de support au débrief.

## Le contexte

Métiers 360 propose un catalogue de vidéos immersives 360° qui présentent des métiers de l'intérieur.
Chaque vidéo est rattachée à un ou plusieurs métiers du **référentiel ROME 4.0** de France Travail
(code, intitulé, grand domaine).

Les vidéos sont utilisées par des **conseiller·es France Travail, des enseignant·es, des
éducateur·ices**. Avant une séance avec un groupe, ils et elles choisissent les vidéos à faire
découvrir, puis les envoient sur les casques de réalité virtuelle. Ils sont souvent pressés, pas
toujours à l'aise avec le numérique, et préparent parfois la séance quelques minutes avant, sur
une tablette, devant le groupe.

## Ce que nous vous fournissons

Une archive de démarrage, à versionner vous-même dès le début, contenant :

- un **serveur d'API simulé** (catalogue d'environ 200 vidéos, métiers ROME, modèles de casques) et
  sa documentation ;
- les données de chaque vidéo : titre, description, métiers ROME associés, durée, public conseillé,
  vignette, compatibilité avec les modèles de casques.

Le serveur simulé se comporte comme une vraie API : temps de réponse variables et erreurs
occasionnelles.

## Ce que nous vous demandons

Une petite application qui permet de **préparer une séance** :

1. **Trouver des vidéos** dans le catalogue (recherche et filtres que vous jugez utiles pour ce public).
2. **Composer la séance** : sélectionner des vidéos, les ordonner, la nommer.
3. **Enregistrer la séance** via l'API.

Stack attendue : **React 18 et TypeScript en mode strict, avec Vite.** Le routage, la bibliothèque de
composants, la gestion d'état et le style sont à votre choix, à condition de l'argumenter. Pour
information, nos applications utilisent Ant Design et Tailwind selon les projets.

Si vous connaissez **Remix** (notre application utilisateur est en Remix 2) ou React Router 7, vous
pouvez l'utiliser : c'est un plus, pas une attente.

Nous attacherons de l'importance :

- aux **choix d'interface**, justifiés par l'usage plutôt que par le goût ;
- à l'**accessibilité** (navigation au clavier, focus, contrastes, lecteurs d'écran : référentiels
  WCAG / RGAA) ;
- aux **états de l'interface** : chargement, liste vide, erreur ;
- au rendu sur **tablette** autant que sur ordinateur.

Aucune maquette n'est fournie : c'est à vous de proposer. Un croquis ou une capture Figma dans le
README est bienvenu, sans obligation.

## À rendre

- Un lien vers un dépôt Git (GitLab, GitHub) ou une archive, avec l'historique des commits.
- Un `README` qui remplace celui de l'archive (une copie de ce sujet). Nous le lisons avant le débrief
  pour préparer nos questions : écrivez-le pour quelqu'un qui le découvre et dispose de cinq minutes.
  La place est volontairement limitée, à vous de choisir ce qui mérite d'y figurer :
  - comment lancer le projet (les commandes, sans commentaire) ;
  - les **trois** hypothèses qui ont le plus pesé, là où la spécification était muette ;
  - vos **deux ou trois** principaux choix d'interface, et pour qui ils sont faits ;
  - ce que vous avez volontairement laissé de côté, et pourquoi ;
  - ce que vous feriez avec une journée de plus ;
  - comment vous avez utilisé l'IA : ce que vous avez délégué, ce que vous avez vérifié vous-même, et
    **une** décision prise contre une proposition de l'outil, la plus marquante ;
  - le temps d'attention que vous y avez consacré, et en combien de sessions.
- Si vous avez écrit des fichiers de contexte, des spécifications ou des consignes pour un agent IA
  (`CLAUDE.md`, `AGENTS.md`, prompts…), vous pouvez les joindre. C'est facultatif.

## La suite

Un débrief d'une heure en visio : vous nous présentez vos choix, puis nous faisons évoluer le besoin
ensemble, en direct, sur votre code. Pas de piège : nous voulons voir comment vous raisonnez sur
un sujet que vous connaissez déjà bien. Pendant cette partie, vous pouvez utiliser vos outils
habituels, assistants IA compris, en partageant votre écran.
