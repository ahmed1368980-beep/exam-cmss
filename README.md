# MERN — Items

Petite application full stack : frontend HTML/CSS/JS natif, API Node.js/Express, base MongoDB Atlas (Mongoose).

## Prérequis
- Node.js 18+ et npm
- Un cluster MongoDB Atlas de test
- Comptes GitHub, Vercel et Railway

## Installation
```bash
cd backend
npm install
cp .env.example .env   # puis renseigner les vraies valeurs (jamais commitées)
```

## Commandes
- `npm start` : démarrage production (`node index.js`)
- `npm run othman` : développement avec nodemon
- Frontend : ouvrir `frontend/index.html` ou servir le dossier (`npx serve frontend`)

## Variables d'environnement (backend)
| Variable | Rôle |
|---|---|
| `MONGODB_URI` | URI de connexion Atlas |
| `PORT` | Port (fourni par la plateforme, repli 3000) |
| `NODE_ENV` | `development` ou `production` |
| `CORS_ORIGINS` | Origines frontend autorisées, séparées par des virgules |

Chaque plateforme (Vercel, Railway) a ses propres variables à configurer séparément.

## Routes API
- `GET /api/health` : état du serveur
- `GET /api/items` : liste des éléments
- `POST /api/items` : crée un élément (`name` obligatoire, `description`, `clientId` optionnel pour l'idempotence)

## Configuration du frontend
Les URL des backends sont centralisées dans `frontend/config.js` (`PRIMARY_API` = Railway, `SECONDARY_API` = Vercel).

## Bascule automatique
`apiRequest` essaie Railway puis Vercel (erreur réseau, délai dépassé via `AbortController`, ou `response.ok` faux). Pour le POST, un `clientId` (UUID) est envoyé et protégé par un index unique côté serveur : une nouvelle tentative ne crée pas de doublon.

Limites : deux backends doublent la configuration à maintenir, et le secours ne marche que s'il est lui aussi correctement configuré et branché sur la même base.

## Déploiement
- Frontend Vercel : dossier racine `frontend/`
- Backend Vercel : dossier racine `backend/` (`vercel.json` fourni)
- Backend Railway : dossier racine `backend/`, commande `npm start`

## Liens
- Frontend Vercel : _à compléter_
- Backend Vercel : _à compléter_ (`/api/health`)
- Backend Railway : _à compléter_ (`/api/health`)
