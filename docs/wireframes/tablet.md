# Tablet wireframes

Reference width: approximately 768–1024 CSS pixels, with portrait tablet as the primary exercise target.

Tablet adds catalogue capacity without adopting the desktop's permanent right rail. Filters, video details and the current draft remain full-height sheets with touch-friendly controls.

## Catalogue

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  MÉTIERS360       Catalogue      Mes séances           Ma séance (3)         │
│                   ─────────                                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Catalogue des vidéos                                                        │
│  Trouvez les contenus adaptés à votre prochaine séance.                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────┐  ┌────────────────┐  │
│  │ Q  Rechercher un métier ou une vidéo…              │  │ Rechercher     │  │
│  └────────────────────────────────────────────────────┘  └────────────────┘  │
│                                                                              │
│  ┌──────────────────┐                                                        │
│  │ =  Filtres (2)   │     24 vidéos trouvées                                 │
│  └──────────────────┘                                                        │
│                                                                              │
│  [ Boulangerie  × ]  [ Meta Quest  × ]                  Tout effacer         │
│                                                                              │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │                                  │  │                                  │  │
│  │            THUMBNAIL             │  │            THUMBNAIL             │  │
│  │                           08:24  │  │                           05:12  │  │
│  ├──────────────────────────────────┤  ├──────────────────────────────────┤  │
│  │ Le métier de boulanger           │  │ Une journée dans une             │  │
│  │                                  │  │ boulangerie                      │  │
│  │ [Boulangerie]                    │  │ [Boulangerie]                    │  │
│  │ Quest 2 · Pico                   │  │ Quest 2 · Pico                   │  │
│  │                                  │  │                                  │  │
│  │ [ ✓ Dans ma séance ]             │  │ [ ✓ Dans ma séance ]             │  │
│  └──────────────────────────────────┘  └──────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │                                  │  │                                  │  │
│  │            THUMBNAIL             │  │            THUMBNAIL             │  │
│  │                           06:45  │  │                           04:38  │  │
│  ├──────────────────────────────────┤  ├──────────────────────────────────┤  │
│  │ Les gestes essentiels            │  │ Préparer le pain                 │  │
│  │ du boulanger                     │  │ au quotidien                     │  │
│  │                                  │  │                                  │  │
│  │ [Boulangerie]                    │  │ [Boulangerie]                    │  │
│  │ Quest 2                          │  │ Quest 2                          │  │
│  │                                  │  │                                  │  │
│  │ [ + Ajouter ]                    │  │ [ + Ajouter ]                    │  │
│  └──────────────────────────────────┘  └──────────────────────────────────┘  │
│                                                                              │
│            [ ← Précédent ]      Page 1 sur 4      [ Suivant → ]              │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  Ma séance                  3 vidéos · 20 min 21 s          [ Consulter → ]  │
└──────────────────────────────────────────────────────────────────────────────┘
```
Portrait uses two columns; a wide landscape tablet may use three if cards remain readable. The bottom draft summary stays sticky because the draft is not given a permanent tablet sidebar.

## Filters — right sheet

```text
┌──────────────────────────────┬───────────────────────────────────────────────┐
│  Catalogue inactive          │  Filtres                           [ Fermer ] │
│                              ├───────────────────────────────────────────────┤
│  Search/results remain       │                                               │
│  visible under the backdrop  │  Métier                                       │
│                              │  ┌─────────────────────────────────────────┐  │
│                              │  │ Boulangerie                         ▾   │  │
│                              │  └─────────────────────────────────────────┘  │
│                              │                                               │
│                              │  Casque VR                                    │
│                              │  ┌─────────────────────────────────────────┐  │
│                              │  │ Meta Quest 2                        ▾   │  │
│                              │  └─────────────────────────────────────────┘  │
│                              │                                               │
│                              │  Public                                       │
│                              │  ┌─────────────────────────────────────────┐  │
│                              │  │ Tous les publics                    ▾   │  │
│                              │  └─────────────────────────────────────────┘  │
│                              │                                               │
│                              │  [ Réinitialiser les filtres ]                │
│                              │                                               │
│                              ├───────────────────────────────────────────────┤
│                              │  [ Afficher les 24 vidéos ]                   │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

On narrower portrait tablets, this sheet may cover the full viewport. Filter selections apply together through the footer action.

## Video details — right sheet

