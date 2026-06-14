# ⭐ Rockstar France Bot

## 📖 Présentation

Rockstar France Bot est un bot Discord développé pour automatiser la gestion des partenariats du serveur Rockstar France.

Le système permet de recevoir des demandes depuis un formulaire web, de les envoyer automatiquement dans Discord, puis de les traiter grâce à des boutons de validation ou de refus.

L'objectif est de simplifier entièrement la gestion des partenariats tout en conservant un suivi propre et professionnel.

---

# 🚀 Fonctionnalités

## 🤝 Gestion des partenariats

- Réception automatique des demandes depuis le site web
- Intégration via Webhook Make
- Publication automatique dans Discord
- Boutons d'action pour le staff
- Validation rapide des demandes
- Refus rapide des demandes
- Archivage des partenariats validés

---

## ✅ Validation automatique

Lorsqu'un membre du staff valide un partenariat :

- Le message est mis à jour automatiquement
- Le statut passe en "Partenariat accepté"
- Le partenariat est publié dans le salon dédié
- Le rôle Partenaire est attribué automatiquement
- Un message privé est envoyé au responsable
- Une trace est enregistrée dans les rapports staff

---

## ❌ Refus automatique

Lorsqu'un membre du staff refuse un partenariat :

- Le message est verrouillé
- Le statut passe en "Partenariat refusé"
- Un message privé est envoyé au responsable
- Une trace est enregistrée dans les rapports staff

---

# 🌐 Architecture

```text
Site Web
    │
    ▼
Formulaire de partenariat
    │
    ▼
Webhook Make
    │
    ▼
Discord
    │
    ├── Salon Partenariats
    ├── Salon Validés
    ├── Salon Rapports
    └── Messages Privés
```

---

# 🛠 Technologies utilisées

## Discord

- Discord.js v14
- Buttons
- Embeds
- Roles
- Direct Messages

## Backend

- Node.js
- Railway

## Automatisation

- Make.com
- Webhooks

## Hébergement

- GitHub
- Railway

---

# 📋 Informations récupérées

Le formulaire transmet automatiquement :

- ID Discord
- Pseudo Discord
- Type de profil
- Plateforme
- Nombre de membres
- Nombre de viewers
- Motivation
- Proposition
- Lien du serveur ou de la chaîne

---

# 🔐 Sécurité

Le système vérifie :

- La présence d'un ID Discord valide
- L'existence du membre sur le serveur
- Les permissions du bot
- Les rôles disponibles
- Les salons configurés

Toutes les actions sont enregistrées dans les rapports staff.

---

# 📂 Structure du projet

```text
rockstar-france-bot/
│
├── index.js
├── package.json
├── README.md
│
└── Railway
```

---

# ⚙️ Variables importantes

Les identifiants utilisés dans le projet :

```js
RAPPORTS_CHANNEL_ID
VALIDES_CHANNEL_ID
PARTENAIRE_ROLE_ID
DISCORD_TOKEN
```

---

# 📈 Évolutions prévues

## Version future

- Mise en attente des partenariats
- Historique complet des décisions
- Base de données
- Tableau de bord administrateur
- Liste publique des partenaires
- Statistiques détaillées
- Notifications avancées
- Système de renouvellement

---

# 👨‍💻 Développement

Projet développé pour :

**⭐ Rockstar France**

Communauté Discord dédiée à :

- Grand Theft Auto Online
- GTA VI
- Red Dead Redemption
- Créateurs Rockstar
- Crews GTA
- Streamers Rockstar

---

# 📜 Licence

Projet privé développé pour Rockstar France.

Tous droits réservés.

---

# ⭐ Rockstar France

"Soutenir, rassembler et développer la communauté Rockstar francophone."
