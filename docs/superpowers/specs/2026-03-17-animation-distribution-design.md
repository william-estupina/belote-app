# Animation de distribution réaliste

## Contexte

L'animation de distribution actuelle envoie les cartes directement du centre vers la main des joueurs (face visible pour sud). Le nouveau design reproduit une distribution réaliste : cartes face cachée posées sur le tapis, puis le joueur les prend en main avec un retournement 3D.

## Vue d'ensemble

L'animation passe de 2 phases (vol → tri) à 3 phases :

```
Phase 1: DISTRIBUTION SUR TAPIS    Phase 2: PRISE EN MAIN         Phase 3: TRI
────────────────────────────────    ────────────────────────        ──────────
Cartes volent du centre →           Cartes se soulèvent du          Cartes se réorganisent
atterrissent face cachée sur        tapis, flip 3D + vol →          dans la main en éventail
le tapis devant chaque joueur       zone de main du joueur          (existant, inchangé)
(éventails 3 + 2)                   (face visible sud, dos bots)
```

## Approche technique retenue

**Approche B — Deux composants superposés (dos + face) avec backfaceVisibility.**

Le flip 3D est réalisé avec deux vues empilées (dos à `rotateY(0)`, face à `rotateY(180)`). On anime le `rotateY` du conteneur de 0° → 180°, et `backfaceVisibility: 'hidden'` masque automatiquement le bon côté. Pattern fiable, pas de switch conditionnel à 90°.

**Fallback Android** : si `backfaceVisibility: 'hidden'` s'avère peu fiable sur certains appareils Android, basculer sur un switch d'opacité au point 90° (`opacity: rotationY < 90 ? 1 : 0` pour le dos, inverse pour la face). Tester tôt sur un appareil Android physique.

**perspective** : doit être le PREMIER élément du tableau `transform` pour que l'effet 3D fonctionne correctement : `transform: [{ perspective: 800 }, { rotateY: '...' }, ...]`.

## Types

### `CarteEnVol` (modifié)

```typescript
interface CarteEnVol {
  id: string;
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  duree: number;
  // Nouveau — flip 3D
  flipDe?: number; // rotateY départ en degrés (0 = dos, 180 = face)
  flipVers?: number; // rotateY arrivée en degrés
  // Nouveau — easing configurable
  easing?: "out-cubic" | "inout-cubic"; // défaut: 'out-cubic' (Phase 1), 'inout-cubic' (Phase 2)
}
```

### `CarteSurTapis` (nouveau)

```typescript
interface CarteSurTapis {
  id: string;
  carte: Carte;
  position: PositionJoueur;
  x: number; // position relative (0-1) avec offset aléatoire
  y: number;
  rotation: number; // rotation aléatoire entre -15° et +15°
  faceVisible: boolean; // false sauf carte retournée du preneur
  paquet: 1 | 2; // distingue visuellement les deux éventails
}
```

## Phase 1 — Distribution sur le tapis

### Positions tapis

Zones devant chaque joueur, décalées vers le centre par rapport aux positions de main :

```typescript
POSITIONS_TAPIS = {
  sud: { x: 0.5, y: 0.75 },
  nord: { x: 0.5, y: 0.18 },
  ouest: { x: 0.18, y: 0.5 },
  est: { x: 0.82, y: 0.5 },
};
```

### Éventails sur le tapis

Chaque carte atterrit avec un décalage aléatoire par rapport au centre de la zone tapis :

- **Position** : ±2% en x et y
- **Rotation** : entre -15° et +15° (aléatoire)
- **Séparation des paquets** : le paquet 2 est décalé de ~3% en x par rapport au paquet 1 pour distinguer visuellement les deux éventails (3 + 2)

### Timing

```
Paquet 1 (3 cartes × 4 joueurs) :
  Vol vers tapis : 300ms par carte
  Délai entre cartes d'un même joueur : 60ms
  Délai entre joueurs : 200ms

Pause entre paquets : 500ms

Paquet 2 (2 cartes × 4 joueurs) :
  Même timing que paquet 1
```

### Déclencheur Phase 2

Dès qu'un joueur a reçu ses 5 cartes, sa Phase 2 se déclenche après un délai de **200ms** (les cartes "posent" sur le tapis). Chaque joueur est indépendant : pas d'attente des autres.

## Phase 2 — Prise en main (flip + vol)

Déclenchée **par joueur** dès que ses 5 cartes sont posées sur le tapis.

### Animation par carte

1. Les cartes se soulèvent du tapis (`depart.echelle = 1.1`, `arrivee.echelle = 1.0` — effet de soulèvement puis repose naturelle)
2. Volent vers la position de main du joueur (position éventail finale)
3. Pendant le vol :
   - **Joueur sud** : `rotateY` de 0° → 180° (révèle la face de la carte)
   - **Bots** : pas de flip (restent dos visible)
