# Design — Distribution Skia Atlas : arc, ease-out, withDelay natif

**Date** : 2026-03-19
**Statut** : Approuvé

## Contexte

Malgré les améliorations de la spec du 2026-03-18 (ralentissement, paquet central, easing), trois problèmes persistent sur l'animation de distribution :

1. **Trajectoire rectiligne** — les cartes volent en ligne droite du centre vers chaque main
2. **Manque de fluidité** — orchestration par `setTimeout` côté JS thread, micro-saccades
3. **Arrivée mécanique** — pas de décélération naturelle à l'atterrissage

## Décisions de design

### 1. Architecture : Skia Atlas (single draw call)

Pendant la distribution uniquement, remplacer les N composants `CarteAnimee` individuels par un **unique Canvas Skia** utilisant `drawAtlas` / `useRSXformBuffer`. Avantages :

- **1 seul draw call** pour dessiner jusqu'à 32 cartes simultanément
- Pas de reconciliation React pour chaque carte
- Transformations (position, rotation, scale) calculées par `RSXform` dans un worklet

**Scope limité** : seule la distribution utilise l'Atlas. Les animations de jeu de carte et de ramassage de pli restent sur `CarteAnimee` (enrichi avec arc + ease-out).

### 2. Sprite sheet pré-construite

Une image unique (~1336×1210px) contenant les 32 faces de cartes + 1 dos, organisée en grille 8×5 :

- **Lignes 1–4** : 8 cartes par ligne (8 rangs × 4 couleurs = 32 faces)
- **Ligne 5** : 1 dos de carte (cellule 0), reste vide
- Chaque cellule : ~167×242px (ratio 1.45)
- Ordre : trèfle, carreau, cœur, pique × 7, 8, 9, 10, V, D, R, As

**Fichiers** :

- `assets/sprites/sprite-sheet.png` — sprite sheet générée
- `assets/sprites/dos.png` — dos seul (pour usages hors Atlas)
- `apps/mobile/scripts/generer-sprite-sheet.ts` — script Node (`sharp` en devDependency de `@belote/mobile`) pour assembler les PNG existants