```text

┌──────────────────────────────┬───────────────────────────────────────────────┐
│  Catalogue                   │  Détails de la vidéo              [ Fermer ]  │
│                              ├───────────────────────────────────────────────┤
│  ┌────────────────────────┐  │                                               │
│  │ Q Rechercher…          │  │  ┌─────────────────────────────────────────┐  │
│  └────────────────────────┘  │  │                                         │  │
│                              │  │                THUMBNAIL                │  │
│  [ Filtres (2) ]             │  │                                         │  │
│                              │  └─────────────────────────────────────────┘  │
│  ┌────────────────────────┐  │                                               │
│  │                        │  │  Une journée avec Omar,                       │
│  │       THUMBNAIL        │  │  jardinier municipal                          │
│  │                        │  │                                               │
│  ├────────────────────────┤  │  07 min 35 s                                  │
│  │ Une journée avec…      │  │                                               │
│  │ [Jardinier]            │  │  Immersion aux côtés d'Omar : les débuts      │
│  │ [Voir les détails]     │  │  dans le métier.                              │
│  └────────────────────────┘  │                                               │
│                              │  ┌─────────────────────────────────────────┐  │
│  ┌────────────────────────┐  │  │ ✓ Compatible avec Meta Quest 2          │  │
│  │                        │  │  └─────────────────────────────────────────┘  │
│  │       THUMBNAIL        │  │                                               │
│  │                        │  │  MÉTIER                                       │
│  ├────────────────────────┤  │  Jardinier municipal · ROME A1203             │
│  │ Le métier de…          │  │                                               │
│  │ [+ Ajouter]            │  │  PUBLIC CONSEILLÉ                             │
│  └────────────────────────┘  │  Adultes en reconversion                      │
│                              │                                               │
│  Catalogue inactif           │  CASQUES COMPATIBLES                          │
│                              │  [Pico G2 4K]  [Pico 4]                       │
│                              │  [Meta Quest 2]  [Meta Quest 3]               │
│                              │                                               │
│                              │  Publiée le 11 avril 2024                     │
│                              ├───────────────────────────────────────────────┤
│                              │  [ + Ajouter à ma séance ]                    │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

The close control and action footer stay visible while details scroll. The sheet restores focus to the details trigger when closed.

## Current draft — right sheet

```text
┌──────────────────────────────┬───────────────────────────────────────────────┐
│  Catalogue inactive          │  Ma séance                        [ Fermer ]  │
│                              │  3 vidéos · 20 min 21 s                       │
│                              ├───────────────────────────────────────────────┤
│                              │                                               │
│                              │  1  Le métier de boulanger          08:24     │
│                              │     [ Descendre ]                 [ Retirer ] │
│                              │                                               │
│                              │  2  Une journée en boulangerie       05:12    │
│                              │     [ Monter ] [ Descendre ]      [ Retirer ] │
│                              │                                               │
│                              │  3  Visite d'un atelier              06:45    │
│                              │     [ Monter ]                    [ Retirer ] │
│                              │                                               │
│                              │  ───────────────────────────────────────────  │
│                              │  Durée totale                       20:21     │
│                              │                                               │
│                              ├───────────────────────────────────────────────┤
│                              │  [ Vérifier et finaliser la séance ]          │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

## Mes séances

```text

┌──────────────────────────────────────────────────────────────────────────────┐
│  MÉTIERS360       Catalogue      Mes séances           Ma séance (3)         │
│                                  ───────────                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Mes séances                                                                 │
│  Retrouvez les séances que vous avez préparées.                              │
│                                                                              │
│                                                      [ + Créer une séance ]  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Séance en cours                                                       │  │
│  │                                                                        │  │
│  │  3 vidéos  ·  20 min 21 s                           Non enregistrée    │  │
│  │                                                                        │  │
│  │                                      [ Continuer ma séance → ]         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  6 séances enregistrées                                                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Découverte des métiers de bouche                                      │  │
│  │  Créée le 20 octobre 2026                                              │  │
│  │                                                                        │  │
│  │  5 vidéos        34 min        Meta Quest 2                            │  │
│  │                                                       [ Consulter → ]  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Orientation — classe de troisième                                     │  │
│  │  Créée le 16 octobre 2026                                              │  │
│  │                                                                        │  │
│  │  8 vidéos        52 min        Pico 4                                  │  │
│  │                                                       [ Consulter → ]  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Métiers de la santé                                                   │  │
│  │  Créée le 8 octobre 2026                                               │  │
│  │                                                                        │  │
│  │  4 vidéos        27 min        Casque non renseigné                    │  │
│  │                                                       [ Consulter → ]  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```
Saved sessions stay in one column so titles, metadata and touch targets have predictable reading order.

## Saved-session details

This remains a dedicated page because the ordered programme may contain up to 30 videos.

```text

┌──────────────────────────────────────────────────────────────────────────────┐
│  MÉTIERS360       Catalogue      Mes séances           Ma séance (3)         │
│                                  ───────────                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ← Retour à mes séances                                                      │
│                                                                              │
│  Découverte des métiers de bouche                                            │
│  Créée le 20 octobre 2026                                                    │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐  │
│  │  VIDÉOS              │  │  DURÉE TOTALE        │  │  CASQUE            │  │
│  │  5                   │  │  34 min              │  │  Meta Quest 2      │  │
│  └──────────────────────┘  └──────────────────────┘  └────────────────────┘  │
│                                                                              │
│  Programme de la séance                                                      │
│  Les vidéos seront présentées dans cet ordre.                                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  1    ┌───────────────┐   Le métier de boulanger                       │  │
│  │       │               │                                                │  │
│  │       │   MINIATURE   │   Boulangerie                                  │  │
│  │       │               │   08 min 24 s                                  │  │
│  │       └───────────────┘   Quest 2 · Pico                               │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  2    ┌───────────────┐   Une journée dans une boulangerie             │  │
│  │       │               │                                                │  │
│  │       │   MINIATURE   │   Boulangerie                                  │  │
│  │       │               │   05 min 12 s                                  │  │
│  │       └───────────────┘   Quest 2 · Pico                               │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  3    ┌───────────────┐   Les gestes essentiels du boulanger           │  │
│  │       │               │                                                │  │
│  │       │   MINIATURE   │   Boulangerie                                  │  │
│  │       │               │   06 min 45 s                                  │  │
│  │       └───────────────┘   Quest 2                                      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  4    ┌───────────────┐   Préparer le pain au quotidien                │  │
│  │       │               │                                                │  │
│  │       │   MINIATURE   │   Boulangerie                                  │  │
│  │       │               │   04 min 38 s                                  │  │
│  │       └───────────────┘   Quest 2                                      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  5    ┌───────────────┐   Les coulisses d'une boulangerie              │  │
│  │       │               │                                                │  │
│  │       │   MINIATURE   │   Boulangerie                                  │  │
│  │       │               │   09 min 01 s                                  │  │
│  │       └───────────────┘   Quest 2 · Pico                               │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ← Retour à mes séances                                                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```
