# API du catalogue de vidéos

Serveur simulant l'API du catalogue : vidéos 360°, métiers du référentiel ROME 4.0, modèles de casques,
publics conseillés, et enregistrement des séances.

## Démarrer

Avec Node.js 20 ou plus, sans dépendance à installer :

```bash
npm start
curl 'http://localhost:4000/videos?per_page=2'
```

Ou avec Docker :

```bash
docker build -t catalogue-api .
docker run --rm -p 4000:4000 catalogue-api
```

L'API écoute sur `http://localhost:4000` (variable `PORT` pour changer de port). Les en-têtes CORS
autorisent les appels depuis n'importe quelle origine, par exemple un serveur de développement Vite.

Les séances enregistrées sont conservées en mémoire : elles sont perdues au redémarrage du serveur.

## Conventions

- Réponses en JSON. Les listes sont dans `data`.
- Les listes paginées acceptent `page` (défaut `1`) et `per_page` (défaut `24`, maximum `100`), et
  renvoient `meta` : `{ "page", "per_page", "total", "total_pages" }`.
- Les durées sont en secondes.
- Erreurs : `{ "error": "<code>", "message": "…" }`, avec `details` pour les erreurs de validation.

| Code | Cas |
|---|---|
| `400` | Paramètre ou corps JSON invalide. |
| `404` | Ressource inexistante. |
| `422` | Données de séance invalides. |
| `5xx` | Erreur du service. |

## Vidéos

### `GET /videos`

Liste paginée des vidéos, par identifiant croissant.

| Paramètre | Description |
|---|---|
| `q` | Texte recherché dans le titre (insensible à la casse). |
| `job` | Code ROME : vidéos rattachées à ce métier. |
| `headset` | Identifiant de casque : vidéos compatibles avec ce modèle. |
| `audience` | Identifiant de public : vidéos conseillées pour ce public. |
| `page`, `per_page` | Pagination. |

```json
{
  "data": [
    {
      "id": "vid_001",
      "title": "Une journée avec Omar, jardinier municipal",
      "description": "Immersion aux côtés d'Omar : les débuts dans le métier.",
      "duration_seconds": 455,
      "jobs": ["A1203"],
      "audiences": ["adultes-reconversion"],
      "compatible_headsets": ["pico-g2-4k", "pico-4", "meta-quest-2", "meta-quest-3"],
      "thumbnail_url": "http://localhost:4000/thumbnails/vid_001.svg",
      "published_at": "2024-04-11"
    }
  ],
  "meta": { "page": 1, "per_page": 24, "total": 204, "total_pages": 9 }
}
```

`thumbnail_url` peut valoir `null`.

### `GET /videos/{id}`

Une vidéo, même format qu'un élément de la liste.

## Métiers

### `GET /jobs`

Les métiers du référentiel ROME 4.0 présents dans le catalogue (non paginé).

```json
{
  "data": [
    {
      "code": "I1604",
      "label": "Mécanicien / Mécanicienne automobile",
      "major_domain": { "code": "I", "label": "Installation et Maintenance" },
      "professional_domain": { "code": "I16", "label": "Véhicules, engins, aéronefs" },
      "appellations": ["Garagiste", "Mécanicien / Mécanicienne VL", "…"]
    }
  ],
  "source": "ROME 4.0 version 61 - 26M06, France Travail, Licence Ouverte 2.0"
}
```

- `label` : intitulé de la fiche métier ROME.
- `appellations` : intitulés d'emploi rattachés à la fiche (extrait).

### `GET /jobs/{code}`

Un métier, même format qu'un élément de la liste.

## Casques et publics

### `GET /headsets`

```json
{ "data": [{ "id": "pico-g2-4k", "name": "Pico G2 4K" }, …] }
```

### `GET /audiences`

```json
{ "data": [{ "id": "college", "label": "Collégien·nes" }, …] }
```

## Séances

### `GET /sessions`

Les séances enregistrées, de la plus récente à la plus ancienne (non paginé).

```json
{
  "data": [
    {
      "id": "ses_003",
      "name": "Groupe Garantie jeunes — logistique",
      "video_ids": ["vid_181", "vid_182", "vid_183", "vid_184"],
      "headset_id": null,
      "created_at": "2026-10-08T09:05:00Z",
      "total_duration_seconds": 1318
    }
  ]
}
```

### `GET /sessions/{id}`

Une séance, même format.

### `POST /sessions`

Enregistre une séance. Corps JSON :

```json
{
  "name": "Atelier découverte — 2nde C",
  "video_ids": ["vid_012", "vid_045", "vid_130"],
  "headset_id": "pico-4"
}
```

| Champ | Règle |
|---|---|
| `name` | Obligatoire, 120 caractères au plus. |
| `video_ids` | Obligatoire, de 1 à 30 identifiants de vidéos existantes, dans l'ordre de diffusion. |
| `headset_id` | Facultatif : modèle de casque utilisé pour la séance. |

Réponse `201` : la séance créée, au format de `GET /sessions/{id}`.

Réponse `422` :

```json
{
  "error": "validation_error",
  "message": "Invalid session.",
  "details": [{ "field": "name", "message": "Le nom est obligatoire." }]
}
```

## Vignettes

`GET /thumbnails/{id}.svg` : image de la vignette d'une vidéo (640 × 360).

## Source des données

Les métiers sont extraits du Répertoire opérationnel des métiers et des emplois (ROME 4.0, version 61,
juin 2026) publié par France Travail sous Licence Ouverte 2.0. Les vidéos, titres, personnes et
séances sont fictifs.
