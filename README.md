# Meta Colab — Plateforme SaaS d'Agents IA pour Facebook & Instagram

**Meta Colab** est une plateforme SaaS complète et prête pour la production permettant aux entreprises, créateurs et agences de déployer des **agents d’intelligence artificielle autonomes** spécialisés dans la stratégie éditoriale, la rédaction de publications et la création visuelle pour leurs **Pages Facebook** et **Comptes Professionnels Instagram**.

---

## 🛡️ Règle Fondamentale de Sécurité & Validation Humaine
> **Aucun contenu n’est publié sans validation explicite de l’utilisateur.**
> Le système intègre un sas de sécurité inviolable : chaque proposition de publication passe obligatoirement par le statut `pending_approval` et exige une action humaine explicite (`POST /api/posts/:id/approve`). Toute modification ultérieure d'un contenu approuvé invalide automatiquement l'approbation précédente et remet le statut en attente de validation.

---

## 🏗️ Architecture Technique

```
meta-colab/
├── server.ts                       # Serveur Express full-stack avec Vite middleware (port 3000)
├── server/
│   ├── types.ts                    # Modèles TypeScript complets (User, Agent, Post, Meta, Plan, etc.)
│   ├── db.ts                       # Stockage MySQL configurable, migration JSON et auto-seeding
│   ├── security.ts                 # Hachage PBKDF2 & Chiffrement AES-256-GCM des tokens et clés
│   ├── middleware.ts               # Authentification sessions, RBAC (SuperAdmin/User), vérification quotas
│   ├── services/
│   │   ├── aiService.ts            # Moteur IA multi-fournisseurs (Gemini, OpenAI, Grok, Ollama)
│   │   ├── metaService.ts          # Intégration Meta Graph API v21.0, OAuth, test diagnostic & publication
│   │   └── schedulerService.ts     # Tâches asynchrones de publication avec verrouillage anti-doublon
│   └── routes/                     # Modules d'API REST sécurisés
│       ├── authRoutes.ts           # Inscription, connexion, profil, sécurité
│       ├── agentRoutes.ts          # CRUD agents, compétences, consignes, historique & rollback
│       ├── socialRoutes.ts         # Connexion Meta, diagnostic permissions, affectation pages
│       ├── calendarRoutes.ts       # Calendriers éditoriaux intelligents & conversion en posts
│       ├── postRoutes.ts           # Studio des publications, rédactions IA, approbations explicites
│       ├── brandRoutes.ts          # Identité visuelle, charte de marque & galerie d'inspiration
│       ├── intelligenceRoutes.ts   # Veille concurrentielle, tendances sectorielles, heures optimales
│       ├── billingRoutes.ts        # Forfaits (Free Test, Starter, Pro, Premium) & checkout sandbox
│       ├── supportRoutes.ts        # Messagerie instantanée utilisateur <-> administration
│       ├── notificationRoutes.ts   # Centre de notifications temps réel
│       └── adminRoutes.ts          # Console Super Administrateur & audit trail
├── src/                            # Frontend React 19 + TypeScript + Tailwind CSS
│   ├── components/                 # Composants UI, aperçus réalistes Facebook & Instagram
│   ├── context/                    # AuthContext, ThemeContext (Light/Dark), I18nContext (FR/EN)
│   └── views/                      # Dashboard, Agents, Meta Connect, Calendar, Posts, Billing, Admin
├── test/
│   └── run-tests.ts                # Suite complète de tests unitaires, d'intégration et de sécurité
└── data/
    └── metacolab_db.json           # Stockage local lorsque MySQL n'est pas configuré
```

---

## 🚀 Déploiement Local

### Prérequis
- **Node.js** v20.x ou supérieure (v22 recommandé)
- **npm** ou **bun**
- Fichier `.env` configuré

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration des variables d'environnement
Copiez le modèle `.env.example` vers `.env` :
```bash
cp .env.example .env
```
Créez d'abord la base MySQL `ia_agent_studio` dans phpMyAdmin, puis renseignez les paramètres de connexion dans `.env` :
```ini
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000
APP_SECRET=votre_cle_secrete_aleatoire_32_caracteres_minimum!
DATABASE_URL=mysql://root:@localhost:3306/ia_agent_studio
GEMINI_API_KEY=votre_cle_gemini_api
```
Adaptez l'utilisateur, le mot de passe, l'hôte et le port à votre installation MySQL. Au démarrage, l'application crée sa table `metacolab_state`. Si `data/metacolab_db.json` existe et que la table est vide, ses données sont migrées automatiquement dans MySQL. Sans URL MySQL, l'application conserve le stockage JSON local.
Si votre configuration utilise déjà `DATABASE_URL=mysql`, elle est également prise en charge : renseignez `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` et `DB_NAME=ia_agent_studio` dans `.env`. Les comptes apparaissent dans la table `users`; le reste des données de l'application reste dans `metacolab_state`.

### 3. Exécution des tests automatisés
```bash
npm test
```
Le script `test/run-tests.ts` valide les règles d'abonnement, le chiffrement AES-256-GCM, la règle de validation humaine obligatoire et l'isolation des données entre clients.

### 4. Lancement du serveur en développement
```bash
npm run dev
```
L'application démarre sur `http://localhost:3000`.

---

## 🔑 Comptes de Démonstration Pré-initialisés

