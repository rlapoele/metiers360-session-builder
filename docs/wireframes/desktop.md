# Desktop wireframes

Reference width: approximately 1280–1440 CSS pixels.

Desktop exposes filters inline and gives the current draft a persistent right rail. The catalogue remains the primary workspace; secondary information stays in contextual sheets or dedicated saved-session pages.

## Catalogue with current draft

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  MÉTIERS360                 Catalogue        Mes séances                                       Ma séance (3)  [icon/avatar]  │
│                             ─────────                                                                                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                              │
│  Catalogue des vidéos                                                                  ┌──────────────────────────────────┐  │
│  Trouvez les contenus adaptés à votre prochaine séance.                                │  Ma séance                   3   │  │
│                                                                                        │  ──────────────────────────────  │  │
│  ┌──────────────────────────────────────────────────────────┐     ┌───────────────┐    │                                  │  │
│  │ Q  Rechercher un métier ou une vidéo…                    │     │ Rechercher    │    │  1  Découvrir le métier de…      │  │
│  └──────────────────────────────────────────────────────────┘     └───────────────┘    │     08:24                  [×]   │  │
│                                                                                        │                                  │  │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐     ┌──────────┐    │  2  Une journée avec une…        │  │
│  │ Métier         ▾  │ │ Casque VR      ▾  │ │ Public         ▾  │     │ Filtres  │    │     05:12                 [×]    │  │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘     └──────────┘    │                                  │  │
│                                                                                        │  3  Visite d'un atelier          │  │
│  [ Boulangerie  × ]  [ Meta Quest  × ]                         Effacer les filtres     │     06:45                 [×]    │  │
│                                                                                        │                                  │  │
│  24 vidéos trouvées                                                                    │  ──────────────────────────────  │  │
│                                                                                        │  Durée totale            20:21   │  │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐    │                                  │  │
│  │                        │  │                        │  │                        │    │  Réorganiser avec les boutons.   │  │
│  │      THUMBNAIL         │  │      THUMBNAIL         │  │      THUMBNAIL         │    │  ↑ et ↓ présents au survol.      │  │
│  │                  08:24 │  │                  05:12 │  │                  06:45 │    │                                  │  │
│  ├────────────────────────┤  ├────────────────────────┤  ├────────────────────────┤    │  ┌────────────────────────────┐  │  │
│  │ Le métier de           │  │ Une journée dans       │  │ Les gestes essentiels  │    │  │ Vérifier et finaliser      │  │  │
│  │ boulanger              │  │ une boulangerie        │  │ du boulanger           │    │  └────────────────────────────┘  │  │
│  │                        │  │                        │  │                        │    │                                  │  │
│  │ [Boulangerie]          │  │ [Boulangerie]          │  │ [Boulangerie]          │    │  La séance n'est enregistrée     │  │
│  │ Quest 2 · Pico         │  │ Quest 2 · Pico         │  │ Quest 2                │    │  qu'après sa finalisation.       │  │
│  │                        │  │                        │  │                        │    └──────────────────────────────────┘  │
│  │ [✓ Dans ma séance]     │  │ [✓ Dans ma séance]     │  │ [+ Ajouter]            │                                          │
│  └────────────────────────┘  └────────────────────────┘  └────────────────────────┘                                          │
│                                                                                                                              │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐                                          │
│  │      THUMBNAIL         │  │      THUMBNAIL         │  │      THUMBNAIL         │                                          │
│  │                  04:38 │  │                  07:10 │  │                  03:52 │                                          │
│  ├────────────────────────┤  ├────────────────────────┤  ├────────────────────────┤                                          │
│  │ Préparer le pain       │  │ Les coulisses d'une    │  │ Devenir pâtissier      │                                          │
│  │ au quotidien           │  │ boulangerie            │  │                        │                                          │
│  │                        │  │                        │  │                        │                                          │
│  │ [Boulangerie]          │  │ [Boulangerie]          │  │ [Pâtisserie]           │                                          │
│  │ Quest 2                │  │ Pico · HTC Vive        │  │ Quest 2 · Pico         │                                          │
│  │                        │  │                        │  │                        │                                          │
│  │ [+ Ajouter]            │  │ [+ Ajouter]            │  │ [+ Ajouter]            │                                          │
│  └────────────────────────┘  └────────────────────────┘  └────────────────────────┘                                          │
│                                                                                                                              │
│                [← Précédent]        Page 1 sur 4        [Suivant →]                                                          │
│                                                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

