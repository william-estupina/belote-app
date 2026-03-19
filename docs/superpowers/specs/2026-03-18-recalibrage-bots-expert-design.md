# Recalibrage des niveaux de bots + niveau expert

**Date** : 2026-03-18
**Statut** : Validé

## Contexte

Les bots actuels sont trop faibles. Le mode "difficile" actuel correspond à un niveau intermédiaire. L'objectif est de recalibrer les 3 niveaux existants et créer un vrai niveau expert capable de stratégies avancées de belote.

## Décisions

- **3 niveaux recalibrés** (pas d'ajout de 4e niveau) : facile, moyen, difficile
- **Approche** : enrichissement in-place des fichiers existants (pas de refactoring structural)
- **Le type `Difficulte`** reste `"facile" | "moyen" | "difficile"` — aucun changement côté sélecteur UI
- **`VueBotJeu` étendu** avec `positionPreneur` et `positionDonneur` (nécessaires pour les stratégies expert)
- **Profil du bot expert** : opportuniste (prend sur des mains correctes, exploite la position et le score)
- **Comptage** : étendu par joueur (déductions des défausses, couleurs épuisées par adversaire), pas d'inférence probabiliste

## Section 1 — Recalibrage des niveaux existants

### Nouveau "facile" (basé sur l'ancien moyen, ajusté)

**Enchères :**

- Tour 1 : prend si Valet + 9, ou Valet + 2 atouts, ou 3+ atouts avec Valet ou 9 (logique de l'ancien moyen)
- Tour 2 : annonce si Valet + 9 ou 4+ atouts
- Ajustement : après calcul de la décision "correcte" (logique moyen), on inverse le résultat avec une probabilité fixe de 12% (passer au lieu de prendre ou vice-versa). Pas d'erreurs aléatoires pendant le jeu de cartes, uniquement pendant les enchères.

**Jeu :**

- Entame : As hors atout si disponible, sinon plus forte carte hors atout, sinon plus faible atout (logique de l'ancien moyen)
- Partenaire gagne : joue la plus faible
- Adversaire gagne : joue la plus forte
- Pas de comptage de cartes, pas de détection de carte maîtresse

### Nouveau "moyen" (= ancien difficile, tel quel)

**Enchères :** Évaluation par points (seuil 87), Valet + 9 auto-prend, Valet + points ≥ 82 prend.

**Jeu :** Utilise `construireSuiviCartes()`, carte maîtresse, tirage atout si Valet/9, coupe minimale, donne de points au partenaire (10 ou As).

Pas de changement fonctionnel, juste le renommage.

### L'ancien "facile" (aléatoire pur) disparaît

Un bot qui joue au hasard n'est pas fun et n'a pas de valeur en tant que niveau jouable.

## Section 2 — Comptage de cartes étendu

### Extension de `VueBotJeu`

Ajout de deux champs nécessaires aux stratégies expert :

```typescript
interface VueBotJeu {
  // ... champs existants ...
  positionPreneur: PositionJoueur | null; // qui a pris (null si enchères)
  positionDonneur: PositionJoueur; // qui a distribué (pour position aux enchères)
}
```

Ces champs existent déjà dans le contexte XState (`indexPreneur`, `indexDonneur` dans `ContextePartie`). Il faut les mapper dans `construireVueBot()` de `useControleurJeu.ts`.

### Enrichissement de `comptage-cartes.ts`

Nouveau suivi par joueur en plus du suivi global existant.

**Nouvelle structure `SuiviCartesAvance` :**

```typescript
interface SuiviCartesAvance extends SuiviCartes {
  couleursEpuisees: Record<PositionJoueur, Couleur[]>;
  atoutsJouesParJoueur: Record<PositionJoueur, Carte[]>;
  nombreAtoutsRestantsTotal: number; // atouts non encore vus (toutes mains adverses + partenaire confondues)
  defaussesParJoueur: Record<PositionJoueur, Carte[]>;
}
```

Note : `nombreAtoutsRestantsTotal` est un compteur global (pas par joueur) car le bot ne peut pas savoir combien d'atouts chaque adversaire détient individuellement sans inférence probabiliste.

**Déduction des couleurs épuisées :**

- Si un joueur ne fournit pas à la couleur demandée (il coupe ou défausse), on marque cette couleur comme épuisée pour lui
- Analyse de `historiquePlis` : la couleur demandée est celle de la première carte du pli ; si un joueur joue une autre couleur → couleur épuisée

**Nouvelles fonctions :**

- `construireSuiviAvance(vue: VueBotJeu): SuiviCartesAvance` — construit le suivi enrichi. Prend la `VueBotJeu` complète (contrairement à `construireSuiviCartes` qui prend 3 paramètres séparés). Ce choix est délibéré : le suivi avancé a besoin de plus de contexte (atout, positions). Les deux conventions coexistent car le niveau moyen continue d'utiliser `construireSuiviCartes`.
- `joueurACoupe(suivi, position, couleur): boolean` — le joueur a-t-il déjà coupé cette couleur ?
- `atoutsRestantsAdversaires(suivi, maMain, positionPartenaire): number` — atouts encore chez les adversaires (exclut les atouts connus du bot et de son partenaire si on sait que le partenaire est épuisé en atout)
- `carteMaitresseAvancee(carte, suivi): boolean` — comme `estCarteMaitresse` mais tient compte des couleurs épuisées par joueur

Les fonctions existantes (`construireSuiviCartes`, `estCarteMaitresse`, etc.) restent intactes pour le niveau moyen.

## Section 3 — Stratégie de jeu du niveau "difficile" (expert)

Utilise `SuiviCartesAvance` et applique une logique contextuelle riche.

**Score de manche :** Le score de la manche en cours est dérivé de `historiquePlis` (somme des points des plis gagnés). Le numéro de pli est `historiquePlis.length + 1` (dernier pli = 8e). Ces valeurs sont calculées, pas stockées.

### Entame (première carte du pli)

**Priorité décroissante :**

1. **Tirage d'atout systématique** — si le bot ou son partenaire est preneur (via `positionPreneur`) ET l'équipe a la majorité des atouts restants → tire l'atout pour épuiser les adversaires. Continue tant que les adversaires ont des atouts (via `atoutsRestantsAdversaires`). Arrête dès que les adversaires n'en ont plus.
2. **Carte maîtresse hors atout** — joue une carte maîtresse dans une couleur non épuisée chez le partenaire (pour qu'il puisse donner des points)
3. **Forcer la coupe** — joue dans une couleur où un adversaire est épuisé mais pas le partenaire, **uniquement si cet adversaire a encore des atouts** (déduit : il n'a pas été vu en train de défausser sur de l'atout). Si l'adversaire n'a plus d'atouts non plus, forcer la coupe n'a pas d'intérêt stratégique.
4. **Singleton** — joue un singleton hors atout pour se créer une coupe future
5. **Fallback** — plus petite carte dans la couleur la plus longue

### Réponse quand le partenaire gagne

**Priorité décroissante :**

1. **Charger en points** — donne le 10 ou l'As si le partenaire a la carte maîtresse (pli sécurisé)
2. **Jouer un As pour établir une couleur** — si on a l'As dans une couleur non encore jouée et qu'on peut fournir à la couleur demandée avec une carte faible, garder l'As pour l'entame suivante. Si on ne peut pas fournir et qu'on défausse, l'As peut être joué pour sécuriser les points avant de perdre la main.
3. **Plus petite carte** — défausse minimale sinon

### Réponse quand l'adversaire gagne

**Priorité décroissante :**

1. **Surmonter dans la couleur** — jouer une carte plus forte si possible
2. **Couper** — si on n'a plus la couleur demandée, couper avec le plus petit atout suffisant (pas le Valet ou le 9 si un petit atout suffit)
3. **Sur-couper** — si un adversaire a déjà coupé, sur-couper seulement si ça vaut le coup (beaucoup de points dans le pli)
4. **Défausse intelligente** — défausser dans une couleur épuisée chez le partenaire (il pourra couper plus tard) ou dans la couleur la plus faible

### Gestion de l'atout en main

- Ne jamais gaspiller le Valet ou le 9 sur une coupe de routine — préférer un petit atout
- Garder un atout de retour — si on n'a plus qu'un atout, le garder pour une coupe décisive en fin de donne
- Compter les atouts tirés — arrêter de tirer l'atout dès que les adversaires n'en ont plus

### Belote / Rebelote

- Si le bot détient le Roi et la Dame d'atout, il doit les jouer ensemble (annoncer Belote/Rebelote pour les 20 pts bonus)
- Ne pas séparer Roi/Dame d'atout sauf si absolument nécessaire (ex: obligé de fournir)
- Facteur dans l'évaluation aux enchères : Roi + Dame d'atout = +20 pts potentiels

### Adaptation au score

**Score de manche** (points accumulés dans la manche en cours, total 162) :

- **Équipe mène confortablement (>120 pts manche)** — jeu conservateur, éviter les risques, donner des points au partenaire
- **Équipe est menée dans la manche** — jeu agressif, tenter les coupes, prendre des risques pour les plis de points
- **Dernier pli (8e)** — toujours essayer de le gagner (10 pts de der)

**Score de partie** (score cumulé sur toutes les manches) : utilisé uniquement pour les enchères (voir Section 4).

## Section 4 — Stratégie d'enchères du niveau "difficile" (expert)

### Tour 1 (PRENDRE / PASSER)

**Facteurs évalués :**

1. **Force de la main en atout** — points potentiels (Valet=20, 9=14, As=11, 10=10, Roi=4, Dame=3)
2. **Force hors atout** — nombre d'As et 10, longueurs de couleur
3. **Position** — déterminée via `positionDonneur` : le donneur (dernier à parler) peut prendre sur une main plus faible
4. **Score de la partie** (`scoreMonEquipe` / `scoreAdversaire`) — score cumulé sur toutes les manches
5. **Belote/Rebelote** — Roi + Dame d'atout dans la main = +20 pts dans l'évaluation

**Seuils adaptatifs :**

- Position favorable (donneur/3e) : seuil abaissé à 80 pts
- Position défavorable (1er/2e) : seuil standard 87 pts
- Score favorable (équipe mène de 200+) : seuil abaissé de 5 pts
- Score défavorable (adversaire mène de 200+) : seuil abaissé de 5 pts aussi
- **Auto-prend** : Valet + 9 + au moins 1 carte hors atout forte (As ou 10)

### Tour 2 (ANNONCER / PASSER)

- Évalue les 3 couleurs restantes (exclut celle de la carte retournée)
- Seuils légèrement plus élevés (+5 pts) car annoncer sans la carte retournée est plus risqué
- **Analyse de la main longue** — si une couleur a 4+ cartes avec Valet ou 9, bon candidat même avec points légèrement sous le seuil
- Tient compte des passes précédentes : si tout le monde a passé au tour 1, la main collective est faible → plus prudent sauf main très forte

### Anti-chute

- Avant de prendre, vérifie au moins **2 couleurs couvertes** hors atout. Une couleur est "couverte" si le bot y détient l'As, OU une longueur de 3+ cartes (permet de reprendre la main ou d'absorber les attaques).
- Ne prend jamais avec moins de 2 atouts (sauf Valet + 9)

## Section 5 — Tests et validation

### Tests unitaires (Vitest) dans `bot-engine`

**comptage-cartes.ts :**

- Détection correcte des couleurs épuisées par joueur
- Comptage des atouts restants adversaires
- Carte maîtresse avancée (tenant compte des épuisements)
- Cas limites : premier pli (aucune info), dernier pli (tout connu)

**strategie-jeu.ts — niveau difficile :**

- Entame : tire l'atout quand l'équipe a la majorité
- Entame : force la coupe quand adversaire épuisé (et a encore des atouts)
- Partenaire gagne : charge en points sur carte maîtresse
- Adversaire gagne : coupe avec le plus petit atout suffisant, pas le Valet
- Ne gaspille jamais Valet/9 en coupe de routine
- Adaptation score manche : jeu conservateur quand on mène, agressif quand on est mené
- Dernier pli : tente toujours de le gagner
- Belote/Rebelote : garde Roi + Dame d'atout ensemble

**strategie-encheres.ts — niveau difficile :**

- Position favorable (donneur) → seuil abaissé
- Score favorable → prise plus agressive
- Anti-chute : refuse de prendre sans couverture hors atout (2 couleurs couvertes)
- Tour 2 : seuil plus élevé, analyse de la main longue
- Belote/Rebelote : +20 pts dans l'évaluation

**Recalibrage — niveaux facile/moyen :**

- Facile : comportement correspond à l'ancien moyen (avec 12% d'erreurs aléatoires aux enchères, pas d'erreurs en jeu)
- Moyen : comportement correspond à l'ancien difficile
- Les tests existants pour les anciens niveaux doivent être mis à jour : les tests "facile" (aléatoire pur) sont supprimés, les tests "moyen" remappés vers "facile", les tests "difficile" remappés vers "moyen"

### Tests d'intégration

- **Simulation de 100 parties** bot vs bot à chaque niveau :
  - Le difficile gagne au moins 55% des parties contre le moyen
  - Le moyen gagne au moins 55% des parties contre le facile
  - Pas de crash, pas de coups illégaux
  - Ce test est une validation manuelle (non bloquant en CI) car les résultats dépendent de la variance des distributions de cartes

### Pas de changements au sélecteur UI

Le type `Difficulte` reste `"facile" | "moyen" | "difficile"` — le sélecteur de difficulté côté mobile fonctionne tel quel.

## Fichiers impactés

| Fichier                                         | Changement                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `packages/shared-types/src/game.ts`             | Ajout `positionPreneur` et `positionDonneur` à `VueBotJeu`          |
| `packages/bot-engine/src/comptage-cartes.ts`    | Ajout `SuiviCartesAvance` + nouvelles fonctions                     |
| `packages/bot-engine/src/strategie-encheres.ts` | Remapping niveaux + nouvelles enchères expert                       |
| `packages/bot-engine/src/strategie-jeu.ts`      | Remapping niveaux + nouveau jeu expert                              |
| `packages/bot-engine/src/bot.ts`                | Aucun changement (dispatch par difficulté inchangé)                 |
| `apps/mobile/hooks/useControleurJeu.ts`         | Mise à jour `construireVueBot()` pour passer les nouveaux champs    |
| `packages/bot-engine/__tests__/`                | Mise à jour des tests existants (remapping) + nouveaux tests expert |
