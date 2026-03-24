# Paquet central fixe + Jeton dealer

**Date :** 2026-03-24

## Contexte

Actuellement, le paquet de cartes avant distribution est positionne a un point interpole entre le centre du tapis et la main du donneur (55% vers le donneur). Le donneur n'est pas identifie visuellement sur le plateau.

## Objectifs

1. Le paquet de depart est visible au centre du tapis (position fixe 0.5, 0.45) et se "vide" visuellement par paquets de 3 puis 2 au rythme de la distribution.
2. Un jeton dealer (style poker button) identifie le donneur tout au long de la manche, avec une animation de glissement au changement de manche.

---

## Section 1 — Paquet central a position fixe

### Changements

**`distributionLayoutAtlas.ts` — `obtenirOrigineDistribution`**

- Retourne le point fixe `{ x: 0.5, y: 0.45 }` au lieu d'interpoler vers le donneur.
- Le parametre `indexDonneur` peut etre conserve dans la signature pour compatibilite, mais n'est plus utilise pour calculer l'origine.

**`PaquetCentral.tsx`**

- Utilise directement `ANIMATIONS.distribution.originX` / `originY` au lieu d'appeler `obtenirOrigineDistribution(indexDonneur)`.
- La prop `indexDonneur` peut etre retiree.
- Le calcul `nbCouches = Math.min(5, Math.ceil(cartesRestantes / 6))` reste inchange — il produit deja une diminution par paliers coherente avec la distribution par paquets de 3/2.

**Impact sur l'animation Skia :**

- `DistributionCanvas.tsx` et `distributionAtlas.ts` ne changent pas. Ils consomment les donnees geometriques calculees par `distributionLayoutAtlas.ts`, qui produira desormais une origine fixe.

### Verification

- `cartesRestantes` est decremente par paquets (via callbacks `onPaquetDepart`) et non carte par carte — a verifier dans `useControleurJeu.ts` / `useAnimationsDistribution.ts`.
- Si ce n'est pas le cas, ajuster la decrementation pour qu'elle suive le rythme 3/2.

---

## Section 2 — Jeton dealer

### Composant `JetonDealer`

**Fichier :** `apps/mobile/components/game/JetonDealer.tsx` (nouveau)

**Props :**

```typescript
interface PropsJetonDealer {
  positionDonneur: PositionJoueur;
  largeurEcran: number;
  hauteurEcran: number;
  phaseUI: string;
}
```

**Rendu visuel :**

- Disque de ~24px (mobile) / ~28px (web)
- Fond dore `#d4a017`
- Bordure 1.5px `rgba(255,255,255,0.22)`
- Ombre : `rgba(0,0,0,0.3)`, offset (0, 2), radius 4
- Texte "D" blanc `#ffffff`, bold, ~12px (mobile) / ~14px (web)
- Centre horizontalement sous l'avatar du donneur

**Positionnement :**

- Composant unique en position absolue sur le plateau (pas dans `AvatarJoueur`)
- Coordonnees calculees depuis `POSITIONS_AVATAR[positionDonneur]`
- Offset Y : `TAILLE_AVATAR / 2 + DECALAGE_NOM + 16px` (sous le label du nom)

**Visibilite :**

- Affiche quand `phaseUI !== "inactif"`
- Reste visible tout au long de la manche

### Animation de transition

**Declenchement :** Quand `positionDonneur` change (changement de manche).

**Mecanisme :**

- `useAnimatedStyle` + `withTiming` (Reanimated)
- Anime `left` et `top` de l'ancienne position vers la nouvelle
- Duree : ~500ms, easing `Easing.inOut(Easing.ease)`
- `useRef` pour memoriser la position precedente
- Premier rendu (debut de partie) : placement direct, pas d'animation

### Integration dans `PlateauJeu.tsx`

```tsx
{
  etatJeu.phaseUI !== "inactif" && (
    <JetonDealer
      positionDonneur={POSITIONS_JOUEUR[etatJeu.indexDonneur]}
      largeurEcran={largeur}
      hauteurEcran={hauteur}
      phaseUI={etatJeu.phaseUI}
    />
  );
}
```

---

## Fichiers impactes

| Fichier                      | Action                                                           |
| ---------------------------- | ---------------------------------------------------------------- |
| `distributionLayoutAtlas.ts` | Simplifier `obtenirOrigineDistribution` → point fixe             |
| `PaquetCentral.tsx`          | Retirer `indexDonneur`, utiliser constantes layout               |
| `JetonDealer.tsx`            | Nouveau composant                                                |
| `PlateauJeu.tsx`             | Ajouter `JetonDealer`, retirer `indexDonneur` de `PaquetCentral` |
| `useControleurJeu.ts`        | Verifier decrementation `cartesRestantesPaquet` par paquets      |

## Hors scope

- Animation d'apparition du jeton au debut de partie
- Personnalisation du visuel du jeton (icone, couleur selon equipe)
- Changement du systeme d'animation Skia/Atlas existant
