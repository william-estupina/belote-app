# Paquet central fixe + Jeton dealer — Plan d'implementation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fixer le paquet de cartes au centre du tapis et ajouter un jeton dealer anime identifiant le donneur.

**Architecture:** Deux changements independants : (1) simplifier `obtenirOrigineDistribution` pour retourner un point fixe, retirer la prop `indexDonneur` de `PaquetCentral` ; (2) extraire les constantes de position d'avatar dans `constants/layout.ts`, creer un composant `JetonDealer` avec animation Reanimated, l'integrer dans `PlateauJeu`.

**Tech Stack:** React Native, react-native-reanimated (useAnimatedStyle, withTiming), TypeScript

---

### Task 1 : Simplifier obtenirOrigineDistribution — point fixe

**Files:**

- Modify: `apps/mobile/hooks/distributionLayoutAtlas.ts:20-65`

- [ ] **Step 1: Remplacer les tests d'origine interpolee par un test d'origine fixe**

Le fichier `apps/mobile/__tests__/distributionLayoutAtlas.test.ts` contient 4 tests (lignes 58-94) qui verifient le comportement d'interpolation vers le donneur. Remplacer ces 4 tests par un seul test d'origine fixe :

Dans `apps/mobile/__tests__/distributionLayoutAtlas.test.ts`, remplacer les lignes 58-94 (les 4 `it` sur `obtenirOrigineDistribution`) par :

```typescript
it("retourne le point fixe central quel que soit l'index donneur", () => {
  for (let i = 0; i < 4; i++) {
    const origine = obtenirOrigineDistribution(i);
    expect(origine).toEqual({ x: 0.5, y: 0.45 });
  }
});
```

- [ ] **Step 2: Lancer le test et verifier qu'il echoue**

Run: `npx jest apps/mobile/__tests__/distributionLayoutAtlas.test.ts --no-coverage`
Expected: FAIL — l'origine est actuellement interpolee vers le donneur, pas fixe.

- [ ] **Step 3: Simplifier obtenirOrigineDistribution**

Dans `apps/mobile/hooks/distributionLayoutAtlas.ts` :

- Remplacer le corps de `obtenirOrigineDistribution` pour retourner le point fixe :

```typescript
export function obtenirOrigineDistribution(_indexDonneur: number): PointNormalise {
  return {
    x: ANIMATIONS.distribution.originX,
    y: ANIMATIONS.distribution.originY,
  };
}
```

- Supprimer `FACTEUR_RAPPROCHEMENT_DONNEUR` (ligne 20).
- Supprimer la fonction `interpolerPoint` (lignes 27-36) si elle n'est plus utilisee ailleurs.

- [ ] **Step 4: Lancer le test et verifier qu'il passe**

Run: `npx jest apps/mobile/__tests__/distributionLayoutAtlas.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/hooks/distributionLayoutAtlas.ts apps/mobile/__tests__/distributionLayoutAtlas.test.ts
git commit -m "feat(mobile): origine distribution fixe au centre du tapis"
```

---

### Task 2 : Retirer indexDonneur de PaquetCentral

**Files:**

- Modify: `apps/mobile/components/game/PaquetCentral.tsx:1-73`
- Modify: `apps/mobile/components/game/PlateauJeu.tsx:228-233`

- [ ] **Step 1: Simplifier PaquetCentral — utiliser les constantes directement**

Dans `apps/mobile/components/game/PaquetCentral.tsx` :

- Retirer `indexDonneur` de `PropsPaquetCentral` et de la destructuration des props.
- Remplacer l'appel a `obtenirOrigineDistribution(indexDonneur)` par l'import direct des constantes :

```typescript
import {
  ANIMATIONS,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";
```

Remplacer les lignes 31-33 :

```typescript
const centreX = largeurEcran * ANIMATIONS.distribution.originX - largeurCarte / 2;
const centreY = hauteurEcran * ANIMATIONS.distribution.originY - hauteurCarte / 2;
```

Supprimer l'import de `obtenirOrigineDistribution`.

- [ ] **Step 2: Mettre a jour PlateauJeu — retirer indexDonneur du PaquetCentral**

Dans `apps/mobile/components/game/PlateauJeu.tsx`, retirer la prop `indexDonneur` du JSX de `<PaquetCentral>` :

```tsx
<PaquetCentral
  cartesRestantes={etatJeu.cartesRestantesPaquet}
  largeurEcran={largeur}
  hauteurEcran={hauteur}
/>
```

