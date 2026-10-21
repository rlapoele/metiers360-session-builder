# Mobile wireframes

Reference width: approximately 375–430 CSS pixels.

These diagrams define hierarchy, content priority and responsive behaviour. They are not pixel specifications. Mobile is the base layout from which tablet and desktop progressively expand.

## Global mobile shell

- Logo and current-draft trigger share the first header row.
- `Catalogue` and `Mes séances` remain visible in a second navigation row; no hamburger is required for two destinations.
- The active destination has a visible indicator and `aria-current="page"`.
- `Ma séance (n)` opens the full-screen draft surface.

## Catalogue

```text
┌──────────────────────────────────────────┐
│  MÉTIERS360              Ma séance (3)   │
├──────────────────────────────────────────┤
│  Catalogue              Mes séances      │
│  ─────────                               │
├──────────────────────────────────────────┤
│                                          │
│  Catalogue des vidéos                    │
│  Trouvez les contenus adaptés à votre    │
│  prochaine séance.                       │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Q Rechercher une vidéo…            │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─────────────────┐                     │
│  │ = Filtres (2)   │   24 vidéos         │
│  └─────────────────┘                     │
│                                          │
│  [ Boulangerie × ]  [ Quest 2 × ]        │
│  Effacer les filtres                     │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │             THUMBNAIL              │  │
│  │                             08:24  │  │
│  ├────────────────────────────────────┤  │
│  │ Le métier de boulanger             │  │
│  │                                    │  │
│  │ [Boulangerie]                      │  │
│  │ Quest 2 · Pico                     │  │
│  │                                    │  │
│  │ [ ✓ Dans ma séance ]               │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │             THUMBNAIL              │  │
│  │                             05:12  │  │
│  ├────────────────────────────────────┤  │
│  │ Une journée dans une boulangerie   │  │
│  │                                    │  │
│  │ [Boulangerie]                      │  │
│  │ Quest 2 · Pico                     │  │
│  │                                    │  │
│  │ [ ✓ Dans ma séance ]               │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │             THUMBNAIL              │  │
│  │                             06:45  │  │
│  ├────────────────────────────────────┤  │
│  │ Les gestes essentiels du boulanger │  │
│  │                                    │  │
│  │ [Boulangerie]                      │  │
│  │ Quest 2                            │  │
│  │                                    │  │
│  │ [ + Ajouter à ma séance ]          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [ ← ]         Page 1 sur 4       [ → ]  │
│                                          │
├──────────────────────────────────────────┤
│  Ma séance                               │
│  3 vidéos · 20 min      [ Consulter → ]  │
└──────────────────────────────────────────┘
```

Behaviour:

- The search submits from the keyboard; a redundant separate search button is unnecessary.
- Catalogue cards are one column and expose only decision-critical metadata.
- The bottom draft summary is sticky. The scroll container receives enough bottom padding that it never covers a card or pagination.
- The title/details link and add/remove control are separate interactive targets.
- Missing thumbnails retain the 16:9 space and show an intentional fallback.

## Filters — full-screen sheet

```text

┌──────────────────────────────────────────┐
│  Filtres                      [ Fermer ] │
├──────────────────────────────────────────┤
│                                          │
│  Métier                                  │
│  ┌────────────────────────────────────┐  │
│  │ Boulangerie                    ▾   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Casque VR                               │
│  ┌────────────────────────────────────┐  │
│  │ Meta Quest 2                   ▾   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Public                                  │
│  ┌────────────────────────────────────┐  │
│  │ Tous les publics               ▾   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [ Réinitialiser les filtres ]           │
│                                          │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│  [ Afficher les 24 vidéos ]              │
└──────────────────────────────────────────┘
```

Changes are staged inside the sheet and committed with `Afficher les n vidéos`. Closing without applying preserves the previous URL filters.

## Video details — full-screen sheet

The catalogue and its scroll position remain mounted underneath this contextual surface.

```text
┌──────────────────────────────────────────┐
│  Détails de la vidéo         [ Fermer ]  │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │             THUMBNAIL              │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Une journée avec Omar,                  │
│  jardinier municipal                     │
│                                          │
│  07 min 35 s                             │
│                                          │
│  Immersion aux côtés d'Omar : les        │
│  débuts dans le métier.                  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ✓ Compatible avec le casque        │  │
│  │   de la séance : Meta Quest 2      │  │
│  └────────────────────────────────────┘  │
│                                          │
│  MÉTIER                                  │
│  Jardinier municipal                     │
│  ROME A1203                              │
│                                          │
│  PUBLIC CONSEILLÉ                        │
│  Adulte en reconversion                  │
│                                          │
│  CASQUES COMPATIBLES                     │
│  [Pico G2 4K]                            │
│  [Pico 4]                                │
│  [Meta Quest 2]                          │
│  [Meta Quest 3]                          │
│                                          │
│  Publiée le 11 avril 2024                │
│                                          │
├──────────────────────────────────────────┤
│  [ + Ajouter à ma séance ]               │
└──────────────────────────────────────────┘
```

