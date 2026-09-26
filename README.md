# 🏫 Centre Zirara Connect - Gestion Scolaire & Pédagogique

Application complète de gestion des bénéficiaires, absences, plannings, billets d'entrée et paramétrage du Centre Zirara.

---

## 🚀 Déploiement Rapide

### Option A : Déploiement sur Render (Recommandé - Full Stack)
1. Créez un nouveau **Web Service** sur [Render.com](https://render.com).
2. Connectez ce dépôt GitHub.
3. Configurez les options suivantes :
   - **Environment** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
4. Ajoutez vos variables d'environnement (copiées depuis `.env.example`).
5. Cliquez sur **Deploy**.

---

### Option B : Déploiement sur Railway ou VPS (Docker)
Un Dockerfile prêt à l'emploi est inclus dans le dépôt :
```bash
docker build -t zirara-connect .
docker run -d -p 3000:3000 zirara-connect
```

---

## 💻 Développement Local

```bash
# Installation des dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Tester la compilation de production
npm run build
```