- [ ] **Step 3: Lancer les tests existants**

Run: `npx jest --no-coverage`
Expected: PASS (pas de regression)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/game/PaquetCentral.tsx apps/mobile/components/game/PlateauJeu.tsx
git commit -m "refactor(mobile): retirer indexDonneur de PaquetCentral"
```

---

### Task 3 : Extraire les constantes d'avatar dans constants/layout.ts

**Files:**

- Modify: `apps/mobile/constants/layout.ts`
- Modify: `apps/mobile/components/game/AvatarJoueur.tsx:36-101`

- [ ] **Step 1: Ajouter les constantes dans layout.ts**

A la fin de `apps/mobile/constants/layout.ts`, ajouter :

Ajouter l'import de `Platform` en haut du fichier :

```typescript
import { Platform } from "react-native";
```

Ajouter l'import de `PositionJoueur` :

```typescript
import type { PositionJoueur } from "@belote/shared-types";
```

Puis a la fin du fichier, ajouter :

```typescript
const estWeb = Platform.OS === "web";

// --- Avatars ---
export const POSITIONS_AVATAR: Record<PositionJoueur, { x: number; y: number }> = {
  sud: { x: 0.28, y: 0.71 },
  nord: { x: 0.62, y: 0.17 },
  ouest: { x: 0.095, y: 0.5 },
  est: { x: 0.905, y: 0.5 },
};

export const TAILLE_AVATAR = estWeb ? 68 : 58;
export const DECALAGE_NOM = estWeb ? 8 : 6;
```

- [ ] **Step 2: Mettre a jour AvatarJoueur.tsx pour importer depuis layout.ts**

Dans `apps/mobile/components/game/AvatarJoueur.tsx` :

- Ajouter l'import :

```typescript
import { DECALAGE_NOM, POSITIONS_AVATAR, TAILLE_AVATAR } from "../../constants/layout";
```

- Supprimer les declarations locales de `POSITIONS_AVATAR` (lignes 36-41), `TAILLE_AVATAR` (ligne 98) et `DECALAGE_NOM` (ligne 101).
- Conserver `estWeb`, `RAYON_AVATAR`, `LARGEUR_NOM`, `LARGEUR_BULLE_MIN`, `TAILLE_QUEUE` localement car non partagees.

- [ ] **Step 3: Lancer les tests d'avatar**

Run: `npx jest apps/mobile/__tests__/avatar-joueur.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/constants/layout.ts apps/mobile/components/game/AvatarJoueur.tsx
git commit -m "refactor(mobile): extraire constantes avatar dans constants/layout"
```

---

### Task 4 : Creer le composant JetonDealer

**Files:**

- Create: `apps/mobile/components/game/JetonDealer.tsx`
- Create: `apps/mobile/__tests__/jeton-dealer.test.tsx`

- [ ] **Step 1: Ecrire les tests du JetonDealer**

Fichier : `apps/mobile/__tests__/jeton-dealer.test.tsx`

```tsx
import { render, screen } from "@testing-library/react-native";

import { JetonDealer } from "../components/game/JetonDealer";

jest.mock("react-native-reanimated", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    __esModule: true,
    default: { View },
    Easing: {
      ease: jest.fn(),
      inOut: jest.fn(() => jest.fn()),
    },
    useSharedValue: (valeur: number) => ({ value: valeur }),
    useAnimatedStyle: (calculStyle: () => unknown) => calculStyle(),
    withTiming: (valeur: number) => valeur,
  };
});