```

The draft panel is sticky and approximately 320–400px wide.
Avoid adding a permanent left filter rail as well; two competing sidebars would squeeze the catalogue.

## Video details — right sheet

Opening video details overlays the current-draft rail and part of the catalogue. The draft remains preserved; closing returns focus and scroll position to the triggering card.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  MÉTIERS360                 Catalogue        Mes séances                                       Ma séance (3)  [icon/avatar]  │
│                             ─────────                                                                                        │
├─────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────┤
│                                                                         │  Détails de la vidéo                   [ Fermer ]  │
│  Catalogue des vidéos                                                   ├────────────────────────────────────────────────────┤
│                                                                         │                                                    │
│  ┌──────────────────────────────────────────────┐  ┌──────────────┐     │  ┌──────────────────────────────────────────────┐  │
│  │ Q Rechercher une vidéo…                      │  │ Rechercher   │     │  │                                              │  │
│  └──────────────────────────────────────────────┘  └──────────────┘     │  │                  THUMBNAIL                   │  │
│                                                                         │  │                                              │  │
│  [ Métier ▾ ]  [ Casque ▾ ]  [ Public ▾ ]                               │  └──────────────────────────────────────────────┘  │
│                                                                         │                                                    │
│  ┌──────────────────────┐  ┌──────────────────────┐                     │  Une journée avec Omar, jardinier municipal        │
│  │                      │  │                      │                     │  07 min 35 s                                       │
│  │      THUMBNAIL       │  │      THUMBNAIL       │                     │                                                    │
│  │                      │  │                      │                     │  Immersion aux côtés d'Omar : les débuts dans      │
│  ├──────────────────────┤  ├──────────────────────┤                     │  le métier.                                        │
│  │ Le métier de…        │  │ Une journée avec…    │                     │                                                    │
│  │ [Boulangerie]        │  │ [Jardinier]          │                     │  ┌──────────────────────────────────────────────┐  │
│  │ [+ Ajouter]          │  │ [Voir les détails]   │                     │  │ ✓ Compatible avec le casque de la séance     │  │
│  └──────────────────────┘  └──────────────────────┘                     │  │   Meta Quest 2                               │  │
│                                                                         │  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────┐  ┌──────────────────────┐                     │                                                    │
│  │                      │  │                      │                     │  MÉTIER                                            │
│  │      THUMBNAIL       │  │      THUMBNAIL       │                     │  Jardinier municipal                               │
│  │                      │  │                      │                     │  ROME A1203                                        │
│  ├──────────────────────┤  ├──────────────────────┤                     │                                                    │
│  │ Les gestes…          │  │ Découvrir…           │                     │  PUBLIC CONSEILLÉ                                  │
│  │ [+ Ajouter]          │  │ [+ Ajouter]          │                     │  Adultes en reconversion                           │
│  └──────────────────────┘  └──────────────────────┘                     │                                                    │
│                                                                         │  CASQUES COMPATIBLES                               │
│                  Catalogue inactif sous l'overlay                       │  [Pico G2 4K] [Pico 4]                             │
│                                                                         │  [Meta Quest 2] [Meta Quest 3]                     │
│                                                                         │                                                    │
│                                                                         │  Publiée le 11 avril 2024                          │
│                                                                         ├────────────────────────────────────────────────────┤
│                                                                         │  [ + Ajouter à ma séance ]                         │
└─────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────┘
```

The sheet is approximately 480–520px wide. Its header and action footer remain visible while the content scrolls.

## Mes séances

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  MÉTIERS360                 Catalogue        Mes séances                                       Ma séance (3)  [icon/avatar]  │
│                                              ───────────                                                                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                              │
│  Mes séances                                                                                         [ + Créer une séance ]  │
│  Retrouvez les séances que vous avez préparées.                                                                              │
│                                                                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Séance en cours                                                                                                       │  │
│  │                                                                                                                        │  │
│  │  3 vidéos  ·  20 min 21 s                           Non enregistrée                         [ Continuer ma séance → ]  │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                                              │
│  6 séances enregistrées                                                                                                      │
│                                                                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Découverte des métiers de bouche                                                                                      │  │
│  │  Créée le 20 octobre 2026                                                                                              │  │
│  │                                                                                                                        │  │
│  │  5 vidéos              34 min              Meta Quest 2                                               [ Consulter → ]  │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Orientation — classe de troisième                                                                                     │  │
│  │  Créée le 16 octobre 2026                                                                                              │  │
│  │                                                                                                                        │  │
│  │  8 vidéos              52 min              Pico 4                                                     [ Consulter → ]  │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Métiers de la santé                                                                                                   │  │
│  │  Créée le 8 octobre 2026                                                                                               │  │
│  │                                                                                                                        │  │
│  │  4 vidéos              27 min              Casque non renseigné                                       [ Consulter → ]  │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Artisanat et savoir-faire                                                                                             │  │
│  │  Créée le 2 octobre 2026                                                                                               │  │
│  │                                                                                                                        │  │
│  │  6 vidéos              41 min              Meta Quest 2                                               [ Consulter → ]  │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Use compact horizontal rows rather than image cards: users are retrieving a named saved object, not discovering visual content.

