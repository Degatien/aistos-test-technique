# aistos-test-technique

Application web TypeScript de gestion de dettes : import d'un CSV de débiteurs
(`name, email, debtSubject, debtAmount`), consultation de la dette par le débiteur et
paiement via **Stripe en mode test**.

---

## Démarrage

### Prérequis

- [Bun](https://bun.sh) (runtime + package manager)
- Docker (pour PostgreSQL local)

### Lancer le projet

```bash
# 1. Installer les dépendances
bun install

# 2. Démarrer PostgreSQL (docker compose)
docker compose up -d

# 3. Copier la configuration d'environnement
cp .env.example .env
#   → renseigner DATABASE_URL (requis), puis les clés Stripe au moment de la tâche 3

# 4. Appliquer les migrations
bunx prisma migrate dev

# 5. Importer le CSV de débiteurs
bun run import            # utilise debtors.csv par défaut
bun run import mon-fichier.csv   # ou spécifier un chemin explicite

# 6. Démarrer le serveur
bun run dev
```

### Tester

- `/health` → `{"status":"ok"}` (sanity check du serveur)
- `/debtor/:slug` → page débiteur (identité, intitulé, montant, statut, bouton **Payer**)
- Payer → redirection Stripe Checkout (mode test) → statut de la dette mis à jour

---

## Choix d'architecture

### Stack alignée sur la stack de production

Le test est construit sur la **stack de production de l'entreprise** pour démontrer
l'adéquation.

| Domaine | Choix | Notes |
|---|---|---|
| Langage | TypeScript (strict) | |
| Runtime | Bun | Runtime de production de l'entreprise |
| API | REST & tRPC | Standard entreprise |
| Base de données | PostgreSQL + Prisma | Instance locale via Docker |
| Protection des données | AES-256-GCM + HMAC-SHA256 | `name`/`email` chiffrés au repos |
| Parsing CSV | `csv-parse` | Gère correctement champs quotés et lignes vides |
| Stripe | Checkout Session, mode test | Statut mis à jour via webhook + fallback redirect |
| Frontend | React + TanStack + TailwindCSS + Shadcn/ui | Standard entreprise |
| Bundling | Bun (HTML imports) | Pas de Vite — Bun bundle React/CSS nativement |
| Devise | EUR | Montants stockés en euros entiers (`Int`), convertis en cents pour Stripe |

### Modèle de données

- **`Debtor`** — identifié par `emailHash` (HMAC-SHA256 de l'email), PK choisie pour
  permettre un upsert « par ensemble » lors de l'import CSV. `slug` opaque pour l'URL
  publique (`/debtor/:slug`). `name` et `email` chiffrés en AES-256-GCM.
- **`Debt`** — rattachée à un débiteur (FK avec suppression en cascade). `debtAmount`
  en euros entiers (tel que dans le CSV), converti en cents (`* 100`) pour Stripe.
  Un débiteur peut avoir **plusieurs dettes**.

### Hypothèses

- Un débiteur est identifié par un **slug** opaque dans l'URL (`/debtor/:slug`).
- Un email = un débiteur ; un débiteur peut avoir plusieurs dettes.
- `name` et `email` sont chiffrés au repos (AES-256-GCM) avec une clé depuis `.env`;
  `emailHash` (HMAC-SHA256 de l'email) est la clé primaire de `Debtor` pour permettre
  des upserts lors de l'import.
- `debtAmount` dans le CSV est un nombre entier d'**euros** (vérifié sur le `debtors.csv`
  fourni) ; stocké en `Int`, converti en cents pour Stripe.
- Les clés Stripe de test viennent de `.env` (jamais commitées).

### Limites

- Le `slug` est généré aléatoirement à l'import et reste stable sur ré-import (upsert).
- L'import est **idempotent côté débiteur** (upsert par `emailHash`, pas de doublons) ;
  en revanche, relancer `bun run import` **ajoute de nouvelles dettes** (chaque ligne du
  CSV crée une `Debt`). Pour un import réel, il faudrait une déduplication par ligne
  (cf. « Avant une mise en production »).
- Les montants très élevés (ligne humoristique `999999999`) sont payables en mode test
  uniquement selon les limites Stripe.

---

## Avant une mise en production

Ce qui changerait pour la production :

- **Clé de chiffrement** : gestion via un KMS / secret manager (pas de clé en `.env`),
  avec rotation de clé et migration des `emailHash`/ciphertexts.
- **Stripe** : passer en mode production avec clés réelles, vérification du webhook
  (`stripe listen` / secret de webhook), idempotence des sessions de paiement.
- **Déploiement** : Docker + GitHub Actions (CI/CD) + Scaleway ; monitoring/logs via
  Axiom.
- **Base de données** : instance PostgreSQL managée (backups, haute disponibilité),
  pooler de connexions pour la production.
- **Sécurité** : rate-limiting, protection CSRF sur les endpoints, audit RGPD
  (droit à l'effacement déjà facilité par `onDelete: Cascade`), chiffrement TLS.
- **Tests** : tests de bout en bout (paiement + webhook), tests de la couche chiffrement.

---

## Ressources utilisées

- Documentation officielle : Stripe (Checkout, webhooks, mode test), Prisma (ORM v7,
  driver adapters), Bun (serveur HTTP, HTML imports), Hono, tRPC, TailwindCSS,
  Shadcn/ui.
- Outils : Docker Compose, GitHub, `gh` CLI.
- Assistant IA : **Opencode** (modèle Deepseek) pour le développement et la
  documentation.