# Animation Distribution Réaliste — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'animation de distribution directe (centre → main) par une animation réaliste en 3 phases : cartes face cachée sur le tapis → prise en main avec flip 3D → tri.

**Architecture:** Le système d'animation existant (`useAnimations` → `CoucheAnimation` → `CarteAnimee`) est enrichi avec : (1) un nouveau type `CarteSurTapis` pour les cartes posées sur la table, (2) un flip 3D par double couche `backfaceVisibility: 'hidden'` dans `CarteAnimee`, (3) une orchestration 3 phases dans `useControleurJeu`. La machine XState reste inchangée.

**Tech Stack:** React Native, react-native-reanimated v4, TypeScript strict, Expo SDK 54

**Spec:** `docs/superpowers/specs/2026-03-17-animation-distribution-design.md`

---

## Structure des fichiers

| Fichier                                           | Action   | Responsabilité                                                                                      |
| ------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `apps/mobile/constants/layout.ts`                 | Modifier | Ajouter `POSITIONS_TAPIS`, mettre à jour constantes distribution                                    |
| `apps/mobile/components/game/Carte.tsx`           | Modifier | Exporter `CarteDos` et `CarteFace`                                                                  |
| `apps/mobile/components/game/CarteAnimee.tsx`     | Modifier | Ajouter flip 3D (double couche + rotateY + easing configurable)                                     |
| `apps/mobile/components/game/CoucheAnimation.tsx` | Modifier | Ajouter type `CarteSurTapis`, rendre cartes sur tapis + cartes en vol                               |
| `apps/mobile/hooks/useAnimations.ts`              | Modifier | Refonte distribution Phase 1, nouvelle méthode `lancerPriseEnMain`, méthode `glisserCarteRetournee` |
| `apps/mobile/hooks/useControleurJeu.ts`           | Modifier | Orchestration 3 phases, state `cartesSurTapis`, gestion carte retournée                             |
| `apps/mobile/components/game/PlateauJeu.tsx`      | Modifier | Passer `cartesSurTapis` à `CoucheAnimation`                                                         |

---

## Task 1 : Constantes de layout — positions tapis et timings

**Files:**

- Modify: `apps/mobile/constants/layout.ts:70-103`

- [ ] **Step 1: Ajouter `POSITIONS_TAPIS`**

Après `POSITIONS_MAINS` (ligne 112-117), ajouter :

```typescript
// --- Positions tapis (où les cartes atterrissent face cachée avant la prise en main) ---
export const POSITIONS_TAPIS = {
  sud: { x: 0.5, y: 0.75 },
  nord: { x: 0.5, y: 0.18 },
  ouest: { x: 0.18, y: 0.5 },
  est: { x: 0.82, y: 0.5 },
} as const;
```

- [ ] **Step 2: Mettre à jour les constantes de distribution**

Remplacer le bloc `distribution` dans `ANIMATIONS` (lignes 73-81) par :

```typescript
distribution: {
  // Phase 1 — vol centre → tapis
  dureeCarte: 300,
  delaiDansPaquet: 60,
  delaiEntreJoueurs: 200,
  pauseEntreTours: 500,
  offsetAleatoireMax: 0.02,
  rotationAleatoireMax: 15,
  decalagePaquet2: 0.03,
  // Phase 2 — prise en main (flip + vol tapis → main)
  dureePriseEnMain: 400,
  staggerPriseEnMain: 80,
  pauseAvantPrise: 200,
  // Phase 3 — tri (existant)
  pauseAvantTri: 400,
  // Distribution restante — slide carte retournée
  dureeSlideRetournee: 300,
  // Origine (centre du tapis)
  originX: 0.5,
  originY: 0.45,
},
```

- [ ] **Step 3: Vérifier le typecheck**

