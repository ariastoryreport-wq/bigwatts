# GitHub Actions CI/CD Setup

Your CI/CD workflows are now configured. Here's what runs automatically:

## ✅ What's Automated

### Testing (every PR & push)
- Backend: Runs Django tests against a test PostgreSQL database
- Frontend: Runs build & linting (add tests later if needed)

### Deployment (push to main only)
- **Frontend**: Vercel auto-deploys (already native integration)
- **Backend**: Render auto-deploys (requires 1-time setup below)

---

## 🔧 Setup Required (One-Time)

### 1️⃣ Vercel Integration (Frontend)
Vercel's native GitHub integration auto-deploys on push to main—**no action needed** if you already connected your repo in the Vercel dashboard.

If not connected yet:
1. Go to [vercel.com](https://vercel.com)
2. Select your project → Settings → Git
3. Connect your GitHub repo
4. Set "Production Branch" to `main`

### 2️⃣ Render Integration (Backend) — Choose ONE

#### **Option A: Native GitHub Integration (Easier)**
1. Go to [render.com](https://render.com)
2. Select your web service
3. Go to Settings → GitHub
4. Connect your GitHub repo
5. Set "Branch" to `main`
6. Render auto-deploys on push to main

#### **Option B: Deploy Hook (If Option A doesn't work)**
1. Go to your Render service → Settings
2. Scroll to "Deploy Hook"
3. Copy the deploy hook URL
4. Go to GitHub repo → Settings → Secrets and variables → Actions
5. Add a new secret named `RENDER_DEPLOY_HOOK` and paste the URL
6. GitHub Actions will trigger Render deploy on each push to main

---

## 📋 Workflow Files Created

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/test.yml` | Every PR & push | Run backend tests + frontend build |
| `.github/workflows/deploy.yml` | Push to `main` only | Trigger Render redeployment |

---

## 🔄 Your New Workflow

1. **Create feature branch**: `git checkout -b feature/your-feature`
2. **Make changes & push**: `git push origin feature/your-feature`
3. **Tests run automatically** ✅ (see Actions tab)
4. **Create pull request** on GitHub
5. **Review** your changes  
6. **Merge to main** when ready
7. **Auto-deploys** to Vercel + Render 🚀

---

## 📝 Next Steps

- Add `npm run lint` script to `frontend/package.json` if missing
- Add more backend tests as your codebase grows
- Monitor GitHub Actions tab for any failures
- Check Vercel & Render dashboards for deployment logs

---

## 🆘 Troubleshooting

**Tests failing locally?**
```bash
# Backend
cd backend
python manage.py migrate --settings=bigwatts.settings
python manage.py test

# Frontend
cd frontend
npm run build
```

**Deploy not triggering?**
- Verify secrets are set (GitHub → Repo Settings → Secrets)
- Check GitHub Actions tab for workflow logs
- Ensure you pushed to `main` branch (not `develop`)
