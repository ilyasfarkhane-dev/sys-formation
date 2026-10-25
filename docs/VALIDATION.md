# Vérifications du livrable

## Build et tests métier

- Build de production React/Vite : réussi.
- Vérification de syntaxe des fichiers serveur : réussie.
- 4 tests métier : montants et paiements partiels, bornes décimales, dates réelles et années bissextiles, statuts de mensualités.
- Test d’intégration relationnel : authentification, rôles, création d’élèves et de groupes, inscriptions, capacité, doublons, génération idempotente de mensualités, paiements partiels/concurrents, idempotence des paiements, reçus, appel, clôture et exclusion des mois futurs, désactivation des comptes et contrôle des origines.

Les tests d’intégration ont été exécutés sur une base jetable MariaDB 10.11 via le pilote mysql2. Le projet utilise du SQL compatible MySQL et fournit MySQL 8.4 dans Docker Compose. L’image Docker/MySQL 8.4 n’a pas été démarrée dans cet environnement de vérification.

## Parcours navigateur

Vérification avec Chromium, en vue bureau (1440 px) et mobile (390 px) :

1. Connexion administrateur.
2. Création d’un élève et d’un groupe.
3. Inscription avec tarif mensuel.
4. Planification d’une séance et enregistrement de l’appel.
5. Génération de mensualités et encaissement partiel.
6. Affichage d’un reçu et génération d’un PDF A5.
7. Historique des paiements et téléchargement CSV.
8. Accès aux paramètres et à la liste de l’équipe.
9. Navigation mobile et absence de débordement horizontal.

Les captures de contrôle et les bases jetables ne font pas partie du livrable. Le PDF de contrôle doit contenir le reçu sur une page A5, sans les éléments de navigation.

## Avant exploitation

Renseigner les secrets, configurer MySQL et HTTPS, personnaliser le centre, tester une sauvegarde/restauration et réaliser une recette avec les règles de facturation de votre établissement. Les limites fonctionnelles sont détaillées dans le README, notamment absence de prorata, de remboursement et de mode multi-centres.