Run: `pnpm --filter @belote/mobile typecheck`
Expected: PASS (les types sont inférés par `as const`)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/constants/layout.ts
git commit -m "feat(mobile): ajouter positions tapis et constantes distribution 3 phases"
```

---

## Task 2 : Exporter `CarteDos` et `CarteFace` depuis Carte.tsx

**Files:**

- Modify: `apps/mobile/components/game/Carte.tsx:105,199`

- [ ] **Step 1: Exporter CarteDos**

Ligne 105, remplacer :

```typescript
function CarteDos({ largeur, hauteur }: { largeur: number; hauteur: number }) {
```

par :

```typescript
export function CarteDos({ largeur, hauteur }: { largeur: number; hauteur: number }) {
```

- [ ] **Step 2: Exporter CarteFace**

Ligne 199, remplacer :

```typescript
function CarteFace({
```

par :

```typescript
export function CarteFace({
```

- [ ] **Step 3: Vérifier que CarteSkia fonctionne toujours**

Run: `pnpm --filter @belote/mobile typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/game/Carte.tsx
git commit -m "feat(mobile): exporter CarteDos et CarteFace pour le flip 3D"
```

---

## Task 3 : Enrichir `CarteEnVol` et `CoucheAnimation` avec `CarteSurTapis`

**Files:**

- Modify: `apps/mobile/components/game/CoucheAnimation.tsx`

- [ ] **Step 1: Ajouter les types `CarteSurTapis` et enrichir `CarteEnVol`**

Remplacer le contenu complet de `CoucheAnimation.tsx` :

```typescript
import type { Carte, PositionJoueur } from "@belote/shared-types";
import { View } from "react-native";

import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { CarteDos, CarteFace } from "./Carte";
import { CarteAnimee, type PositionCarte } from "./CarteAnimee";

export interface CarteEnVol {
  id: string;
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  duree: number;
  /** rotateY départ en degrés (0 = dos, 180 = face). Absent = pas de flip. */
  flipDe?: number;
  /** rotateY arrivée en degrés */
  flipVers?: number;
  /** Profil d'easing. Défaut: 'out-cubic' */
  easing?: "out-cubic" | "inout-cubic";
}

export interface CarteSurTapis {
  id: string;
  carte: Carte;
  position: PositionJoueur;
  x: number;
  y: number;
  rotation: number;
  faceVisible: boolean;
  paquet: 1 | 2;
}

interface PropsCoucheAnimation {
  cartesEnVol: CarteEnVol[];
  cartesSurTapis: CarteSurTapis[];
  largeurEcran: number;
  hauteurEcran: number;
  onAnimationTerminee: (id: string) => void;
}

/**
 * Couche transparente superposée au plateau pour afficher
 * les cartes en cours d'animation et les cartes posées sur le tapis.
 */
export function CoucheAnimation({
  cartesEnVol,
  cartesSurTapis,
  largeurEcran,
  hauteurEcran,
  onAnimationTerminee,
}: PropsCoucheAnimation) {
  if (cartesEnVol.length === 0 && cartesSurTapis.length === 0) return null;

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
      }}
      pointerEvents="none"
    >
      {/* Cartes posées sur le tapis (statiques, z-index inférieur) */}
      {cartesSurTapis.map((cst) => (
        <View
          key={cst.id}
          style={{
            position: "absolute",
            left: cst.x * largeurEcran - largeurCarte / 2,
            top: cst.y * hauteurEcran - hauteurCarte / 2,
            transform: [{ rotate: `${cst.rotation}deg` }],
            zIndex: 40,
          }}
        >
          {cst.faceVisible ? (
            <CarteFace carte={cst.carte} largeur={largeurCarte} hauteur={hauteurCarte} />
          ) : (
            <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
          )}
        </View>
      ))}

      {/* Cartes en vol (animées, z-index supérieur) */}
      {cartesEnVol.map((vol) => (
        <CarteAnimee
          key={vol.id}
          carte={vol.carte}
          depart={vol.depart}
          arrivee={vol.arrivee}
          faceVisible={vol.faceVisible}
          duree={vol.duree}
          flipDe={vol.flipDe}
          flipVers={vol.flipVers}
          easing={vol.easing}
          largeurEcran={largeurEcran}
          hauteurEcran={hauteurEcran}
          onTerminee={() => onAnimationTerminee(vol.id)}
        />
      ))}
    </View>
  );
}
```

Note : `CarteFace` est importé avec `CarteDos` dans le même import (corrigé ci-dessus).

- [ ] **Step 2: Vérifier le typecheck**

Run: `pnpm --filter @belote/mobile typecheck`
Expected: Des erreurs temporaires dans les fichiers qui utilisent `CoucheAnimation` (il manque le nouveau prop `cartesSurTapis`). C'est attendu — elles seront résolues dans les tâches suivantes.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/game/CoucheAnimation.tsx
git commit -m "feat(mobile): enrichir CoucheAnimation avec CarteSurTapis et CarteEnVol étendu"
```

---

## Task 4 : Flip 3D dans `CarteAnimee`

**Files:**

- Modify: `apps/mobile/components/game/CarteAnimee.tsx`

- [ ] **Step 1: Réécrire CarteAnimee avec support du flip**

Remplacer le contenu complet de `CarteAnimee.tsx` :

```typescript
import type { Carte } from "@belote/shared-types";
import { useEffect } from "react";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { CarteDos, CarteFace, CarteSkia } from "./Carte";

export interface PositionCarte {
  x: number;
  y: number;
  rotation: number;
  echelle: number;
}

interface PropsCarteAnimee {
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  duree: number;
  largeurEcran: number;
  hauteurEcran: number;
  onTerminee?: () => void;
  /** rotateY départ en degrés (0 = dos, 180 = face). Absent = pas de flip. */
  flipDe?: number;
  /** rotateY arrivée en degrés */
  flipVers?: number;
  /** Profil d'easing. Défaut: 'out-cubic' */
  easing?: "out-cubic" | "inout-cubic";
}

const EASINGS = {
  "out-cubic": Easing.out(Easing.cubic),
  "inout-cubic": Easing.inOut(Easing.cubic),
};

/**
 * Carte qui vole entre deux positions avec Reanimated.
 * Supporte optionnellement un flip 3D (rotateY) via deux couches
 * dos/face avec backfaceVisibility: 'hidden'.
 */
export function CarteAnimee({
  carte,
  depart,
  arrivee,
  faceVisible,
  duree,
  largeurEcran,
  hauteurEcran,
  onTerminee,
  flipDe,
  flipVers,
  easing = "out-cubic",
}: PropsCarteAnimee) {
  const progres = useSharedValue(0);
  const aFlip = flipDe !== undefined && flipVers !== undefined;

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  useEffect(() => {
    progres.value = withTiming(
      1,
      { duration: duree, easing: EASINGS[easing] },
      (termine) => {
        "worklet";
        if (termine && onTerminee) {
          runOnJS(onTerminee)();
        }
      },
    );
  }, [progres, duree, onTerminee, easing]);

  // Style du conteneur (position + rotation Z + scale)
  const styleConteneur = useAnimatedStyle(() => {
    const t = progres.value;
    const x = depart.x + (arrivee.x - depart.x) * t;
    const y = depart.y + (arrivee.y - depart.y) * t;
    const rotation = depart.rotation + (arrivee.rotation - depart.rotation) * t;
    const echelle = depart.echelle + (arrivee.echelle - depart.echelle) * t;

    return {
      position: "absolute" as const,
      left: x * largeurEcran - largeurCarte / 2,
      top: y * hauteurEcran - hauteurCarte / 2,
      transform: [{ rotate: `${rotation}deg` }, { scale: echelle }],
      zIndex: 100,
    };
  });

  // Sans flip → rendu simple (comportement existant)
  if (!aFlip) {
    return (
      <Animated.View style={styleConteneur}>
        <CarteSkia
          carte={carte}
          largeur={largeurCarte}
          hauteur={hauteurCarte}
          faceVisible={faceVisible}
        />
      </Animated.View>
    );
  }

  // Avec flip → deux couches superposées avec backfaceVisibility
  const flipDeVal = flipDe!;
  const flipVersVal = flipVers!;

  // Style de la couche dos (rotateY de flipDe à flipVers)
  const styleDos = useAnimatedStyle(() => {
    const t = progres.value;
    const rotY = flipDeVal + (flipVersVal - flipDeVal) * t;
    return {
      position: "absolute" as const,
      width: largeurCarte,
      height: hauteurCarte,
      backfaceVisibility: "hidden" as const,
      transform: [{ perspective: 800 }, { rotateY: `${rotY}deg` }],
    };
  });

  // Style de la couche face (décalée de 180° par rapport au dos)
  const styleFace = useAnimatedStyle(() => {
    const t = progres.value;
    const rotY = flipDeVal + (flipVersVal - flipDeVal) * t;
    return {
      position: "absolute" as const,
      width: largeurCarte,
      height: hauteurCarte,
      backfaceVisibility: "hidden" as const,
      transform: [{ perspective: 800 }, { rotateY: `${rotY + 180}deg` }],
    };
  });

  return (
    <Animated.View style={styleConteneur}>
      <Animated.View style={styleDos}>
        <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
      </Animated.View>
      <Animated.View style={styleFace}>
        <CarteFace carte={carte} largeur={largeurCarte} hauteur={hauteurCarte} />
      </Animated.View>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `pnpm --filter @belote/mobile typecheck`
Expected: PASS (ou erreurs résiduelles liées au prop `cartesSurTapis` manquant dans `PlateauJeu`)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/game/CarteAnimee.tsx
git commit -m "feat(mobile): ajouter flip 3D et easing configurable dans CarteAnimee"
```

---

## Task 5 : Refonte de `useAnimations` — Phase 1 + Phase 2

**Files:**

- Modify: `apps/mobile/hooks/useAnimations.ts`

- [ ] **Step 1: Réécrire useAnimations avec les 3 méthodes**

Remplacer le contenu complet de `useAnimations.ts` :

```typescript
import type { Carte, PositionJoueur } from "@belote/shared-types";
import { useCallback, useRef, useState } from "react";

import type { CarteEnVol, CarteSurTapis } from "../components/game/CoucheAnimation";
import {
  ANIMATIONS,
  POSITIONS_MAINS,
  POSITIONS_PILES,
  POSITIONS_PLI,
  POSITIONS_TAPIS,
  variationCartePli,
} from "../constants/layout";

const POSITIONS_JOUEUR: PositionJoueur[] = ["sud", "ouest", "nord", "est"];

/** Génère un offset aléatoire dans [-max, +max] */
function aleatoire(max: number): number {
  return (Math.random() * 2 - 1) * max;
}

/**
 * Hook central de gestion des animations de cartes.
 * Gère les cartes en vol, les cartes sur le tapis,
 * et expose des fonctions pour déclencher chaque type d'animation.
 */
export function useAnimations() {
  const [cartesEnVol, setCartesEnVol] = useState<CarteEnVol[]>([]);
  const [cartesSurTapis, setCartesSurTapis] = useState<CarteSurTapis[]>([]);
  const compteurId = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Nettoyage des timeouts
  const nettoyerTimeouts = useCallback(() => {
    for (const t of timeoutsRef.current) {
      clearTimeout(t);
    }
    timeoutsRef.current = [];
  }, []);

  // Retirer une carte en vol terminée
  const surAnimationTerminee = useCallback((id: string) => {
    setCartesEnVol((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // --- Phase 1 : Distribution sur le tapis ---
  const lancerDistribution = useCallback(
    (
      mains: Record<PositionJoueur, Carte[]>,
      options?: {
        /** Appelé quand une carte atterrit sur le tapis */
        onCarteArrivee?: (carteSurTapis: CarteSurTapis) => void;
        /** Appelé quand un joueur a toutes ses cartes sur le tapis */
        onJoueurComplet?: (position: PositionJoueur) => void;
        onTerminee?: () => void;
        /** Cartes qui doivent être posées face visible (ex: carte retournée du preneur) */
        cartesVisibles?: Carte[];
      },
    ) => {
      nettoyerTimeouts();
      const { distribution } = ANIMATIONS;

      // Construire les paquets comme en vraie Belote
      const nbCartesParJoueur = Math.max(
        ...POSITIONS_JOUEUR.map((pos) => mains[pos].length),
      );
      const taillesPaquets: number[] = [];
      let cartesRestantes = nbCartesParJoueur;
      if (cartesRestantes >= 3) {
        taillesPaquets.push(3);
        cartesRestantes -= 3;
      }
      while (cartesRestantes > 0) {
        const taille = Math.min(cartesRestantes, 3);
        taillesPaquets.push(taille);
        cartesRestantes -= taille;
      }

      // Compteur de cartes arrivées par joueur
      const cartesArrivees: Record<PositionJoueur, number> = {
        sud: 0,
        ouest: 0,
        nord: 0,
        est: 0,
      };
      const cartesAttenduesTotales: Record<PositionJoueur, number> = {
        sud: mains.sud.length,
        ouest: mains.ouest.length,
        nord: mains.nord.length,
        est: mains.est.length,
      };

      // Séquence de vol
      type CarteAvecDelai = {
        carte: Carte;
        position: PositionJoueur;
        delai: number;
        indexDansPaquet: number;
        numPaquet: number;
      };
      const sequence: CarteAvecDelai[] = [];

      let temps = 0;
      let indexCarte = 0;

      for (let p = 0; p < taillesPaquets.length; p++) {
        const taillePaquet = taillesPaquets[p];
        if (indexCarte > 0) {
          temps += distribution.pauseEntreTours;
        }

        for (const position of POSITIONS_JOUEUR) {
          const cartesJoueur = mains[position];

          for (let c = 0; c < taillePaquet && indexCarte + c < cartesJoueur.length; c++) {
            sequence.push({
              carte: cartesJoueur[indexCarte + c],
              position,
              delai: temps + c * distribution.delaiDansPaquet,
              indexDansPaquet: c,
              numPaquet: p + 1,
            });
          }

          temps += distribution.delaiEntreJoueurs;
        }

        indexCarte += taillePaquet;
      }

      // Lancer chaque carte
      for (const { carte, position, delai, numPaquet } of sequence) {
        const posTapis = POSITIONS_TAPIS[position];
        // Décalage pour distinguer paquet 1 et 2
        const decalageXPaquet = numPaquet === 2 ? distribution.decalagePaquet2 : 0;
        // Position finale aléatoire sur le tapis
        const xFinal =
          posTapis.x + decalageXPaquet + aleatoire(distribution.offsetAleatoireMax);
        const yFinal = posTapis.y + aleatoire(distribution.offsetAleatoireMax);
        const rotFinal = aleatoire(distribution.rotationAleatoireMax);

        const estVisible =
          options?.cartesVisibles?.some(
            (cv) => cv.couleur === carte.couleur && cv.rang === carte.rang,
          ) ?? false;

        const timeout = setTimeout(() => {
          compteurId.current += 1;
          const id = `distrib-${compteurId.current}`;

          const vol: CarteEnVol = {
            id,
            carte,
            depart: {
              x: distribution.originX,
              y: distribution.originY,
              rotation: 0,
              echelle: 0.5,
            },
            arrivee: {
              x: xFinal,
              y: yFinal,
              rotation: rotFinal,
              echelle: 1,
            },
            faceVisible: estVisible,
            duree: distribution.dureeCarte,
          };

          setCartesEnVol((prev) => [...prev, vol]);

          // Quand la carte atterrit → créer CarteSurTapis
          const timeoutArrivee = setTimeout(() => {
            const cst: CarteSurTapis = {
              id: `tapis-${id}`,
              carte,
              position,
              x: xFinal,
              y: yFinal,
              rotation: rotFinal,
              faceVisible: estVisible,
              paquet: numPaquet as 1 | 2,
            };
            setCartesSurTapis((prev) => [...prev, cst]);
            options?.onCarteArrivee?.(cst);

            // Vérifier si le joueur a toutes ses cartes
            cartesArrivees[position] += 1;
            if (cartesArrivees[position] >= cartesAttenduesTotales[position]) {
              options?.onJoueurComplet?.(position);
            }
          }, distribution.dureeCarte);

          timeoutsRef.current.push(timeoutArrivee);
        }, delai);

        timeoutsRef.current.push(timeout);
      }

      // Callback de fin après toutes les animations
      if (options?.onTerminee) {
        const dernierDelai =
          sequence.length > 0 ? sequence[sequence.length - 1].delai : 0;
        const dureeTotale = dernierDelai + distribution.dureeCarte;
        const timeout = setTimeout(options.onTerminee, dureeTotale);
        timeoutsRef.current.push(timeout);
      }
    },
    [nettoyerTimeouts],
  );

  // --- Phase 2 : Prise en main (flip + vol tapis → main) ---
  const lancerPriseEnMain = useCallback(
    (
      position: PositionJoueur,
      cartesATrouver: CarteSurTapis[],
      positionsArrivee: { x: number; y: number }[],
      options?: {
        flipVers?: number; // 180 = révèle la face (sud), 0 ou absent = reste dos (bots)
        onTerminee?: () => void;
      },
    ) => {
      const { distribution } = ANIMATIONS;

      for (let i = 0; i < cartesATrouver.length; i++) {
        const cst = cartesATrouver[i];
        const posArrivee = positionsArrivee[i] ?? POSITIONS_MAINS[position];
        const delai = i * distribution.staggerPriseEnMain;
        const doitFlip = options?.flipVers !== undefined;

        const timeout = setTimeout(() => {
          // Retirer du tapis
          setCartesSurTapis((prev) => prev.filter((c) => c.id !== cst.id));

          compteurId.current += 1;
          const id = `prise-${compteurId.current}`;

          const vol: CarteEnVol = {
            id,
            carte: cst.carte,
            depart: {
              x: cst.x,
              y: cst.y,
              rotation: cst.rotation,
              echelle: 1.1, // soulèvement
            },
            arrivee: {
              x: posArrivee.x,
              y: posArrivee.y,
              rotation: 0,
              echelle: 1,
            },
            faceVisible: cst.faceVisible,
            duree: distribution.dureePriseEnMain,
            easing: "inout-cubic",
            ...(doitFlip
              ? {
                  flipDe: cst.faceVisible ? 180 : 0,
                  flipVers: options!.flipVers!,
                }
              : {}),
          };

          setCartesEnVol((prev) => [...prev, vol]);
        }, delai);

        timeoutsRef.current.push(timeout);
      }

      // Callback de fin
      if (options?.onTerminee) {
        const dureeTotale =
          (cartesATrouver.length - 1) * distribution.staggerPriseEnMain +
          distribution.dureePriseEnMain;
        const timeout = setTimeout(options.onTerminee, dureeTotale);
        timeoutsRef.current.push(timeout);
      }
    },
    [],
  );

  // --- Slide de la carte retournée vers le tapis du preneur ---
  const glisserCarteRetournee = useCallback(
    (
      carte: Carte,
      xDepart: number,
      yDepart: number,
      preneur: PositionJoueur,
      onTerminee?: (carteSurTapis: CarteSurTapis) => void,
    ) => {
      const { distribution } = ANIMATIONS;
      const posTapis = POSITIONS_TAPIS[preneur];
      const xArrivee = posTapis.x + aleatoire(distribution.offsetAleatoireMax);
      const yArrivee = posTapis.y + aleatoire(distribution.offsetAleatoireMax);
      const rotArrivee = aleatoire(distribution.rotationAleatoireMax);

      compteurId.current += 1;
      const id = `slide-retournee-${compteurId.current}`;

      const vol: CarteEnVol = {
        id,
        carte,
        depart: {
          x: xDepart,
          y: yDepart,
          rotation: 0,
          echelle: 1,
        },
        arrivee: {
          x: xArrivee,
          y: yArrivee,
          rotation: rotArrivee,
          echelle: 1,
        },
        faceVisible: true,
        duree: distribution.dureeSlideRetournee,
        easing: "inout-cubic",
      };

      setCartesEnVol((prev) => [...prev, vol]);

      // Créer CarteSurTapis quand elle arrive et la passer au callback
      const timeout = setTimeout(() => {
        const cst: CarteSurTapis = {
          id: `tapis-${id}`,
          carte,
          position: preneur,
          x: xArrivee,
          y: yArrivee,
          rotation: rotArrivee,
          faceVisible: true,
          paquet: 1,
        };
        setCartesSurTapis((prev) => [...prev, cst]);
        onTerminee?.(cst);
      }, distribution.dureeSlideRetournee);

      timeoutsRef.current.push(timeout);
    },
    [],
  );

  // --- Jeu de carte (main → centre avec variation naturelle) --- (INCHANGÉ)
  const lancerAnimationJeuCarte = useCallback(
    (
      carte: Carte,
      joueur: PositionJoueur,
      onTerminee?: () => void,
      positionDepartCustom?: { x: number; y: number },
    ) => {
      compteurId.current += 1;
      const id = `jeu-${compteurId.current}`;
      const posDepart = positionDepartCustom ?? POSITIONS_MAINS[joueur];
      const posArrivee = POSITIONS_PLI[joueur];
      const { decalageX, decalageY, rotation } = variationCartePli(
        carte.couleur,
        carte.rang,
        joueur,
      );

      const vol: CarteEnVol = {
        id,
        carte,
        depart: {
          x: posDepart.x,
          y: posDepart.y,
          rotation: 0,
          echelle: 1,
        },
        arrivee: {
          x: posArrivee.x + decalageX,
          y: posArrivee.y + decalageY,
          rotation,
          echelle: 0.9,
        },
        faceVisible: true,
        duree: ANIMATIONS.jeuCarte.duree,
      };

      setCartesEnVol((prev) => [...prev, vol]);

      if (onTerminee) {
        const timeout = setTimeout(onTerminee, ANIMATIONS.jeuCarte.duree);
        timeoutsRef.current.push(timeout);
      }
    },
    [],
  );

  // --- Ramassage du pli (centre → pile de l'équipe gagnante) --- (INCHANGÉ)
  const lancerAnimationRamassagePli = useCallback(
    (
      cartesPli: { joueur: PositionJoueur; carte: Carte }[],
      gagnant: PositionJoueur,
      onTerminee?: () => void,
      onDebutRamassage?: () => void,
    ) => {
      const indexGagnant = POSITIONS_JOUEUR.indexOf(gagnant);
      const equipe = indexGagnant % 2 === 0 ? "equipe1" : "equipe2";
      const posPile = POSITIONS_PILES[equipe];
      const rotationArrivee = equipe === "equipe2" ? 90 : 0;

      const dureeRamassage = 500;
      const delaiEntreCartes = 60;

      const timeout = setTimeout(() => {
        onDebutRamassage?.();

        for (let i = 0; i < cartesPli.length; i++) {
          const { joueur, carte } = cartesPli[i];

          const timeoutCarte = setTimeout(() => {
            compteurId.current += 1;
            const id = `ramassage-${compteurId.current}`;
            const posDepart = POSITIONS_PLI[joueur];
            const { decalageX, decalageY, rotation } = variationCartePli(
              carte.couleur,
              carte.rang,
              joueur,
            );

            const vol: CarteEnVol = {
              id,
              carte,
              depart: {
                x: posDepart.x + decalageX,
                y: posDepart.y + decalageY,
                rotation,
                echelle: 0.9,
              },
              arrivee: {
                x: posPile.x,
                y: posPile.y,
                rotation: rotationArrivee,
                echelle: 0.4,
              },
              faceVisible: false,
              duree: dureeRamassage,
            };

            setCartesEnVol((prev) => [...prev, vol]);
          }, i * delaiEntreCartes);

          timeoutsRef.current.push(timeoutCarte);
        }

        if (onTerminee) {
          const dureeTotale = (cartesPli.length - 1) * delaiEntreCartes + dureeRamassage;
          const timeoutFin = setTimeout(onTerminee, dureeTotale);
          timeoutsRef.current.push(timeoutFin);
        }
      }, ANIMATIONS.ramassagePli.delaiAvant);

      timeoutsRef.current.push(timeout);
    },
    [],
  );

  // Tout annuler (ex: quitter la partie)
  const annulerAnimations = useCallback(() => {
    nettoyerTimeouts();
    setCartesEnVol([]);
    setCartesSurTapis([]);
  }, [nettoyerTimeouts]);

  return {
    cartesEnVol,
    cartesSurTapis,
    surAnimationTerminee,
    lancerDistribution,
    lancerPriseEnMain,
    glisserCarteRetournee,
    lancerAnimationJeuCarte,
    lancerAnimationRamassagePli,
    annulerAnimations,
  };
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `pnpm --filter @belote/mobile typecheck`
Expected: Des erreurs dans `useControleurJeu.ts` car l'API de `lancerDistribution` a changé. C'est attendu.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/useAnimations.ts
git commit -m "feat(mobile): refonte useAnimations — distribution tapis + prise en main + slide retournée"
```

---

## Task 6 : Orchestration 3 phases dans `useControleurJeu`

**Files:**

- Modify: `apps/mobile/hooks/useControleurJeu.ts`

C'est la tâche la plus importante. Le hook doit orchestrer :

1. Phase 1 : distribution → cartes sur tapis
2. Phase 2 : prise en main par joueur (dès 5 cartes posées)
3. Phase 3 : tri (existant)

- [ ] **Step 0: Ajouter les refs nécessaires**

Près des autres refs (ligne ~232), ajouter :

```typescript
const cartesTapisParJoueurRef = useRef<Record<PositionJoueur, CarteSurTapis[]>>({
  sud: [],
  ouest: [],
  nord: [],
  est: [],
});
// Timeouts gérés par le contrôleur (pour les phases 2 et 3)
const timeoutsControleurRef = useRef<ReturnType<typeof setTimeout>[]>([]);
```

Ajouter l'import de `CarteSurTapis` en haut du fichier :

```typescript
import type { CarteSurTapis } from "../components/game/CoucheAnimation";
import { ANIMATIONS, POSITIONS_MAINS } from "../constants/layout";
```

**Important** : dans tout ce qui suit, `timeoutsRef` fait référence à `timeoutsControleurRef`. Tous les `setTimeout` créés dans le contrôleur doivent être enregistrés dans cette ref et nettoyés dans le cleanup.

- [ ] **Step 1: Exposer `cartesSurTapis` dans le return du hook**

À la fin du hook (ligne ~966), dans le `return`, ajouter `cartesSurTapis`:

```typescript
return {
  etatJeu,
  // Animations
  cartesEnVol: animations.cartesEnVol,
  cartesSurTapis: animations.cartesSurTapis,
  surAnimationTerminee: animations.surAnimationTerminee,
  // Actions
  demarrerPartie,
  jouerCarte,
  prendre,
  annoncer,
  passer,
  continuerApresScore,
  recommencer,
};
```

- [ ] **Step 2: Réécrire `lancerDistributionAnimee` (lignes 469-548)**

Remplacer la fonction `lancerDistributionAnimee` par :

```typescript
const lancerDistributionAnimee = useCallback(
  (contexte: ContextePartie) => {
    animationDistribEnCours.current = true;
    nbPlisVus.current = 0;

    const mainsRecord: Record<PositionJoueur, Carte[]> = {
      sud: contexte.mains[0],
      ouest: contexte.mains[1],
      nord: contexte.mains[2],
      est: contexte.mains[3],
    };

    // Réinitialiser l'état visuel
    setEtatJeu((prev) => ({
      ...prev,
      mainJoueur: [],
      nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
      pliEnCours: [],
    }));

    // Ref pour compter les prises en main terminées
    const prisesTerminees = { count: 0 };
    const nbJoueurs = 4;

    // Phase 2 callback : lancé quand un joueur a toutes ses cartes sur le tapis
    const lancerPhase2PourJoueur = (position: PositionJoueur) => {
      const { distribution } = ANIMATIONS;

      const timeoutPrise = setTimeout(() => {
        if (estDemonte.current) return;

        // Récupérer les cartes sur tapis de ce joueur
        // (on doit lire le state courant via un callback setState)
        setCartesSurTapisEtLancerPrise(position, mainsRecord[position], () => {
          // Phase 2 terminée pour ce joueur
          prisesTerminees.count += 1;

          // Ajouter les cartes dans la main du joueur
          if (position === "sud") {
            setEtatJeu((prev) => ({
              ...prev,
              mainJoueur: [...prev.mainJoueur, ...mainsRecord[position]],
            }));
          } else {
            setEtatJeu((prev) => ({
              ...prev,
              nbCartesAdversaires: {
                ...prev.nbCartesAdversaires,
                [position]:
                  prev.nbCartesAdversaires[position as "nord" | "est" | "ouest"] +
                  mainsRecord[position].length,
              },
            }));
          }

          // Si tous les joueurs ont pris leurs cartes → Phase 3
          if (prisesTerminees.count >= nbJoueurs) {
            lancerPhase3(contexte);
          }
        });
      }, distribution.pauseAvantPrise);

      timeoutsControleurRef.current.push(timeoutPrise);
    };

    // Réinitialiser le ref des cartes tapis
    cartesTapisParJoueurRef.current = { sud: [], ouest: [], nord: [], est: [] };

    // Phase 1 : distribution sur le tapis
    animations.lancerDistribution(mainsRecord, {
      onCarteArrivee: (cst) => {
        cartesTapisParJoueurRef.current[cst.position].push(cst);
      },
      onJoueurComplet: (position) => {
        if (estDemonte.current) return;
        lancerPhase2PourJoueur(position);
      },
    });
  },
  [animations, lancerPhase3],
);
```

Note : `setCartesSurTapisEtLancerPrise` et `lancerPhase3` sont des helper functions à définir. Voir step suivant.

- [ ] **Step 3: Comprendre la mécanique Phase 2 dans `lancerDistributionAnimee`**

La Phase 2 pour chaque joueur est lancée dans le callback `lancerPhase2PourJoueur` défini dans Step 2. Ce callback :

1. Attend `pauseAvantPrise` (200ms) après que les cartes sont posées
2. Lit les cartes du joueur depuis `cartesTapisParJoueurRef.current[position]`
3. Appelle `animations.lancerPriseEnMain()` avec les positions d'arrivée (position de la main)
4. Le flip est activé pour sud (`flipVers: 180`), désactivé pour les bots

**Note sur les positions d'arrivée** : pour simplifier, toutes les cartes arrivent au point central de la main (`POSITIONS_MAINS[position]`). `MainJoueur`/`MainAdversaire` gèrent ensuite le placement en éventail quand les cartes sont ajoutées au state. Si le résultat visuel n'est pas satisfaisant (toutes les cartes convergent vers le même point), on pourra calculer des positions d'éventail dans une itération future.

Réécrire le `lancerPhase2PourJoueur` dans `lancerDistributionAnimee` pour utiliser directement le ref :

```typescript
const lancerPhase2PourJoueur = (position: PositionJoueur) => {
  const { distribution } = ANIMATIONS;

  const timeoutPrise = setTimeout(() => {
    if (estDemonte.current) return;

    const cartesTapis = cartesTapisParJoueurRef.current[position];
    const posArrivee = POSITIONS_MAINS[position];
    const positionsArrivee = cartesTapis.map(() => ({
      x: posArrivee.x,
      y: posArrivee.y,
    }));

    const estSud = position === "sud";

    animations.lancerPriseEnMain(position, cartesTapis, positionsArrivee, {
      flipVers: estSud ? 180 : undefined,
      onTerminee: () => {
        prisesTerminees.count += 1;

        if (position === "sud") {
          setEtatJeu((prev) => ({
            ...prev,
            mainJoueur: [...prev.mainJoueur, ...mainsRecord[position]],
          }));
        } else {
          setEtatJeu((prev) => ({
            ...prev,
            nbCartesAdversaires: {
              ...prev.nbCartesAdversaires,
              [position]:
                prev.nbCartesAdversaires[position as "nord" | "est" | "ouest"] +
                mainsRecord[position].length,
            },
          }));
        }

        if (prisesTerminees.count >= nbJoueurs) {
          lancerPhase3(contexte);
        }
      },
    });
  }, distribution.pauseAvantPrise);

  timeoutsControleurRef.current.push(timeoutPrise);
};
```

- [ ] **Step 4: Ajouter la fonction `lancerPhase3`**

```typescript
const lancerPhase3 = useCallback(
  (contexte: ContextePartie) => {
    const { distribution } = ANIMATIONS;

    const timeout = setTimeout(() => {
      if (estDemonte.current) return;

      const acteur = acteurRef.current;
      if (!acteur) return;
      const snap = acteur.getSnapshot();
      const etat = snap.value as string;
      const ctx = snap.context;

      animationDistribEnCours.current = false;

      setEtatJeu((prev) => ({
        ...prev,
        ...extraireEtatUI(ctx, etat),
        mainJoueur: trierMainJoueur(ctx.mains[INDEX_HUMAIN]),
        nbCartesAdversaires: {
          nord: ctx.mains[2].length,
          est: ctx.mains[3].length,
          ouest: ctx.mains[1].length,
        },
      }));

      // Réinitialiser le ref de cartes sur tapis
      cartesTapisParJoueurRef.current = {
        sud: [],
        ouest: [],
        nord: [],
        est: [],
      };

      const estPhaseEncheres = etat === "encheres1" || etat === "encheres2";
      const delaiAvantBot = estPhaseEncheres ? ANIMATIONS.pauseAvantEncheres : 50;
      setTimeout(() => jouerBotSiNecessaire(), delaiAvantBot);
    }, distribution.pauseAvantTri);

    timeoutsControleurRef.current.push(timeout);
  },
  [extraireEtatUI, jouerBotSiNecessaire],
);
```

- [ ] **Step 5: Réécrire `lancerDistributionRestanteAnimee` (lignes 875-961)**

Remplacer par une version qui gère la carte retournée + les 2 cas (preneur premier ou non) :

```typescript
const lancerDistributionRestanteAnimee = useCallback(
  (contexte: ContextePartie) => {
    animationDistribEnCours.current = true;

    // Réinitialiser le ref
    cartesTapisParJoueurRef.current = {
      sud: [],
      ouest: [],
      nord: [],
      est: [],
    };

    const indexPreneur = contexte.indexPreneur!;
    const positionPreneur = POSITIONS_JOUEUR[indexPreneur];

    // Le premier servi est le joueur après le donneur (sens anti-horaire dans la machine)
    // La machine utilise (indexDonneur + 3) % 4 comme premierJoueurApres
    const premierServi = POSITIONS_JOUEUR[(contexte.indexDonneur + 3) % 4];
    const estPreneurPremier = positionPreneur === premierServi;

    // Construire les mains restantes (indices 5-7 pour les non-preneurs, 5-6 ou 6-7 pour le preneur)
    const mainsRecord: Record<PositionJoueur, Carte[]> = {
      sud: [],
      ouest: [],
      nord: [],
      est: [],
    };

    for (let i = 0; i < 4; i++) {
      const pos = POSITIONS_JOUEUR[i];
      if (i === indexPreneur) {
        // Le preneur reçoit 2 nouvelles cartes (la retournée est déjà la 6e dans la machine)
        // Dans le contexte machine, mains[preneur] a 8 cartes dont la retournée est à l'index 5
        mainsRecord[pos] = contexte.mains[i].slice(6); // indices 6-7 = 2 nouvelles cartes
      } else {
        mainsRecord[pos] = contexte.mains[i].slice(5); // indices 5-7 = 3 nouvelles cartes
      }
    }

    const carteRetournee = contexte.carteRetournee;

    // Masquer la phase UI
    setEtatJeu((prev) => ({
      ...prev,
      phaseUI: "distribution",
    }));

    const prisesTerminees = { count: 0 };
    const nbJoueurs = 4;

    const lancerPhase2Restante = (position: PositionJoueur) => {
      const { distribution } = ANIMATIONS;

      const timeoutPrise = setTimeout(() => {
        if (estDemonte.current) return;

        const cartesTapis = cartesTapisParJoueurRef.current[position];
        const posArrivee = POSITIONS_MAINS[position];
        const positionsArrivee = cartesTapis.map(() => ({
          x: posArrivee.x,
          y: posArrivee.y,
        }));

        const estSud = position === "sud";

        animations.lancerPriseEnMain(position, cartesTapis, positionsArrivee, {
          flipVers: estSud ? 180 : undefined,
          onTerminee: () => {
            prisesTerminees.count += 1;

            if (position === "sud") {
              setEtatJeu((prev) => ({
                ...prev,
                mainJoueur: [...prev.mainJoueur, ...contexte.mains[0].slice(5)],
              }));
            } else {
              const idx = POSITIONS_JOUEUR.indexOf(position);
              setEtatJeu((prev) => ({
                ...prev,
                nbCartesAdversaires: {
                  ...prev.nbCartesAdversaires,
                  [position]:
                    prev.nbCartesAdversaires[position as "nord" | "est" | "ouest"] +
                    contexte.mains[idx].slice(5).length,
                },
              }));
            }

            if (prisesTerminees.count >= nbJoueurs) {
              lancerPhase3Restante(contexte);
            }
          },
        });
      }, distribution.pauseAvantPrise);

      timeoutsControleurRef.current.push(timeoutPrise);
    };

    const lancerDistribApresSlide = () => {
      // Les cartes visibles sont la retournée si le preneur est premier
      const cartesVisibles = estPreneurPremier && carteRetournee ? [carteRetournee] : [];

      animations.lancerDistribution(
        estPreneurPremier
          ? {
              ...mainsRecord,
              [positionPreneur]: carteRetournee
                ? [carteRetournee, ...mainsRecord[positionPreneur]]
                : mainsRecord[positionPreneur],
            }
          : mainsRecord,
        {
          cartesVisibles,
          onCarteArrivee: (cst) => {
            cartesTapisParJoueurRef.current[cst.position].push(cst);
          },
          onJoueurComplet: (position) => {
            if (estDemonte.current) return;
            lancerPhase2Restante(position);
          },
        },
      );
    };

    // Cas 1 : preneur n'est pas premier → slide carte retournée d'abord
    if (!estPreneurPremier && carteRetournee) {
      // Position de la carte retournée (centre du plateau, même que ZoneCarteRetournee)
      animations.glisserCarteRetournee(
        carteRetournee,
        0.5, // x départ (centre)
        0.35, // y départ (au-dessus du pli)
        positionPreneur,
        (carteSurTapis) => {
          // Ajouter la carte retournée au ref du preneur pour la Phase 2
          cartesTapisParJoueurRef.current[positionPreneur].push(carteSurTapis);
          // Courte pause puis distribuer les cartes restantes
          const timeoutSlide = setTimeout(() => {
            lancerDistribApresSlide();
          }, ANIMATIONS.distribution.pauseAvantPrise);
          timeoutsControleurRef.current.push(timeoutSlide);
        },
      );

      // Masquer la carte retournée de l'UI
      setEtatJeu((prev) => ({
        ...prev,
        carteRetournee: null,
      }));
    } else {
      // Cas 2 : preneur est premier → pas de slide, la retournée est dans la distribution
      setEtatJeu((prev) => ({
        ...prev,
        carteRetournee: null,
      }));
      lancerDistribApresSlide();
    }
  },
  [animations, extraireEtatUI, jouerBotSiNecessaire],
);

const lancerPhase3Restante = useCallback(
  (contexte: ContextePartie) => {
    const { distribution } = ANIMATIONS;

    const timeout = setTimeout(() => {
      if (estDemonte.current) return;

      const acteur = acteurRef.current;
      if (!acteur) return;
      const snap = acteur.getSnapshot();
      const etat = snap.value as string;
      const ctx = snap.context;

      animationDistribEnCours.current = false;

      setEtatJeu((prev) => ({
        ...prev,
        ...extraireEtatUI(ctx, etat),
        mainJoueur: trierMainJoueur(ctx.mains[INDEX_HUMAIN]),
        nbCartesAdversaires: {
          nord: ctx.mains[2].length,
          est: ctx.mains[3].length,
          ouest: ctx.mains[1].length,
        },
      }));

      // Réinitialiser
      cartesTapisParJoueurRef.current = {
        sud: [],
        ouest: [],
        nord: [],
        est: [],
      };

      // Tri avec atouts à gauche après un court délai
      if (ctx.couleurAtout) {
        setTimeout(() => {
          if (estDemonte.current) return;
          setEtatJeu((prev) => ({
            ...prev,
            mainJoueur: trierMainAvecAtout(prev.mainJoueur, ctx.couleurAtout!),
          }));
        }, 500);
      }

      setTimeout(() => jouerBotSiNecessaire(), 600);
    }, distribution.pauseAvantTri);

    timeoutsControleurRef.current.push(timeout);
  },
  [extraireEtatUI, jouerBotSiNecessaire, lancerPhase3Restante],
);
```

- [ ] **Step 6: Mettre à jour le nettoyage**

Dans le cleanup de `useEffect` (ligne ~683-691), ajouter le reset du ref :

```typescript
return () => {
  estDemonte.current = true;
  estOccupe.current = false;
  annulerDelai();
  if (timerBeloteRef.current) clearTimeout(timerBeloteRef.current);
  animations.annulerAnimations();
  for (const t of timeoutsControleurRef.current) clearTimeout(t);
  timeoutsControleurRef.current = [];
  cartesTapisParJoueurRef.current = { sud: [], ouest: [], nord: [], est: [] };
  acteur.stop();
  acteurRef.current = null;
};
```

- [ ] **Step 7: Vérifier le typecheck**

Run: `pnpm --filter @belote/mobile typecheck`
Expected: Peut encore échouer sur `PlateauJeu` (Task 7). Les types internes doivent passer.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/hooks/useControleurJeu.ts
git commit -m "feat(mobile): orchestration 3 phases distribution dans useControleurJeu"
```

---

## Task 7 : Passer `cartesSurTapis` dans `PlateauJeu`

**Files:**

- Modify: `apps/mobile/components/game/PlateauJeu.tsx:29-43,190-195`

- [ ] **Step 1: Extraire `cartesSurTapis` de `useControleurJeu`**

Ligne 29-43, ajouter `cartesSurTapis` dans le destructuring :

```typescript
const {
  etatJeu,
  cartesEnVol,
  cartesSurTapis,
  surAnimationTerminee,
  demarrerPartie,
  jouerCarte,
  prendre,
  annoncer,
  passer,
  continuerApresScore,
  recommencer,
} = useControleurJeu({
  difficulte: preferences.difficulte,
  scoreObjectif: preferences.scoreObjectif,
});
```

- [ ] **Step 2: Passer le prop à `CoucheAnimation`**

Ligne 190-195, ajouter le prop :

```tsx
<CoucheAnimation
  cartesEnVol={cartesEnVol}
  cartesSurTapis={cartesSurTapis}
  largeurEcran={largeur}
  hauteurEcran={hauteur}
  onAnimationTerminee={surAnimationTerminee}
/>
```

- [ ] **Step 3: Vérifier le typecheck complet**

Run: `pnpm --filter @belote/mobile typecheck`
Expected: PASS — tous les types doivent être cohérents

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/game/PlateauJeu.tsx
git commit -m "feat(mobile): connecter cartesSurTapis dans PlateauJeu"
```

---

## Task 8 : Test visuel et ajustements

- [ ] **Step 1: Lancer l'app en mode web**

Run: `cd apps/mobile && npx expo start --web`

Vérifier visuellement :

- Les cartes volent du centre vers les zones tapis (face cachée)
- Elles forment des mini-éventails (3 + 2) avec rotation aléatoire
- Chaque joueur prend ses cartes dès qu'il a 5 cartes
- Le flip 3D fonctionne pour le joueur sud (face visible)
- Les bots gardent les cartes dos visible
- Le tri s'exécute après la prise en main
- La distribution restante fonctionne (avec/sans slide de la retournée)

- [ ] **Step 2: Lancer les tests existants**

Run: `pnpm turbo typecheck test`
Expected: PASS — aucun test existant ne doit casser (l'animation est purement UI)

- [ ] **Step 3: Lancer les tests e2e**

Run: `pnpm --filter @belote/mobile test:e2e`
Expected: PASS

- [ ] **Step 4: Ajustements visuels si nécessaire**

Ajuster les constantes dans `layout.ts` si les timings ou positions ne sont pas satisfaisants :

- `POSITIONS_TAPIS` — rapprocher/éloigner du centre
- `dureePriseEnMain` — accélérer/ralentir le flip
- `offsetAleatoireMax` — plus/moins de variation aléatoire

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(mobile): animation distribution réaliste en 3 phases"
```

---

## Task 9 : Mettre à jour AVANCEMENT.md

- [ ] **Step 1: Mettre à jour le fichier d'avancement**

Ajouter une entrée dans `AVANCEMENT.md` pour documenter la refonte de l'animation de distribution.

- [ ] **Step 2: Commit**

```bash
git add AVANCEMENT.md
git commit -m "docs: mettre à jour avancement — animation distribution réaliste"
```