describe("JetonDealer", () => {
  it("affiche le texte D quand la phase est active", () => {
    render(<JetonDealer positionDonneur="sud" largeurEcran={1000} hauteurEcran={700} />);

    expect(screen.getByText("D")).toBeTruthy();
    expect(screen.getByTestId("jeton-dealer")).toBeTruthy();
  });

  it("se positionne sous l'avatar du donneur", () => {
    render(<JetonDealer positionDonneur="nord" largeurEcran={1000} hauteurEcran={700} />);

    expect(screen.getByTestId("jeton-dealer")).toBeTruthy();
    expect(screen.getByText("D")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Lancer le test et verifier qu'il echoue**

Run: `npx jest apps/mobile/__tests__/jeton-dealer.test.tsx --no-coverage`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implementer JetonDealer.tsx**

Fichier : `apps/mobile/components/game/JetonDealer.tsx`

```tsx
import type { PositionJoueur } from "@belote/shared-types";
import { memo, useEffect, useRef } from "react";
import { Platform, StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { DECALAGE_NOM, POSITIONS_AVATAR, TAILLE_AVATAR } from "../../constants/layout";

const estWeb = Platform.OS === "web";
const TAILLE_JETON = estWeb ? 28 : 24;
const TAILLE_TEXTE = estWeb ? 14 : 12;
const OFFSET_Y = TAILLE_AVATAR / 2 + DECALAGE_NOM + 16;

interface PropsJetonDealer {
  positionDonneur: PositionJoueur;
  largeurEcran: number;
  hauteurEcran: number;
}

function calculerPosition(
  positionDonneur: PositionJoueur,
  largeurEcran: number,
  hauteurEcran: number,
) {
  const coord = POSITIONS_AVATAR[positionDonneur];
  return {
    left: coord.x * largeurEcran - TAILLE_JETON / 2,
    top: coord.y * hauteurEcran + OFFSET_Y,
  };
}

export const JetonDealer = memo(function JetonDealer({
  positionDonneur,
  largeurEcran,
  hauteurEcran,
}: PropsJetonDealer) {
  const pos = calculerPosition(positionDonneur, largeurEcran, hauteurEcran);
  const estPremierRendu = useRef(true);

  const animLeft = useSharedValue(pos.left);
  const animTop = useSharedValue(pos.top);

  useEffect(() => {
    if (estPremierRendu.current) {
      estPremierRendu.current = false;
      animLeft.value = pos.left;
      animTop.value = pos.top;
      return;
    }

    const config = { duration: 500, easing: Easing.inOut(Easing.ease) };
    animLeft.value = withTiming(pos.left, config);
    animTop.value = withTiming(pos.top, config);
  }, [pos.left, pos.top, animLeft, animTop]);

  const styleAnime = useAnimatedStyle(() => ({
    left: animLeft.value,
    top: animTop.value,
  }));

  return (
    <Animated.View testID="jeton-dealer" style={[styles.jeton, styleAnime]}>
      <Text style={styles.texte}>D</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  jeton: {
    position: "absolute",
    width: TAILLE_JETON,
    height: TAILLE_JETON,
    borderRadius: TAILLE_JETON / 2,
    backgroundColor: "#d4a017",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    shadowColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 13,
  },
  texte: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: TAILLE_TEXTE,
  },
});
```

- [ ] **Step 4: Lancer le test et verifier qu'il passe**

Run: `npx jest apps/mobile/__tests__/jeton-dealer.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/game/JetonDealer.tsx apps/mobile/__tests__/jeton-dealer.test.tsx
git commit -m "feat(mobile): composant JetonDealer avec animation Reanimated"
```

---

### Task 5 : Integrer JetonDealer dans PlateauJeu

**Files:**

- Modify: `apps/mobile/components/game/PlateauJeu.tsx`

- [ ] **Step 1: Ajouter l'import et le JSX dans PlateauJeu**

Dans `apps/mobile/components/game/PlateauJeu.tsx` :

Ajouter l'import :

```typescript
import { JetonDealer } from "./JetonDealer";
```

Ajouter le composant juste apres le bloc des avatars (apres la ligne `}))}`), avant le commentaire `{/* Zone du pli au centre */}` :

```tsx
{
  /* Jeton dealer — identifie le donneur */
}
{
  etatJeu.phaseUI !== "inactif" && (
    <JetonDealer
      positionDonneur={POSITIONS_JOUEUR[etatJeu.indexDonneur]}
      largeurEcran={largeur}
      hauteurEcran={hauteur}
    />
  );
}
```

Note : `POSITIONS_JOUEUR` est deja importe en ligne 2 de PlateauJeu, pas besoin d'ajouter un import.

- [ ] **Step 2: Lancer tous les tests**

Run: `npx jest --no-coverage`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/game/PlateauJeu.tsx
git commit -m "feat(mobile): integrer JetonDealer dans PlateauJeu"
```

---

### Task 6 : Verification visuelle

- [ ] **Step 1: Lancer l'app et verifier visuellement**

Run: `npx expo start` puis ouvrir sur simulateur/device.

Verifier :

- Le paquet de cartes apparait au centre exact du tapis (pas decale vers le donneur)
- Le jeton "D" dore apparait sous l'avatar du donneur
- Au changement de manche, le jeton glisse vers le nouveau donneur (~500ms)
- Le jeton reste visible pendant toutes les phases (distribution, encheres, jeu, finPli)
- Le jeton disparait quand la partie est inactive

- [ ] **Step 2: Commit final si ajustements necessaires**