Deux comptes avec mots de passe sécurisés (hachés en PBKDF2) sont générés automatiquement au démarrage :

| Rôle | Adresse Email | Mot de passe initial | Privilèges |
| :--- | :--- | :--- | :--- |
| **Super Administrateur** | `admin@metacolab.io` | `AdminMetaColab2026!` | Accès complet : KPIs, gestion des packs, configuration des clés IA, logs d'audit. |
| **Utilisateur Démo** | `demo@metacolab.io` | `DemoUser2026!` | Entreprise *Atelier Créatif Paris* (Pack Pro actif, agents Sophie & Lucas, pages Meta). |

---

## 🐧 Déploiement sur Serveur Linux (Ubuntu / Debian)

### 1. Préparation du serveur
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. Clonage et compilation
```bash
cd /var/www
sudo git clone https://github.com/votre-compte/meta-colab.git
cd meta-colab
sudo npm ci
sudo npm run build
```

### 3. Configuration Systemd / PM2
Créez un fichier de configuration PM2 `ecosystem.config.cjs` :
```javascript
module.exports = {
  apps: [{
    name: 'meta-colab',
    script: 'server.ts',
    interpreter: 'node_modules/.bin/tsx',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    }
  }]
};
```
Démarrez le service :
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4. Configuration Reverse Proxy Nginx
Créez `/etc/nginx/sites-available/metacolab.conf` :
```nginx
server {
    server_name votre-domaine.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 25M;
    }
}
```
Activez le site et installez le certificat SSL Let's Encrypt :
```bash
sudo ln -s /etc/nginx/sites-available/metacolab.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d votre-domaine.com
```

---

## 🌐 Déploiement sur Hébergement cPanel

Les hébergements mutualisés ou revendeurs cPanel peuvent héberger Meta Colab selon la méthode suivante :

### 1. Prérequis cPanel
- Module **Setup Node.js App** (CloudLinux / cPanel LVE Manager) disponible avec Node.js 20+
- Accès SSH ou terminal web cPanel

### 2. Configuration de l'application Node.js dans cPanel
1. Rendez-vous dans **Setup Node.js App** > **Create Application**.
2. **Node.js version** : Sélectionnez `20.x` ou `22.x`.
3. **Application mode** : `Production`.
4. **Application root** : `/home/nomutilisateur/meta-colab`.
5. **Application URL** : `https://votre-domaine.com`.
6. **Application startup file** : `server.ts` (ou script de démarrage compilé `dist/server.js`).

### 3. Tâches d'arrière-plan sur cPanel (Alternative aux Workers permanents)
Si votre hébergeur cPanel limite les processus d'arrière-plan permanents, le déclenchement de la publication des contenus programmés peut être assuré par une tâche Cron cPanel toutes les minutes :
```bash
# Dans cPanel > Tâches Cron (Cron Jobs) :
* * * * * curl -s -X POST https://votre-domaine.com/api/scheduler/tick -H "Authorization: Bearer VOTRE_CRON_SECRET" > /dev/null 2>&1
```

---

## 📘 Guide de Configuration Meta Graph API (Facebook & Instagram)

Pour connecter vos vraies pages d'entreprise en production :
1. Créez un compte développeur sur [Meta for Developers](https://developers.facebook.com/).
2. Créez une application de type **Business / Entreprise**.
3. Dans **Paramètres de l'application > De base** :
   - Récupérez votre `Identifiant de l'application` (App ID) et `Clé secrète` (App Secret).
   - Renseignez les URL de Politique de confidentialité et Conditions d'utilisation (`https://votre-domaine.com/privacy` et `/terms`).
4. Dans **Facebook Login for Business > Paramètres** :
   - Ajoutez l'URL de redirection OAuth : `https://votre-domaine.com/api/social/oauth/facebook/callback`.
   - Renseignez `META_APP_ID` et `META_APP_SECRET` dans `.env`.
5. Dans **Webhooks** :
   - Ajoutez le webhook Page avec l'URL de rappel `https://votre-domaine.com/api/meta/webhook` et le jeton de vérification défini dans `META_WEBHOOK_VERIFY_TOKEN`.
6. Ajoutez l'URL de suppression des données utilisateur :
   - `https://votre-domaine.com/api/meta/data-deletion` (conforme RGPD et exigences Meta).
7. Demandez les permissions nécessaires lors de la vérification de l'application :
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `business_management`
   - `instagram_basic`
   - `instagram_content_publish`
   - `read_insights`

Après autorisation, l'application récupère le profil Facebook et les Pages accessibles (nom, photo, abonnés ou nombre de mentions J'aime selon les données renvoyées par Meta). Une reconnexion conserve les Pages et les affectations d'agents existantes. Les autorisations Meta nécessaires doivent être activées pour le mode de l'application et accordées par le compte Facebook.

---

## 🧪 Rapport des Tests Exécutés

La suite automatisée `test/run-tests.ts` valide :
- **Unitaire** : Chiffrement AES-256-GCM, salage PBKDF2, rejet systématique de publication non approuvée.
- **Intégration** : Persistance des 4 packs (Free Test, Starter, Pro, Premium), cycle de vie des posts, réinitialisation du statut en cas d'édition.
- **Sécurité** : Isolation multi-tenant stricte, masquage des jetons, protection des données privées.
- **Résultat** : 100% des tests validés avec succès.
