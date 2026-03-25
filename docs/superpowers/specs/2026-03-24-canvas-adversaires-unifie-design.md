# Canvas adversaires unifie — suppression du flash de bascule

**Date :** 2026-03-24

## Contexte

Les mains des 3 adversaires (nord, est, ouest) sont rendues par deux systemes distincts qui alternent :

- **Pendant la distribution** : `DistributionCanvas` (un seul Canvas Skia, drawAtlas) dessine les dos de cartes en vol puis au repos (progression = 1). `MainAdversaire` est demonte.
- **Apres la distribution** : `DistributionCanvas` se demonte, `MainAdversaire` se monte (24 Canvas Skia individuels via `CarteDosAtlas`).

Cette bascule provoque un flash visible (changement de couleur des dos de cartes) a la transition.

## Objectif

Remplacer ces deux systemes par un **Canvas Skia unique et permanent** (`CanvasAdversaires`) qui dessine les dos de cartes adversaires dans toutes les phases — distribution, encheres, jeu. Zero bascule de vue, zero flash.

Bonus : gain de performance — 1 draw call au lieu de 24 Canvas individuels pendant le jeu.

## Hors scope

- La main du joueur sud (`MainJoueur`) — fonctionne bien, on n'y touche pas
- Les animations de jeu de carte (main -> pli) via `CarteAnimee` — inchangees
- Les animations de retournement/flip

---

## Section 1 — `CanvasAdversaires` (nouveau composant)

**Fichier :** `apps/mobile/components/game/CanvasAdversaires.tsx`

**Role :** Canvas Skia unique qui dessine tous les dos de cartes des 3 adversaires via `drawAtlas`. Monte des le debut de la partie, ne se demonte jamais.

**Props :**

```typescript
interface PropsCanvasAdversaires {
  atlas: AtlasCartes;
  largeurEcran: number;
  hauteurEcran: number;
  nbCartesAdversaires: { nord: number; est: number; ouest: number };
  // Donnees de distribution (SharedValues partagees avec le hook)
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  nbCartesActives: SharedValue<number>;
  distributionEnCours: boolean;
}
```

**Pool de sprites :** Max 24 sprites (8 par adversaire, distribution 3+5).

**Worklet RSXform :** Meme logique que `DistributionCanvas` actuel :

- Si `progression[i]` est entre 0 et 1 : interpolation Bezier quadratique (carte en vol)
- Si `progression[i]` = 1 : la carte est a sa position d'eventail finale (les donnees d'arrivee dans `donneesWorklet` correspondent deja a la position d'eventail)
- Si `progression[i]` < 0 ou > 1 : carte hors ecran

**Sprites source :** Toujours `calculerVersoSource` (dos de carte) — un seul rect source pour tous les sprites.

---

## Section 2 — Mise a jour des positions d'eventail pendant le jeu

Quand `nbCartesAdversaires` change (un bot joue une carte), les positions d'eventail doivent etre recalculees.

**Mecanisme :**