4. **Durée** : 400ms par carte
5. **Stagger** : 80ms entre chaque carte (cascade rapide)
6. **Easing** : `Easing.inOut(Easing.cubic)` (via champ `easing: 'inout-cubic'` sur `CarteEnVol`)

### Nettoyage

Chaque `CarteSurTapis` est retirée au moment où sa `CarteEnVol` correspondante décolle. La correspondance se fait par l'`id` de la carte : le `CarteEnVol` de Phase 2 utilise le même `id` que le `CarteSurTapis` qu'il remplace (préfixé `prise-` pour éviter les collisions dans la couche de rendu).

### Positions d'arrivée

Les positions finales correspondent à l'éventail dans la main du joueur (mêmes calculs que `MainJoueur`/`MainAdversaire` actuels).

## Phase 3 — Tri

Inchangé. Après un délai de **400ms** post-prise en main, les cartes se réorganisent par couleur dans `MainJoueur` (animation de sliding existante).

## Distribution restante (3 cartes après enchères)

Même cycle complet en 3 phases, avec les spécificités suivantes :

**Ordre de distribution** : le premier joueur servi est `(indexDonneur + 1) % 4` dans l'ordre des positions `["sud", "ouest", "nord", "est"]`, sens horaire.

### Cas 1 : Preneur n'est PAS le premier dans l'ordre de distribution

1. **Slide de la carte retournée** : la carte retournée (face visible) glisse depuis sa position d'enchères vers la zone tapis du preneur (300ms)
2. **Pause** : 200ms
3. **Phase 1** : distribution classique — 2 cartes face cachée pour le preneur, 3 pour les autres
4. **Phase 2** : prise en main — le preneur prend 3 cartes (la retournée + 2 nouvelles), les autres prennent 3 cartes. Pour la carte retournée : `flipDe = 180` (déjà face visible), `flipVers = 180` (reste face visible pour sud) ou `flipVers = 0` (se retourne dos pour un bot preneur).
5. **Phase 3** : tri

### Cas 2 : Preneur EST le premier dans l'ordre de distribution

1. **Pas de slide séparé** : la carte retournée est intégrée directement dans la distribution
2. **Phase 1** : le preneur reçoit un paquet de 3 cartes (la retournée face visible + 2 nouvelles face cachée), les autres reçoivent 3 cartes face cachée
3. **Phase 2** : prise en main — 3 cartes pour tout le monde
4. **Phase 3** : tri

### Paquet unique

La distribution restante n'a qu'un seul paquet de cartes (pas de split 3+2), formant un seul éventail sur le tapis (la zone tapis est libre car les cartes initiales ont déjà été prises en main).

## Composants impactés

### `CarteAnimee.tsx` — Ajout du flip 3D

- Rend deux couches superposées : `CarteDos` (rotateY 0°) et `CarteFace` (rotateY 180°) — ces sous-composants doivent être exportés depuis `Carte.tsx` ou dupliqués dans `CarteAnimee`
- Anime `rotateY` via Reanimated quand `flipDe`/`flipVers` sont définis
- `backfaceVisibility: 'hidden'` sur les deux couches
- `perspective: 800` en premier dans le tableau `transform`
- Supporte le champ `easing` pour varier le profil d'animation par phase
- Si `flipDe`/`flipVers` absents → comportement actuel inchangé (compatibilité)

### `CoucheAnimation.tsx` — Rendu des cartes sur tapis

- Nouveau prop `cartesSurTapis: CarteSurTapis[]`
- Rend les cartes sur tapis comme des éléments statiques positionnés (image dos de carte + rotation CSS)
- Les cartes sur tapis ont `zIndex: 40` (inférieur aux cartes en vol qui ont `zIndex: 50`)

### `useAnimations.ts` — Refonte de la distribution

- `lancerDistribution(mains, options)` : refactorisé pour Phase 1 (vol vers tapis, toutes face cachée)
  - Nouveau callback `onCarteArrivee(carteSurTapis)` : ajoute une carte sur le tapis
  - Nouveau callback `onJoueurComplet(position)` : déclenche Phase 2 pour ce joueur
- Nouvelle méthode `lancerPriseEnMain(joueur, cartesSurTapis, positionsMain)` : Phase 2 (flip + vol vers main)
- Nouvelle méthode `glisserCarteRetournee(preneur, positionDepart, positionArrivee)` : slide la carte retournée vers le tapis du preneur

### `useControleurJeu.ts` — Orchestration 3 phases

- Nouveau state : `cartesSurTapis: CarteSurTapis[]`
- `lancerDistributionAnimee()` orchestre Phase 1 → Phase 2 (par joueur) → Phase 3
- `lancerDistributionRestanteAnimee()` gère les deux cas (preneur premier ou non)
- Intègre la carte retournée dans le flux du preneur

