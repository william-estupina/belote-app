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

1. Les cartes se soulèvent légèrement (scale 1 → 1.1 au début du vol)
2. Volent vers la position de main du joueur (position éventail finale)
3. Pendant le vol :
   - **Joueur sud** : `rotateY` de 0° → 180° (révèle la face de la carte)
   - **Bots** : pas de flip (restent dos visible)
4. **Durée** : 400ms par carte
5. **Stagger** : 80ms entre chaque carte (cascade rapide)
6. **Easing** : `Easing.inOut(Easing.cubic)`

### Nettoyage

Chaque `CarteSurTapis` est retirée au moment où sa `CarteEnVol` correspondante décolle.

### Positions d'arrivée

Les positions finales correspondent à l'éventail dans la main du joueur (mêmes calculs que `MainJoueur`/`MainAdversaire` actuels).

## Phase 3 — Tri

Inchangé. Après un délai de **400ms** post-prise en main, les cartes se réorganisent par couleur dans `MainJoueur` (animation de sliding existante).

## Distribution restante (3 cartes après enchères)

Même cycle complet en 3 phases, avec les spécificités suivantes :

### Cas 1 : Preneur n'est PAS le premier dans l'ordre de distribution

1. **Slide de la carte retournée** : la carte retournée (face visible) glisse depuis sa position d'enchères vers la zone tapis du preneur (300ms)
2. **Pause** : 200ms
3. **Phase 1** : distribution classique — 2 cartes face cachée pour le preneur, 3 pour les autres
4. **Phase 2** : prise en main — le preneur prend 3 cartes (la retournée face visible + 2 nouvelles), les autres prennent 3 cartes
5. **Phase 3** : tri

### Cas 2 : Preneur EST le premier dans l'ordre de distribution

1. **Pas de slide séparé** : la carte retournée est intégrée directement dans la distribution
2. **Phase 1** : le preneur reçoit un paquet de 3 cartes (la retournée face visible + 2 nouvelles face cachée), les autres reçoivent 3 cartes face cachée
3. **Phase 2** : prise en main — 3 cartes pour tout le monde
4. **Phase 3** : tri

### Paquet unique

La distribution restante n'a qu'un seul paquet de cartes (pas de split 3+2), formant un seul éventail sur le tapis à côté des cartes déjà en main.

## Composants impactés

### `CarteAnimee.tsx` — Ajout du flip 3D

- Rend deux couches superposées (image dos + image face)
- Anime `rotateY` via Reanimated quand `flipDe`/`flipVers` sont définis
- `backfaceVisibility: 'hidden'` sur les deux couches
- `perspective: 800` pour l'effet 3D
- Si `flipDe`/`flipVers` absents → comportement actuel inchangé (compatibilité)

### `CoucheAnimation.tsx` — Rendu des cartes sur tapis

- Nouveau prop `cartesSurTapis: CarteSurTapis[]`
- Rend les cartes sur tapis comme des éléments statiques positionnés (image dos de carte + rotation CSS)
- Les cartes sur tapis ont un `zIndex` inférieur aux cartes en vol

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

## Timeline complète (distribution initiale)

```
T=0ms         Début distribution paquet 1
T=0-720ms     12 cartes volent vers les tapis (3 × 4 joueurs)
T=920ms       Pause entre paquets
T=1220ms      Début distribution paquet 2
T=1220-1700ms 8 cartes volent (2 × 4 joueurs)
T=1900ms      Sud a ses 5 cartes → 200ms pause
T=2100ms      Phase 2 sud : prise en main (flip, 400ms + 4×80ms stagger ≈ 720ms)
T=2050ms      Ouest a ses 5 cartes → Phase 2 ouest à T=2250ms
T=2200ms      Nord → Phase 2 nord à T=2400ms
T=2350ms      Est → Phase 2 est à T=2550ms
T=2820ms      Toutes les prises en main terminées
T=3220ms      Phase 3 : tri de la main sud
T=3570ms      Prêt pour les enchères
```

## Constantes de layout (à ajouter dans `constants/layout.ts`)

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
