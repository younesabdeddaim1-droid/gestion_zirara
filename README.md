# 🏫 Centre Zirara Connect - Gestion Scolaire & Pédagogique

Application complète de gestion des bénéficiaires, absences, plannings, billets d'entrée et paramétrage du Centre Zirara (Corps Marocain pour l'Éducation et Développement).

---

## 🚀 Options de Déploiement

### Option 1 : Déploiement sur Render (Recommandé - Simple & Gratuit)
1. Rendez-vous sur [Render.com](https://render.com) et connectez-vous avec votre compte GitHub.
2. Cliquez sur **New +** puis **Web Service**.
3. Sélectionnez le dépôt `younesabdeddaim1-droid/gestion_zirara`.
4. Remplissez les réglages suivants :
   - **Name** : `gestion-zirara`
   - **Environment** : `Node`
   - **Branch** : `main`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
5. Dans la section **Environment Variables**, ajoutez les variables listées dans `.env.example` (notamment `DATABASE_URL` pour Supabase et les clés Firebase).
6. Cliquez sur **Create Web Service**. Votre application sera en ligne avec SSL automatique.

---

### Option 2 : Déploiement sur Railway
1. Rendez-vous sur [Railway.app](https://railway.app).
2. Cliquez sur **New Project** > **Deploy from GitHub repo**.
3. Choisissez `gestion_zirara`.
4. Railway détectera automatiquement le `Dockerfile` inclus ou le script Node.
5. Ajoutez vos variables d'environnement dans l'onglet **Variables**.

---

### Option 3 : Déploiement sur Vercel
1. Importez le projet sur [Vercel](https://vercel.com).
2. Vercel détectera le fichier `vercel.json` et déploiera la partie cliente SPA.
3. Configurez les variables `VITE_*` dans les paramètres de Vercel.

---

### Option 4 : Déploiement avec Docker (VPS / Cloud Server)
```bash
# Cloner le dépôt
git clone https://github.com/younesabdeddaim1-droid/gestion_zirara.git
cd gestion_zirara

# Créer votre fichier .env
cp .env.example .env

# Construire et lancer l'image Docker
docker build -t gestion-zirara .
docker run -d -p 3000:3000 --env-file .env gestion-zirara
```

---

## 💻 Développement Local

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement local
npm run dev

# Vérifier la compilation de production
npm run build
```