### Composants inchangés

- **`MainJoueur.tsx`** — reçoit les cartes après Phase 2 comme avant
- **`MainAdversaire.tsx`** — idem
- **`PlateauJeu.tsx`** — passe `cartesSurTapis` à `CoucheAnimation`
- **Machine XState** — aucun changement (purement visuel)
- **`ZoneCarteRetournee.tsx`** — inchangé pendant les enchères ; la carte disparaît quand elle glisse/est intégrée dans la distribution restante

## Redistribution (tous passent aux 2 tours)

Quand tous les joueurs passent aux deux tours d'enchères, le jeu entre en état `redistribution`. L'animation est identique à la distribution initiale complète (3 phases) : le donneur tourne, les cartes sont redistribuées. Pas de nettoyage spécial nécessaire car les cartes de l'ancienne donne sont déjà en main et seront remplacées par le nouveau state XState.

## Annulation et nettoyage

En cas d'interruption (quitter la partie, nouvelle partie), `annulerAnimations()` doit aussi :

- Vider le state `cartesSurTapis` (en plus des `cartesEnVol` existants)
- Annuler les timeouts de Phase 2 en attente (les `pauseAvantPrise` setTimeout)
- Les callbacks `onJoueurComplet` doivent vérifier un flag `animationAnnulee` avant de lancer la Phase 2

## Cycle de vie d'une carte (diagramme)

```
[Phase 1] CarteEnVol(centre → tapis)
   → à l'arrivée : crée CarteSurTapis(statique sur tapis), supprime CarteEnVol

[Phase 2] CarteSurTapis existe
   → prise en main : crée CarteEnVol(tapis → main, avec flip), supprime CarteSurTapis
   → à l'arrivée : carte apparaît dans MainJoueur/MainAdversaire, supprime CarteEnVol

[Phase 3] Carte dans la main
   → tri : animation interne à MainJoueur (sliding positions)
```

## Timeline complète (distribution initiale, approximative)

Les temps ci-dessous sont indicatifs. Les constantes définies dans la section suivante font foi.

```
T=0ms          Début distribution paquet 1 (3 cartes × 4 joueurs)
               Sud: 0, 60, 120ms | Ouest: 200, 260, 320ms | Nord: 400, 460, 520ms | Est: 600, 660, 720ms
               (chaque carte met 300ms à voler → dernière arrivée à ~1020ms)

T=1220ms       Début distribution paquet 2 (720ms + 500ms pause)
               Sud: 1220, 1280ms | Ouest: 1420, 1480ms | Nord: 1620, 1680ms | Est: 1820, 1880ms
               (dernière arrivée à ~2180ms)

T~1580ms       Sud a ses 5 cartes (dernière carte paquet 2 arrive à 1280+300=1580)
T~1780ms       Phase 2 sud démarre (1580 + 200ms pause)
               5 cartes en cascade : 0, 80, 160, 240, 320ms de stagger → dernière à 320+400=720ms
T~2500ms       Phase 2 sud terminée

T~1780ms       Ouest a ses 5 cartes (1480+300=1780)
T~1980ms       Phase 2 ouest démarre
T~2700ms       Phase 2 ouest terminée

               Nord et Est suivent avec ~200ms de décalage chacun

T~3100ms       Toutes les prises en main terminées
T~3500ms       Phase 3 : tri de la main sud (3100 + 400ms pause)
T~3850ms       Prêt pour les enchères
```

## Constantes de layout (à modifier dans `constants/layout.ts`)

**Note** : les timings Phase 1 sont accélérés par rapport aux valeurs actuelles pour compenser l'ajout de la Phase 2. Valeurs actuelles → nouvelles : `dureeCarte` 350→300ms, `delaiEntreJoueurs` 250→200ms, `pauseEntreTours` 600→500ms.

```typescript
distribution: {
  // Phase 1
  dureeCarte: 300,           // vol vers tapis (ms)
  delaiDansPaquet: 60,       // entre cartes d'un même joueur
  delaiEntreJoueurs: 200,    // entre joueurs
  pauseEntreTours: 500,      // entre paquet 1 et paquet 2
  offsetAleatoireMax: 0.02,  // ±2% position aléatoire
  rotationAleatoireMax: 15,  // ±15° rotation aléatoire
  decalagePaquet2: 0.03,     // décalage x entre paquet 1 et 2

  // Phase 2
  dureePriseEnMain: 400,     // vol tapis → main (ms)
  staggerPriseEnMain: 80,    // entre chaque carte
  pauseAvantPrise: 200,      // pause après atterrissage

  // Phase 3 (existant)
  pauseAvantTri: 400,

  // Distribution restante
  dureeSlideRetournee: 300,  // slide carte retournée vers tapis

  // Origine
  originX: 0.5,
  originY: 0.45,
}
```
