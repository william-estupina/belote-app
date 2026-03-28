# Fix rendu main sud Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer le clignotement et le decalage de couleur lors de la transition Atlas -> MainJoueur pour les cartes du joueur sud.

**Architecture:** Revert du timing de masquage (masquer au depart du paquet suivant, pas a l'arrivee) + ajout d'un Shadow Skia dans DistributionCanvasSud pour aligner visuellement les deux rendus.

**Tech Stack:** React Native, @shopify/react-native-skia v2.2.12, react-native-reanimated

---

### Task 1: Revert du timing de masquage dans useAnimationsDistribution.ts

**Files:**

- Modify: `apps/mobile/hooks/useAnimationsDistribution.ts:410-469`

- [ ] **Step 1: Restaurer le pattern de masquage differe**

Remplacer le bloc lignes 410-457 par :

```typescript
// Planifier les callbacks et masquer les cartes sud arrivees dans l'atlas.
// Le masquage se fait au depart du paquet sud SUIVANT (pas a l'arrivee)
// pour laisser un court chevauchement avec MainJoueur — invisible grace
// au Shadow Skia qui aligne les deux rendus visuellement.
let delaiFinDistributionMs = 0;
let indexDebutPaquetSud = 0;
const indicesSudArrivees: { debut: number; fin: number }[] = [];

for (const paquet of paquetsCallback) {
  const delaisPool = paquet.estSud ? delaisCartesSud : delaisCartesAdv;
  const delaiCarte = delaisPool[paquet.indexDerniereCartePool];

  // Masquage uniquement pour "sud" (pas les adversaires)
  if (paquet.estSud && indicesSudArrivees.length > 0) {
    const indicesToHide = [...indicesSudArrivees];
    const timeout = setTimeout(() => {
      for (const range of indicesToHide) {
        for (let i = range.debut; i <= range.fin; i++) {
          progressionsSud[i].value = 2;
        }
      }
      options?.onPaquetDepart?.(paquet.position, paquet.cartes);
    }, paquet.delaiDepartMs);
    timeoutsCallbacksRef.current.push(timeout);
  } else if (options?.onPaquetDepart) {
    const timeout = setTimeout(() => {
      options.onPaquetDepart?.(paquet.position, paquet.cartes);
    }, paquet.delaiDepartMs);
    timeoutsCallbacksRef.current.push(timeout);
  }

  if (delaiCarte) {
    const delaiArriveeMs = delaiCarte.delai + delaiCarte.duree;
    delaiFinDistributionMs = Math.max(delaiFinDistributionMs, delaiArriveeMs);

    if (paquet.estSud) {
      indicesSudArrivees.push({
        debut: indexDebutPaquetSud,
        fin: paquet.indexDerniereCartePool,
      });
      indexDebutPaquetSud = paquet.indexDerniereCartePool + 1;
    }

    const timeout = setTimeout(() => {
      options?.onPaquetArrive?.(paquet.position, paquet.cartes);
    }, delaiArriveeMs);
    timeoutsCallbacksRef.current.push(timeout);
  }
}
```

- [ ] **Step 2: Ajouter le masquage du dernier paquet dans onTerminee**

Remplacer le bloc onTerminee (lignes 459-469) par :

```typescript
// Callback de fin (toutes les animations terminées).
// Note : setEnCours(false) n'est PAS appelé ici — c'est le contrôleur
// qui appelle terminerDistribution() après le tri, pour éviter un
// re-layout intermédiaire avec les cartes non triées.
{
  const DELAI_SECURITE_DEMONTAGE = 100;
  const timeoutFin = setTimeout(() => {
    // Masquer les dernières cartes sud restantes dans l'Atlas
    // (le dernier paquet n'a pas de paquet suivant pour le masquer)
    for (const range of indicesSudArrivees) {
      for (let i = range.debut; i <= range.fin; i++) {
        if (progressionsSud[i].value !== 2) {
          progressionsSud[i].value = 2;
        }
      }
    }
    options?.onTerminee?.();
  }, delaiFinDistributionMs + DELAI_SECURITE_DEMONTAGE);
  timeoutsCallbacksRef.current.push(timeoutFin);
}
```

- [ ] **Step 3: Verifier que le linter passe**

Run: `npx eslint apps/mobile/hooks/useAnimationsDistribution.ts`
Expected: aucune erreur

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/hooks/useAnimationsDistribution.ts
git commit -m "fix(mobile): revert timing masquage sud — masquer au depart du paquet suivant"
```

---

### Task 2: Ajouter Shadow Skia dans DistributionCanvasSud.tsx

**Files:**

- Modify: `apps/mobile/components/game/DistributionCanvasSud.tsx`

- [ ] **Step 1: Ajouter l'import Shadow et Group**

Modifier la ligne d'import (ligne 1) :

```typescript
import {
  Atlas,
  Canvas,
  Group,
  Shadow,
  rect,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
```

- [ ] **Step 2: Envelopper l'Atlas dans un Group avec Shadow**

Remplacer le JSX du Canvas (lignes 111-125) :

```tsx
return (
  <Canvas
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: largeurEcran,
      height: hauteurEcran,
      zIndex: 100,
    }}
    pointerEvents="none"
  >
    <Group>
      <Shadow dx={1} dy={2} blur={4} color="rgba(0, 0, 0, 0.35)" />
      <Atlas image={atlas.image} sprites={sprites} transforms={transforms} />
    </Group>
  </Canvas>
);
```

- [ ] **Step 3: Verifier que le linter passe**

Run: `npx eslint apps/mobile/components/game/DistributionCanvasSud.tsx`
Expected: aucune erreur

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/game/DistributionCanvasSud.tsx
git commit -m "fix(mobile): ajouter shadow skia sur atlas sud pour aligner avec mainjoueur"
```

---

### Task 3: Verification visuelle sur device

- [ ] **Step 1: Lancer l'app en dev**

Run: `npx expo start`

- [ ] **Step 2: Verifier les points suivants sur device/simulateur**

1. La distribution ne clignote plus au passage Atlas -> MainJoueur
2. Les couleurs des cartes sont identiques pendant et apres la distribution
3. Les ombres des cartes en vol matchent les ombres des cartes en main
4. Le dernier paquet de cartes est correctement masque dans l'Atlas apres la distribution
5. L'interactivite des cartes en main fonctionne (tap pour jouer)

- [ ] **Step 3: Si le blur ne matche pas visuellement**

Ajuster la valeur `blur` dans DistributionCanvasSud.tsx. Essayer `blur={2}` si l'ombre Atlas parait trop diffuse par rapport au React Native `shadowRadius: 4`.
