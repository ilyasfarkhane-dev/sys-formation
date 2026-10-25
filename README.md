# CentreFlow

Application de gestion pour centres de soutien et de formation. React + Vite, Express, MySQL. Interface française, responsive, devise MAD par défaut. Aucun espace parents. Une installation correspond à un centre.

## Fonctionnalités

- Connexion de l’équipe : administrateur et gestionnaire. Cookies HttpOnly, expiration de session, changement de mot de passe et désactivation des comptes.
- Élèves : création, modification, coordonnées, niveau, notes, archivage, recherche et export CSV.
- Groupes : matière, enseignant, horaires descriptifs, salle, capacité, tarif mensuel et archivage.
- Inscriptions : élève / groupe, date de début, tarif convenu, clôture datée. Vérification des doublons et de la capacité.
- Séances datées : horaires, sujet et appel présent / absent / retard / excusé, notes, export de l’appel.
- Mensualités : génération par mois, échéance configurable, soldes, filtres et export. La génération peut être relancée sans doublons.
- Paiements partiels ou complets : espèces, virement, carte ou chèque **enregistrés manuellement**. Aucun prélèvement ni prestataire de paiement intégré.
- Reçus numérotés, réimpression et export PDF via la boîte de dialogue d’impression du navigateur.
- Tableau de bord : effectifs, encaissements, solde à recevoir, prochains cours et derniers paiements.
- Paramètres du centre et journal des opérations sensibles.

## Prérequis

Node.js 22 ou 24, npm 10+, MySQL 8.0+ (8.4 recommandé). Docker est une alternative. Il n’y a aucun identifiant de production prédéfini.

## Démarrage local (Windows, macOS, Linux)

### 1. Base MySQL

Avec un compte administrateur MySQL, exécutez les commandes suivantes en remplaçant le mot de passe :

```sql
CREATE DATABASE centreflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'centreflow'@'localhost' IDENTIFIED BY 'votre-mot-de-passe-db';
GRANT ALL PRIVILEGES ON centreflow.* TO 'centreflow'@'localhost';
```

Si l’application se connecte depuis une autre machine, créez un compte limité à son hôte au lieu de `localhost`.

### 2. Configuration

Copiez `server/.env.example` vers `server/.env` :

```bash
cp server/.env.example server/.env
```

Windows PowerShell :

```powershell
Copy-Item server/.env.example server/.env
```

Renseignez `DB_*`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12 caractères minimum), `ADMIN_NAME` et `JWT_SECRET` (au moins 32 caractères aléatoires). Générez ce dernier avec :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Gardez `APP_ORIGIN=http://localhost:5173` et `NODE_ENV=development` pour le développement local. Ouvrez précisément cette adresse (pas l’IP LAN ni `127.0.0.1`) pour correspondre à l’origine autorisée.

### 3. Installation et lancement

Depuis la racine du projet :

```bash
npm ci
npm run db:init
npm run dev
```

- Interface : http://localhost:5173
- API : http://localhost:4000/api/health
- Connexion : les identifiants `ADMIN_EMAIL` et `ADMIN_PASSWORD` configurés par vous.

`db:init` crée les tables manquantes et crée l’admin s’il n’existe pas. Il ne remplace jamais le mot de passe d’un compte existant. Il ne s’agit pas d’un moteur de migrations pour de futures modifications de schéma.

### 4. Démo facultative

```bash
npm run db:seed
```

Charge des données **fictives**, uniquement dans une base sans élèves : 8 élèves, 3 groupes, inscriptions, séances, mensualités et paiements. Le compte admin reste celui que vous avez configuré. Pour commencer avec de vraies données, utilisez une base neuve ; ne chargez pas la démo en production.

## Parcours conseillé

1. Paramètres → renseigner le centre, la devise et le jour d’échéance.
2. Élèves → créer les fiches.
3. Groupes → créer les groupes, puis inscrire les élèves et fixer leur tarif.
4. Présences → planifier une séance, faire l’appel et enregistrer.
5. Mensualités → sélectionner le mois, générer, puis encaisser.
6. Le reçu s’ouvre après chaque paiement. « Imprimer / PDF » permet l’impression ou l’enregistrement PDF. Désactivez les en-têtes/pieds de page du navigateur si nécessaire.

## Règles de facturation importantes

- Une mensualité par inscription et par mois. Toute inscription qui couvre au moins un jour du mois est facturée **en entier**, sans prorata. Le tarif zéro est possible pour une inscription gratuite.
- Le tarif est figé lors de l’inscription ; changer le tarif d’un groupe ne modifie pas les inscriptions existantes.
- La génération est une action manuelle pour le mois choisi. Aucun prélèvement ni tâche planifiée n’est activé.
- La date de fin est inclusive. Une inscription clôturée le 31 octobre ne sera plus facturée en novembre.
- Archiver un élève ou un groupe ne clôture pas ses inscriptions et n’efface pas la dette. Clôturez les inscriptions pour arrêter les prochains mois.
- Une clôture ne peut pas précéder un mois déjà facturé. Les mensualités et paiements ne sont pas supprimables dans cette version ; les avoirs, remboursements, annulations et corrections comptables ne sont pas inclus. Vérifiez les informations avant de confirmer un paiement ou une génération.
- Les encaissements du tableau de bord suivent la **date du paiement**. Le solde des mensualités suit le **mois facturé** : ces deux valeurs mesurent des choses différentes.
- Les retards sont calculés avec la date UTC du serveur. Le retard prime sur le statut partiel.
- Les reçus affichent le cumul payé et le solde juste après le paiement concerné. Les coordonnées du centre proviennent des paramètres actuels, y compris lors d’une réimpression.
- Capacité : les inscriptions futures ouvertes sont comptées conservativement pour éviter le surbooking. Pas de liste d’attente automatique.
- Les horaires de groupe sont descriptifs. Les séances se créent manuellement ; pas de récurrence ni de détection des conflits de salle/enseignant.