## Saved-session details

This is a dedicated read-only route at `/sessions/[id]`. The programme occupies the main column and the summary remains visible in a sticky side panel.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  MÉTIERS360                 Catalogue        Mes séances                                       Ma séance (3)  [icon/avatar]  │
│                                              ───────────                                                                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                              │
│  ← Retour à mes séances                                                                                                      │
│                                                                                                                              │
│  Découverte des métiers de bouche                                                                                            │
│  Créée le 20 octobre 2026                                                                                                    │
│                                                                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │                                                                                  │  │  Résumé de la séance             │  │
│  │  Programme de la séance                                                          │  │                                  │  │
│  │  Les vidéos seront présentées dans cet ordre.                                    │  │  Nombre de vidéos                │  │
│  │                                                                                  │  │  5                               │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │  │                                  │  │
│  │  │                                                                            │  │  │  Durée totale                    │  │
│  │  │  1    ┌──────────────────┐   Le métier de boulanger              08:24     │  │  │  34 min                          │  │
│  │  │       │                  │                                                 │  │  │                                  │  │
│  │  │       │    MINIATURE     │   Boulangerie                                   │  │  │  Casque sélectionné              │  │
│  │  │       │                  │   Quest 2 · Pico                                │  │  │  Meta Quest 2                    │  │
│  │  │       └──────────────────┘                                                 │  │  │                                  │  │
│  │  └────────────────────────────────────────────────────────────────────────────┘  │  │  Créée le                        │  │
│  │                                                                                  │  │  20 octobre 2026                 │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │  │                                  │  │
│  │  │                                                                            │  │  └──────────────────────────────────┘  │
│  │  │  2    ┌──────────────────┐   Une journée dans une boulangerie    05:12     │  │                                        │
│  │  │       │                  │                                                 │  │                                        │
│  │  │       │    MINIATURE     │   Boulangerie                                   │  │                                        │
│  │  │       │                  │   Quest 2 · Pico                                │  │                                        │
│  │  │       └──────────────────┘                                                 │  │                                        │
│  │  └────────────────────────────────────────────────────────────────────────────┘  │                                        │
│  │                                                                                  │                                        │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │                                        │
│  │  │                                                                            │  │                                        │
│  │  │  3    ┌──────────────────┐   Les gestes essentiels du boulanger  06:45     │  │                                        │
│  │  │       │                  │                                                 │  │                                        │
│  │  │       │    MINIATURE     │   Boulangerie                                   │  │                                        │
│  │  │       │                  │   Quest 2                                       │  │                                        │
│  │  │       └──────────────────┘                                                 │  │                                        │
│  │  └────────────────────────────────────────────────────────────────────────────┘  │                                        │
│  │                                                                                  │                                        │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │                                        │
│  │  │                                                                            │  │                                        │
│  │  │  4    ┌──────────────────┐   Préparer le pain au quotidien       04:38     │  │                                        │
│  │  │       │                  │                                                 │  │                                        │
│  │  │       │    MINIATURE     │   Boulangerie                                   │  │                                        │
│  │  │       │                  │   Quest 2                                       │  │                                        │
│  │  │       └──────────────────┘                                                 │  │                                        │
│  │  └────────────────────────────────────────────────────────────────────────────┘  │                                        │
│  │                                                                                  │                                        │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │                                        │
│  │  │                                                                            │  │                                        │
│  │  │  5    ┌──────────────────┐   Les coulisses d'une boulangerie     09:01     │  │                                        │
│  │  │       │                  │                                                 │  │                                        │
│  │  │       │    MINIATURE     │   Boulangerie                                   │  │                                        │
│  │  │       │                  │   Quest 2 · Pico                                │  │                                        │
│  │  │       └──────────────────┘                                                 │  │                                        │
│  │  └────────────────────────────────────────────────────────────────────────────┘  │                                        │
│  │                                                                                  │                                        │
│  └──────────────────────────────────────────────────────────────────────────────────┘                                        │
│                                                                                                                              │
│  ← Retour à mes séances                                                                                                      │
│                                                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

No edit/delete/duplicate controls are included because the supplied API exposes none of those operations.