**Hook utilitaire** `apps/mobile/hooks/useAtlasCartes.ts` (`.ts` car pas de JSX, mais c'est un hook React) :

- `SPRITE_COLS = 8`, `SPRITE_ROWS = 5`
- `rectSource(couleur: Couleur, rang: Rang) → SkRect` — retourne le rectangle source dans la sprite sheet
- `rectDos() → SkRect` — rectangle du dos (ligne 5, col 0)
- Exporte un hook `useAtlasCartes()` qui appelle `useImage(require('assets/sprites/sprite-sheet.png'))` et retourne `{ image: SkImage | null, rectSource, rectDos }`
- Les dimensions exactes des cellules sont calculées dynamiquement à partir de l'image chargée : `cellW = image.width() / SPRITE_COLS`, `cellH = image.height() / SPRITE_ROWS`

### 3. Face visible vs dos pendant la distribution

Pendant la distribution, **toutes les cartes volent face cachée (dos)** sauf celles passées dans `cartesVisibles` (identique au comportement actuel). L'Atlas utilise `rectDos()` par défaut et `rectSource(couleur, rang)` pour les cartes visibles. Il n'y a **pas de flip en vol** — la face est fixe pendant tout le trajet (même comportement que `CarteAnimee` actuel pendant la distribution).

Le `glisserCarteRetournee` (slide de la carte retournée vers le preneur) reste géré par `useAnimations.ts` via `CarteAnimee` — ce n'est pas une distribution Atlas.

### 4. Trajectoire : arc subtil (Bézier quadratique)

Chaque carte suit un arc léger au lieu d'une ligne droite :

```
x(t) = (1-t)² × depart.x + 2(1-t)t × controle.x + t² × arrivee.x
y(t) = (1-t)² × depart.y + 2(1-t)t × controle.y + t² × arrivee.y
```

**Point de contrôle** : décalé de ~5% de la distance totale, perpendiculairement à l'axe depart→arrivee. Direction du décalage : vers la droite du vecteur de vol (sens horaire depuis le centre).

Constante dans `layout.ts` :

```ts
arcDistribution: {
  decalagePerpendiculaire: 0.05, // 5% de la distance, perpendiculaire
}
```

### 5. Atterrissage : ease-out fort

- **Easing** : `Easing.out(Easing.cubic)` — forte décélération, la carte ralentit naturellement en arrivant
- Remplace `inout-cubic` pour la distribution et le jeu de carte
- Les animations de ramassage et `glisserCarteRetournee` conservent `inout-cubic` (départ et arrivée doux adaptés à ces mouvements)

Constante dans `layout.ts` :

```ts
easingDistribution: "out-cubic" as const, // ease-out fort (était "inout-cubic")
```

### 6. Orchestration : withDelay natif Reanimated

Remplacer **tous les `setTimeout`** de la distribution par `withDelay(delai, withTiming(...))` :

- Chaque carte reçoit un délai calculé : `(indexJoueur × delaiEntreJoueurs) + (round × pauseEntreRounds)`
- L'intégralité de l'orchestration tourne sur le **UI thread** via worklets
- Les callbacks JS (`onPaquetArrive`, `onTerminee`) sont déclenchés via `runOnJS` depuis `withTiming({ finished })`

### 7. Hook dédié : useAnimationsDistribution

Nouveau hook qui encapsule toute la logique Atlas :

Les types utilisés sont ceux existants du projet (`Carte`, `PositionJoueur` de `@belote/shared-types`) :

```ts
useAnimationsDistribution(params: {
  atlas: ReturnType<typeof useAtlasCartes>; // { image, rectSource, rectDos }
  largeurEcran: number;
  hauteurEcran: number;
  onPaquetArrive: (joueur: PositionJoueur, cartes: Carte[]) => void;
  onTerminee: () => void;
}) => {
  lancerDistribution: (
    mains: Record<PositionJoueur, Carte[]>,
    options?: { cartesVisibles?: Carte[] },
  ) => void;
  enCours: boolean;
}
```

La signature de `lancerDistribution` est **identique** à celle de `useAnimations.lancerDistribution` actuelle, pour faciliter l'intégration dans `useControleurJeu`.

- Gère les `SharedValue` Reanimated pour chaque carte (progression 0→1)
- Calcule les `RSXform` dans `useRSXformBuffer` : Bézier + rotation + scale
- Appelle `runOnJS(onPaquetArrive)` quand un paquet atterrit
- Appelle `runOnJS(onTerminee)` quand toutes les cartes sont arrivées
- Rend en interne le `<Canvas>` Skia avec `drawAtlas`

### 8. Intégration dans CoucheAnimation et useControleurJeu

`CoucheAnimation.tsx` ajoute le rendu conditionnel :

```tsx
{
  phaseDistribution && <DistributionCanvas {...propsDistribution} />;
}
{
  /* CarteAnimee existants pour jeu/ramassage (toujours rendus) */
}
```

`useControleurJeu.ts` est modifié pour :

- Appeler `useAtlasCartes()` et passer le résultat à `useAnimationsDistribution`
- Appeler `useAnimationsDistribution.lancerDistribution()` au lieu de `useAnimations.lancerDistribution()` pendant la distribution
- Les callbacks `onPaquetArrive` et `onTerminee` restent identiques (même logique de mise à jour d'état)
- `annulerAnimations` de `useAnimations` suffit pour les animations non-distribution ; la distribution Atlas s'arrête naturellement quand les SharedValues atteignent 1

## Changements sur les animations existantes (jeu/ramassage)

`CarteAnimee.tsx` est enrichi pour les animations non-distribution :

- **Arc subtil** : même Bézier quadratique avec décalage perpendiculaire ~5%
- **Ease-out** : `Easing.out(Easing.cubic)` pour le jeu de carte ; ramassage conserve `inout-cubic`
- Pas de migration vers Atlas (composants individuels suffisent pour 1-4 cartes)

## Changements techniques

### Fichiers créés

| Fichier                                              | Rôle                                                  |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `assets/sprites/sprite-sheet.png`                    | Sprite sheet 8×5 (32 faces + 1 dos)                   |
| `assets/sprites/dos.png`                             | Dos de carte seul                                     |
| `apps/mobile/scripts/generer-sprite-sheet.ts`        | Script génération sprite sheet (sharp en devDep)      |
| `apps/mobile/hooks/useAtlasCartes.ts`                | Hook : chargement sprite sheet, rectSource, rectDos   |
| `apps/mobile/components/game/DistributionCanvas.tsx` | Canvas Skia Atlas pour la distribution                |
| `apps/mobile/hooks/useAnimationsDistribution.ts`     | Hook orchestration distribution (withDelay + RSXform) |

### Fichiers modifiés

| Fichier                                           | Nature du changement                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/mobile/constants/layout.ts`                 | Ajout `arcDistribution.decalagePerpendiculaire`, changement easing → `out-cubic` |
| `apps/mobile/hooks/useAnimations.ts`              | Retirer la logique distribution, déléguer à `useAnimationsDistribution`          |
| `apps/mobile/hooks/useControleurJeu.ts`           | Intégrer `useAtlasCartes` + `useAnimationsDistribution`, router les appels       |
| `apps/mobile/components/game/CoucheAnimation.tsx` | Routage conditionnel : `DistributionCanvas` si distribution, sinon `CarteAnimee` |
| `apps/mobile/components/game/CarteAnimee.tsx`     | Ajouter arc Bézier + ease-out pour jeu/ramassage                                 |

### Fichiers NON impactés

- `Carte.tsx` — rendu des cartes dans la main (pas en vol)
- `PaquetCentral.tsx` — paquet visuel au centre (reste identique)
- `MainJoueur.tsx` — éventail du joueur (pas d'animation de vol)
- `ZoneCarteRetournee.tsx` — carte retournée pendant enchères
- `PlateauJeu.tsx` — structure générale (le routage est dans `CoucheAnimation`)

## Risques et mitigations

| Risque                                                   | Mitigation                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Skia `drawAtlas` pas supporté sur toutes les plateformes | Tester iOS, Android, Web. Fallback : garder `CarteAnimee` si Atlas non dispo  |
| Sprite sheet trop lourde en mémoire                      | ~1336×1210 ≈ 6.5MB décompressé, acceptable pour un jeu mobile                 |
| `useRSXformBuffer` : API Skia peut évoluer               | Encapsuler dans `useAnimationsDistribution`, changement localisé              |
| `runOnJS` latence pour callbacks                         | Acceptable : les callbacks ne sont pas time-critical (mise à jour état React) |