## Droits

| Fonction | Administrateur | Gestionnaire |
|---|---|---|
| Élèves, groupes, inscriptions, présences | Oui | Oui |
| Mensualités, paiements, reçus, exports | Oui | Oui |
| Lire les coordonnées du centre | Oui | Oui |
| Modifier les paramètres, gérer les comptes, journal | Oui | Non |
| Modifier son mot de passe | Oui | Oui |

Pas de connexion enseignant ou parents. Le champ « enseignant » est une information de groupe.

## Production sans Docker

```bash
npm ci
npm run build
npm run db:init
npm start
```

Express sert le build React et l’API sur le même port (4000 par défaut). Configurez `NODE_ENV=production`, `APP_ORIGIN=https://votre-domaine.tld`, un secret aléatoire et HTTPS via Nginx. Un exemple est dans `docs/nginx.conf.example`. Les cookies de production sont Secure et nécessitent HTTPS. `TRUST_PROXY=1` uniquement si l’application est derrière exactement un proxy de confiance. Le port API ne doit pas être accessible directement depuis Internet.

Le build `client/dist` est fourni dans le ZIP pour consultation, et peut être régénéré avec `npm run build`. Les dépendances ne sont pas incluses : un accès au registre npm est nécessaire pour `npm ci`.

## Docker + MySQL 8.4

1. Configurez `server/.env` comme ci-dessus et ajoutez `MYSQL_ROOT_PASSWORD` avec un autre mot de passe fort.
2. `DB_HOST` est automatiquement remplacé par `db` dans le conteneur applicatif. `DB_USER` doit être différent de `root`.
3. Pour un serveur derrière Nginx HTTPS, définissez `APP_ORIGIN=https://votre-domaine.tld`, `NODE_ENV=production`, `TRUST_PROXY=1`.
4. Lancez :

```bash
docker compose --env-file server/.env up --build -d
```

L’application est sur `127.0.0.1:4000`, MySQL sur `127.0.0.1:3306`. Le volume `mysql_data` conserve la base. Ne lancez pas `docker compose down -v` sauf si vous voulez effacer cette base. Le mode Docker fourni utilise des cookies Secure : accédez via votre proxy HTTPS. Pour du développement HTTP local, utilisez le démarrage local décrit plus haut.

## Sauvegarde et récupération

Sauvegardez MySQL quotidiennement, ainsi que `server/.env` dans un emplacement sécurisé séparé. Exemple hors Docker (le mot de passe est demandé) :

```bash
mysqldump -u centreflow -p --single-transaction --routines --triggers centreflow > centreflow-backup.sql
```

Testez une restauration dans une base distincte avant de dépendre de la sauvegarde. Les données personnelles doivent rester accessibles uniquement à l’équipe autorisée ; configurez la durée de conservation selon votre activité.

Réinitialisation d’un mot de passe, depuis `server/` : définissez `RESET_EMAIL` et `RESET_PASSWORD` dans l’environnement, puis lancez `node scripts/reset-password.js`. Le script remplace le mot de passe du compte existant et invalide ses sessions. Ne versionnez jamais ces variables ni le fichier `.env`.

## Tests

```bash
npm test
npm run build
```

Les tests métier vérifient les dates, les montants, les paiements partiels et les statuts. Les tests d’intégration sont ignorés par défaut car ils écrivent en base. Utilisez une base **jetable**, initialisez-la avec `db:init`, puis lancez :

```bash
INTEGRATION_TEST=1 npm test
```

PowerShell : `$env:INTEGRATION_TEST='1'; npm test`

Ils vérifient authentification, rôles, capacité, doublons, facturation, paiements concurrents, idempotence, reçu, appel et clôture d’inscription. Ils ajoutent des données sans les supprimer : ne les utilisez jamais sur une base réelle.

## Structure

```text
client/src/         Interface React et styles
server/src/         API, authentification, validations et accès MySQL
server/schema.sql   Tables et index
server/scripts/     Initialisation, démo et récupération de compte
server/test/        Tests métier et intégration
compose.yaml        Application et MySQL
Dockerfile          Build et exécution conteneurisée
docs/               Configuration de déploiement et vérifications
```

## Périmètre commercial

Ce livrable est une application pour **un seul centre par installation**, prête à personnaliser et déployer. L’hébergement multi-centres, la facturation de vos propres abonnements SaaS, les SMS/WhatsApp automatiques, le paiement en ligne, l’import Excel et les obligations comptables/fiscales spécifiques ne sont pas inclus. Les exports CSV s’ouvrent dans Excel.
