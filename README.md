# BigWatts — Marketplace Énergie Verte 🌱⚡

Plateforme de mise en relation entre prestataires de services d'énergie verte et propriétaires.

## Architecture

```
bigwatts/
├── backend/        Django 4.2 + DRF (API REST)
└── frontend/       React 18 + Vite 5 + Tailwind CSS
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Django 4.2, Django REST Framework 3.14, SimpleJWT |
| Frontend | React 18, Vite 5, Tailwind CSS 3.4, React Router 6 |
| Base de données | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (access 2h / refresh 7d) |
| Icônes | Lucide React |
| Notifications UI | react-hot-toast |

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
| Propriétaire | proprietaire1 | demo1234 |
| Propriétaire | proprietaire2 | demo1234 |

---

## Déploiement gratuit (Free Tier)

### Backend → Render.com

1. Créez un compte sur [render.com](https://render.com)
2. New → Web Service → Connectez votre repo GitHub
3. Settings :
   - **Root Directory** : `backend`
   - **Build Command** : `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - **Start Command** : `gunicorn bigwatts.wsgi:application`
4. Variables d'environnement :
   ```
   DJANGO_SECRET_KEY=<générez-une-clé-longue>
   DJANGO_DEBUG=False
   DJANGO_ALLOWED_HOSTS=votre-app.onrender.com
   DATABASE_URL=<fourni-par-render-postgres>
   CORS_ALLOWED_ORIGINS=https://votre-frontend.vercel.app
   ```
5. Ajoutez un PostgreSQL gratuit dans Render Dashboard

### Frontend → Vercel

1. Créez un compte sur [vercel.com](https://vercel.com)
2. Import project → Sélectionnez le repo
3. Settings :
   - **Root Directory** : `frontend`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
4. Variables d'environnement :
   ```
   VITE_API_URL=https://votre-backend.onrender.com
   ```
5. Ajoutez un fichier `vercel.json` dans `frontend/` (déjà créé)

### Alternatives gratuites

| Service | Backend | Frontend | DB |
|---------|---------|----------|----|
| Render | ✅ Web Service | ✅ Static Site | ✅ PostgreSQL |
| Railway | ✅ | ✅ | ✅ |
| Vercel | ❌ | ✅ | ❌ |
| Netlify | ❌ | ✅ | ❌ |
| Supabase | ❌ | ❌ | ✅ PostgreSQL |
| Neon | ❌ | ❌ | ✅ PostgreSQL |

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