The header and action footer are sticky while the content scrolls. If no draft headset is selected, omit the compatibility callout. If the video is already selected, expose its selected state and a clearly secondary remove action.

## Current draft — full-screen sheet

```text
┌──────────────────────────────────────────┐
│  Ma séance                   [ Fermer ]  │
│  3 vidéos · 20 min 21 s                  │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 1  Le métier de boulanger          │  │
│  │    08 min 24 s                     │  │
│  │                                    │  │
│  │    [ Descendre ]      [ Retirer ]  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 2  Une journée en boulangerie      │  │
│  │    05 min 12 s                     │  │
│  │                                    │  │
│  │    [ Monter ] [ Descendre ]        │  │
│  │                       [ Retirer ]  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 3  Visite d'un atelier             │  │
│  │    06 min 45 s                     │  │
│  │                                    │  │
│  │    [ Monter ]         [ Retirer ]  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Durée totale              20 min 21 s   │
│                                          │
├──────────────────────────────────────────┤
│  [ Vérifier et finaliser la séance ]     │
└──────────────────────────────────────────┘
```

The finalisation step collects the required name and optional headset, repeats the ordered summary and presents compatibility warnings before saving. A failed save keeps this entire draft intact.

## Mes séances

```text
┌──────────────────────────────────────────┐
│  MÉTIERS360              Ma séance (3)   │
├──────────────────────────────────────────┤
│  Catalogue              Mes séances      │
│                         ───────────      │
├──────────────────────────────────────────┤
│                                          │
│  Mes séances                             │
│  Retrouvez les séances que vous avez     │
│  préparées.                              │
│                                          │
│  [ + Créer une nouvelle séance ]         │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ SÉANCE EN COURS                    │  │
│  │                                    │  │
│  │ 3 vidéos · 20 min 21 s             │  │
│  │ Non enregistrée                    │  │
│  │                                    │  │
│  │ [ Continuer ma séance → ]          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  6 séances enregistrées                  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Découverte des métiers de bouche   │  │
│  │ Créée le 20 octobre 2026           │  │
│  │                                    │  │
│  │ 5 vidéos · 34 min                  │  │
│  │ Meta Quest 2                       │  │
│  │                                    │  │
│  │ [ Consulter la séance → ]          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Orientation — classe de troisième  │  │
│  │ Créée le 16 octobre 2026           │  │
│  │                                    │  │
│  │ 8 vidéos · 52 min                  │  │
│  │ Pico 4                             │  │
│  │                                    │  │
│  │ [ Consulter la séance → ]          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Métiers de la santé                │  │
│  │ Créée le 8 octobre 2026            │  │
│  │                                    │  │
│  │ 4 vidéos · 27 min                  │  │
│  │ Casque non renseigné               │  │
│  │                                    │  │
│  │ [ Consulter la séance → ]          │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

If a draft exists, `Créer une nouvelle séance` must not silently erase it. Offer to continue it or explicitly replace it.

## Saved-session details

This is a dedicated page, not a modal.

```text
┌──────────────────────────────────────────┐
│  MÉTIERS360              Ma séance (3)   │
├──────────────────────────────────────────┤
│  Catalogue              Mes séances      │
├──────────────────────────────────────────┤
│                                          │
│  ← Retour à mes séances                  │
│                                          │
│  Découverte des métiers de bouche        │
│  Créée le 20 octobre 2026                │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 5 vidéos                           │  │
│  │ 34 min                             │  │
│  │ Casque : Meta Quest 2              │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Programme de la séance                  │
│  Les vidéos seront présentées dans cet   │
│  ordre.                                  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 1                                  │  │
│  │ ┌────────────┐                     │  │
│  │ │ MINIATURE  │  Le métier de       │  │
│  │ │            │  boulanger          │  │
│  │ └────────────┘  08 min 24 s        │  │
│  │                 Boulangerie        │  │
│  │                 Quest 2 · Pico     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 2                                  │  │
│  │ ┌────────────┐                     │  │
│  │ │ MINIATURE  │  Une journée dans   │  │
│  │ │            │  une boulangerie    │  │
│  │ └────────────┘  05 min 12 s        │  │
│  │                 Boulangerie        │  │
│  │                 Quest 2 · Pico     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 3                                  │  │
│  │ ┌────────────┐                     │  │
│  │ │ MINIATURE  │  Les gestes         │  │
│  │ │            │  essentiels         │  │
│  │ └────────────┘  06 min 45 s        │  │
│  │                 Boulangerie        │  │
│  │                 Quest 2            │  │
│  └────────────────────────────────────┘  │
│                                          │
│              …remaining videos…          │
│                                          │
│  ← Retour à mes séances                  │
│                                          │
└──────────────────────────────────────────┘
```

The saved session is read-only because the API has no update/delete endpoints. The full implementation renders every ordered video; the ellipsis only keeps this reference concise.