1. Un `useEffect` dans `CanvasAdversaires` reagit aux changements de `nbCartesAdversaires`
2. Il recalcule les positions d'eventail pour les 3 adversaires via `calculerCiblesEventailAdversaire` (fonction existante dans `distributionLayoutAtlas.ts`)
3. Les resultats (position normalisee, rotation, echelle) sont ecrits dans `donneesWorklet.value` aux indices correspondants, avec les champs depart = arrivee (pas d'interpolation)
4. Les progressions sont forcees a 1 pour ces cartes
5. Le worklet lit les nouvelles donnees au frame suivant — repositionnement instantane

**Gestion des indices apres distribution :**

Pendant la distribution, les indices dans `donneesWorklet` sont attribues par `useAnimationsDistribution` dans l'ordre d'envol. Apres la distribution, quand on passe en mode repos, le `useEffect` reecrit les indices de facon compacte :

- Indices 0..n1-1 : cartes nord
- Indices n1..n1+n2-1 : cartes ouest
- Indices n1+n2..n1+n2+n3-1 : cartes est

`nbCartesActives.value` est mis a jour au total.

---

## Section 3 — Separation des cartes sud dans `useAnimationsDistribution`

Le hook produit aujourd'hui un seul tableau `cartesAtlas` melangeant les 4 joueurs. On le separe en deux sorties :

**Nouvelles sorties :**

- `cartesAtlasAdversaires: CarteAtlas[]` — consommees par `CanvasAdversaires`
- `cartesAtlasSud: CarteAtlas[]` — consommees par `DistributionCanvasSud`

**SharedValues :** Le pool unique `progressions` et `donneesWorklet` est partage. Chaque canvas connait ses indices :

- `CanvasAdversaires` : indices des cartes adversaires
- `DistributionCanvasSud` : indices des cartes sud

Le hook expose les bornes d'indices pour que chaque canvas sache quelle plage lire.

**Logique de masquage sud :** Inchangee — les cartes sud sont masquees (progression = 2) au depart du paquet suivant, car `MainJoueur` les affiche deja.

**Logique adversaires :** Les cartes adversaires ne sont jamais masquees dans le canvas — elles restent visibles a leur position d'eventail finale jusqu'a ce que `nbCartesAdversaires` change.

---

## Section 4 — Renommage `DistributionCanvas` -> `DistributionCanvasSud`

`DistributionCanvas.tsx` est renomme en `DistributionCanvasSud.tsx`. Il ne gere plus que les cartes sud en vol pendant la distribution.

**Changements :**

- Filtre ses sprites/transforms sur les indices des cartes sud uniquement
- Se demonte quand la distribution est terminee (comportement inchange)
- Le reste de la logique est identique

---

## Section 5 — Integration dans `CoucheAnimation` et `PlateauJeu`

**`CoucheAnimation.tsx` :**

Rend trois couches :

1. `CanvasAdversaires` — permanent (zIndex bas), recoit `nbCartesAdversaires`
2. `DistributionCanvasSud` — ephemere, uniquement pendant la distribution (zIndex haut)
3. `CarteAnimee` individuelles — pour les animations main -> pli (inchange)

Nouvelles props : `nbCartesAdversaires` (transmis depuis `PlateauJeu`).

**`PlateauJeu.tsx` :**

- Supprime les 3 `<MainAdversaire>` et le guard `{!distributionEnCours && (...)}`
- Passe `nbCartesAdversaires` a `CoucheAnimation`
- Import de `MainAdversaire` supprime

---

## Fichiers impactes

| Fichier                                                 | Action                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `CanvasAdversaires.tsx`                                 | **Nouveau** — Canvas Skia unique drawAtlas pour les 3 mains adversaires                      |
| `DistributionCanvas.tsx` -> `DistributionCanvasSud.tsx` | **Renomme** — ne gere plus que les cartes sud en vol                                         |
| `MainAdversaire.tsx`                                    | **Supprime**                                                                                 |
| `CoucheAnimation.tsx`                                   | Rend `CanvasAdversaires` + `DistributionCanvasSud` + `CarteAnimee`                           |
| `PlateauJeu.tsx`                                        | Supprime les 3 `<MainAdversaire>`, passe `nbCartesAdversaires` a `CoucheAnimation`           |
| `useAnimationsDistribution.ts`                          | Separe la sortie en `cartesAtlasAdversaires` / `cartesAtlasSud`, expose les bornes d'indices |

## Ce qui ne change pas

- `MainJoueur` et tout le rendu de la main sud
- `CarteAnimee` (animations main -> pli pendant le jeu)
- `useAtlasCartes`
- Les constantes `ADVERSAIRE` dans `layout.ts`
- La logique dans `useControleurJeu` (`nbCartesAdversaires`, callbacks)
- `distributionLayoutAtlas.ts` (`calculerCiblesEventailAdversaire` reutilise tel quel)
- `distributionAtlas.ts` (fonctions de calcul de sprites et Bezier)
