# BigWatts — Marketplace Énergie Verte 🌱⚡

Plateforme de mise en relation entre prestataires de services d'énergie verte et propriétaires.

🔗 **Démo live** : [https://bigwatts.vercel.app](https://bigwatts.vercel.app)

## Architecture

```
bigwatts/
├── backend/        Django 4.2 + DRF (API REST) → Render.com
├── frontend/       React 18 + Vite 5 + Tailwind CSS → Vercel
└── database        PostgreSQL → Neon.tech
```

## Stack technique

| Couche | Technologie | Hébergement |
|--------|-------------|-------------|
| Backend | Django 4.2, Django REST Framework 3.14, SimpleJWT | [Render.com](https://render.com) (Free) |
| Frontend | React 18, Vite 5, Tailwind CSS 3.4, React Router 6 | [Vercel](https://vercel.com) (Free) |
| Base de données | PostgreSQL | [Neon.tech](https://neon.tech) (Free) |
| Auth | JWT (access 2h / refresh 7d) | — |
| Icônes | Lucide React | — |
| Notifications UI | react-hot-toast | — |

---

## Démarrage rapide (développement)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

pip install -r requirements.txt

python manage.py migrate
python seed.py                  # Données de démo

python manage.py runserver
```

Le backend écoute sur `http://localhost:8000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Le frontend écoute sur `http://localhost:5173` (proxy `/api` → backend)

### Comptes de démonstration

| Rôle | Username | Mot de passe |
|------|----------|-------------|
| Admin | admin | admin123 |
| Support (CS) | support | support123 |
| Prestataire | solarpro | demo1234 |
| Prestataire | ecocharge | demo1234 |
| Prestataire | thermexpert | demo1234 |
| Prestataire | isoconfort | demo1234 |
| Prestataire | greenenergy | demo1234 |
| Prestataire | voltamaison | demo1234 |
| Prestataire | eolvert | demo1234 |
| Prestataire | heatpump_pro | demo1234 |
| Propriétaire | alice_leroy | demo1234 |
| Propriétaire | thomas_moreau | demo1234 |
| Propriétaire | camille_duval | demo1234 |
| Propriétaire | emma_lambert | demo1234 |
| Propriétaire | hugo_simon | demo1234 |

### Charger les données de démonstration

```bash
# En local
cd backend
python manage.py load_fixtures

# En production (Render Shell)
python manage.py load_fixtures
```

---

## Déploiement (Free Tier)

Le projet est déployé sur 3 services gratuits :

### 1. Base de données → Neon.tech

1. Créez un compte sur [neon.tech](https://neon.tech)
2. **Create Project** → Nom : `bigwatts`, Region : `EU (Frankfurt)`
3. Copiez la **Connection string** (`postgres://neondb_owner:...@...neon.tech/neondb?sslmode=require`)

### 2. Backend → Render.com

1. Créez un compte sur [render.com](https://render.com)
2. **New** → **Web Service** → Connectez votre repo GitHub
3. Settings :
   - **Root Directory** : `backend`
   - **Dockerfile Path** : `backend/Dockerfile`
   - **Docker Build Context** : `backend/`
4. Variables d'environnement :
   ```
   SECRET_KEY=<générez-un-uuid-ou-clé-longue>
   DEBUG=False
   ALLOWED_HOSTS=votre-app.onrender.com
   DATABASE_URL=<connection-string-de-neon>
   CORS_ALLOWED_ORIGINS=https://votre-frontend.vercel.app
   ```
   > ⚠️ Pas de `/` à la fin de `CORS_ALLOWED_ORIGINS`
5. Le `entrypoint.sh` exécute automatiquement les migrations et collectstatic au démarrage

### 3. Frontend → Vercel

1. Créez un compte sur [vercel.com](https://vercel.com)
2. **Add New Project** → Importez le repo GitHub
3. Settings :
   - **Root Directory** : `frontend`
   - **Framework Preset** : Vite
4. Variable d'environnement :
   ```
   VITE_API_URL=https://votre-backend.onrender.com
   ```
5. Deploy !

### Charger les fixtures en production

Sur Render → **Shell** (si disponible) :
```bash
python manage.py load_fixtures
```

Ou ajoutez `python manage.py load_fixtures` dans `entrypoint.sh` (avant le démarrage Gunicorn) pour un chargement automatique au déploiement.

> 💡 **Note** : Le plan gratuit Render met le service en veille après 15 min d'inactivité. Le premier chargement prend ~30-60 secondes.

---

## Migration VPS / Production

### Docker Compose

```bash
# Construire et démarrer
docker-compose up --build -d

# Appliquer les migrations
docker-compose exec backend python manage.py migrate

# Créer les données de démo
docker-compose exec backend python seed.py
```

### Architecture VPS recommandée

```
Internet → Nginx (reverse proxy + SSL) → Docker
    ├── Frontend (Node static / Nginx)
    ├── Backend (Gunicorn + Django)
    ├── PostgreSQL 15
    └── Redis (optionnel, pour cache/websockets)
```

### Checklist déploiement VPS

- [ ] Ubuntu 22.04 LTS ou Debian 12
- [ ] Docker + Docker Compose installés
- [ ] Nom de domaine pointant vers le VPS
- [ ] Certificat SSL via Let's Encrypt / Certbot
- [ ] Firewall (UFW) : ports 80, 443, 22 uniquement
- [ ] Sauvegardes PostgreSQL automatisées (cron + pg_dump)
- [ ] Monitoring (Uptime Kuma, Grafana ou Netdata)

---

## API Endpoints

### Auth (`/api/auth/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/register/` | Inscription |
| POST | `/login/` | Connexion (retourne JWT) |
| POST | `/logout/` | Déconnexion |
| GET | `/me/` | Profil utilisateur |
| PUT | `/me/update/` | Modifier profil |
| PUT | `/me/password/` | Changer mot de passe |
| PUT | `/me/prestataire-profile/` | Modifier profil prestataire |
| PUT | `/me/proprietaire-profile/` | Modifier profil propriétaire |
| GET | `/users/<id>/` | Profil public |
| GET | `/providers/` | Liste prestataires |
| GET | `/dashboard-stats/` | Stats dashboard |
| GET | `/cs/users/` | [CS] Liste utilisateurs |

### Annonces (`/api/ads/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/categories/` | Catégories de services |
| GET | `/` | Liste annonces (filtres) |
| GET | `/<slug>/` | Détail annonce |
| GET | `/my-ads/` | Mes annonces |
| POST | `/create/` | Créer annonce |
| PUT | `/<slug>/update/` | Modifier annonce |
| DELETE | `/<slug>/delete/` | Supprimer annonce |
| POST | `/quote-request/` | Demander un devis |
| GET | `/my-quotes/` | Mes devis |
| GET | `/received-quotes/` | Devis reçus |
| PUT | `/quote/<id>/respond/` | Répondre à un devis |
| GET | `/cs/ads/` | [CS] Toutes les annonces |

### Messagerie (`/api/messaging/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/conversations/` | Mes conversations |
| GET | `/conversations/<id>/` | Détail conversation |
| GET | `/conversations/<id>/messages/` | Messages |
| POST | `/send/` | Envoyer message |

### Avis (`/api/reviews/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste avis (filtre provider) |
| POST | `/create/` | Créer avis |
| PUT | `/<id>/respond/` | Répondre à un avis |
| GET | `/received/` | Avis reçus |
| GET | `/written/` | Avis écrits |

### Favoris (`/api/favorites/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Mes favoris |
| POST | `/toggle/` | Ajouter/Retirer |
| GET | `/check/` | Vérifier si favori |
| DELETE | `/<id>/` | Supprimer |

### Notifications (`/api/notifications/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Mes notifications |
| GET | `/unread-count/` | Nombre non-lues |
| POST | `/mark-all-read/` | Tout marquer lu |
| POST | `/<id>/mark-read/` | Marquer lu |

### Tickets (`/api/tickets/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/create/` | Créer ticket |
| GET | `/my-tickets/` | Mes tickets |
| GET | `/<id>/` | Détail ticket |
| POST | `/<id>/respond/` | Répondre |
| GET | `/cs/tickets/` | [CS] Tous les tickets |
| PUT | `/cs/tickets/<id>/` | [CS] Modifier ticket |

---

## Fonctionnalités futures

- 💳 Paiement en ligne (Stripe)
- 📅 Calendrier de rendez-vous
- 📍 Géolocalisation et carte interactive
- 📧 Notifications email (SendGrid / Brevo)
- 🔔 Notifications temps réel (WebSocket / Django Channels)
- 📊 Analytics et rapports
- 🏷️ Système de badges / certifications vérifiées
- 📱 Application mobile (React Native)

---

## Licence

Projet privé — Tous droits réservés.
