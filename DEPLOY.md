# Déploiement sur Render

## Prérequis

- Compte Render (https://render.com)
- Repository Git (GitHub, GitLab, ou Bitbucket)

## Étapes de déploiement

### 1. Pousser le code sur Git

```bash
git add .
git commit -m "feat: migration vers front autonome avec backend S3"
git push origin main
```

### 2. Créer les services sur Render

#### Option A : Via Blueprint (recommandé)

1. Allez sur https://dashboard.render.com
2. Cliquez sur **"New"** → **"Blueprint"**
3. Connectez votre repository Git
4. Render détectera automatiquement le fichier `render.yaml`
5. Cliquez sur **"Apply"**

#### Option B : Manuellement

Créez les deux services séparément via le dashboard Render.

### 3. Configurer les variables d'environnement

Après le premier déploiement, configurez les variables marquées `sync: false` :

#### Backend S3 (`audit-sde-s3-backend`)

| Variable | Valeur |
|----------|--------|
| `AWS_ACCESS_KEY_ID` | Votre clé AWS |
| `AWS_SECRET_ACCESS_KEY` | Votre secret AWS |
| `ALLOWED_ORIGINS` | `https://audit-sde-frontend.onrender.com` (URL du frontend) |

#### Frontend (`audit-sde-frontend`)

| Variable | Valeur |
|----------|--------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyCA4KRvQ1RYwkRXURdbYf1iFWWsa2a_U9M` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `896473570568` |
| `VITE_FIREBASE_APP_ID` | `1:896473570568:web:8545abd1db504cc3a5a0bd` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-KMPNSQ2C4M` |
| `VITE_S3_BACKEND_URL` | `https://audit-sde-s3-backend.onrender.com` (URL du backend) |

### 4. Redéployer après configuration

Après avoir configuré les variables :
1. Allez dans chaque service
2. Cliquez sur **"Manual Deploy"** → **"Deploy latest commit"**

### 5. Tester

Ouvrez : `https://audit-sde-frontend.onrender.com/audit?id=VOTRE_AUDIT_ID`

## URLs des services (après déploiement)

| Service | URL |
|---------|-----|
| Frontend | `https://audit-sde-frontend.onrender.com` |
| Backend S3 | `https://audit-sde-s3-backend.onrender.com` |
| Health Check | `https://audit-sde-s3-backend.onrender.com/health` |

## Intégration Retool

Dans Retool, remplacez le custom component par :

### Option 1 : Iframe
```html
<iframe
  src="https://audit-sde-frontend.onrender.com/audit?id={{audit.id}}"
  width="100%"
  height="800px"
  style="border: none;"
/>
```

### Option 2 : Lien externe
```javascript
// Dans un bouton Retool
utils.openUrl(`https://audit-sde-frontend.onrender.com/audit?id=${audit.id}`, '_blank')
```

## Domaine personnalisé (optionnel)

1. Dans Render Dashboard → Service → Settings → Custom Domains
2. Ajoutez votre domaine (ex: `audit.votre-domaine.com`)
3. Configurez les DNS selon les instructions Render
4. Mettez à jour `ALLOWED_ORIGINS` dans le backend

## Troubleshooting

### Le backend ne démarre pas
- Vérifiez les credentials AWS dans les variables d'environnement
- Consultez les logs dans Render Dashboard

### Les images ne s'affichent pas
- Vérifiez que `VITE_S3_BACKEND_URL` pointe vers le bon backend
- Vérifiez que `ALLOWED_ORIGINS` inclut l'URL du frontend
- Consultez les logs du backend pour les erreurs CORS

### Erreur Firebase
- Vérifiez toutes les variables `VITE_FIREBASE_*`
- Assurez-vous que le projet Firebase autorise le domaine Render

## Coûts

Avec le plan **Free** de Render :
- Le backend "dort" après 15 min d'inactivité
- Premier chargement plus lent (~30s de spin-up)
- 750h/mois de temps de calcul gratuit

Pour un usage production, considérez le plan **Starter** ($7/mois par service).
