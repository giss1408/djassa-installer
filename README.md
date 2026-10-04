# Djassa Admin

The SaaS admin screen for the Djassa team. React + Vite, no UI framework,
talking only to the Djassa API (`../djassa-BE/backend-api`).

| Page | What it does | API |
|---|---|---|
| Commerces | List and search shops, create one (shop, merchant login and payment QR in one go), edit, replace the QR | `/api/admin/venues` |
| Fiche commerce → Photos et vidéos | Upload, reorder and delete a shop's media (10 photos, 3 videos of 60 s) | `/api/admin/venues/{id}/media` |
| Inscriptions | Merchants' own sign-up requests: approve (creates the shop) or refuse | `/api/admin/partner-requests` |
| Récupérations | Lost-number requests: check the old account, approve the transfer or refuse | `/api/admin/recovery-requests` |
| Utilisateurs | Find a number, suspend or restore it, sign it out everywhere, grant or remove merchant/admin access | `/api/admin/users…` |
| Erreurs des apps | Errors reported by the apps and the site, grouped by bug | `/api/admin/client-events` |

## Sign-in

Phone number + SMS code, like the apps, with `app: "admin"`: only a number
holding the admin role gets a session. The access token stays in memory; the
refresh token in `sessionStorage`, so closing the tab ends the session.

The first admin is granted in the database (see the backend's
TECHNICAL-GUIDE.md, Sign-in). Locally, the seeded sample data includes
`07 00 00 00 09` as an admin.

## Commands

```bash
npm install
npm run dev      # http://localhost:5174, API at http://localhost:8000
npm run build
npm run lint
```

Run the backend locally with `OTP_DEV_ECHO=1` and the SMS code is filled in
for you, and with `CORS_ORIGINS=http://localhost:5174`.

## Configuration

| Variable | Meaning |
|---|---|
| `VITE_DJASSA_API_BASE` | The API's base URL, e.g. `https://api.djassa.ci`. Default `http://localhost:8000`. |

The API's `CORS_ORIGINS` must include this site's origin.

## Deploy

[`render.yaml`](render.yaml) deploys it as a free Render static site. Set
`VITE_DJASSA_API_BASE`, add the site's URL to the API's `CORS_ORIGINS`, and
tighten the Content-Security-Policy to the API and media origins once known.
The site is `noindex` and cannot be framed.
