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

- `cartesRestantes` est decremente dans le callback `onPaquetArrive` (pas `onPaquetDepart`) par `cartes.length` (3 ou 2). Il y a 8 evenements au total (4 joueurs x 2 rounds). Le `nbCouches` diminue progressivement a chaque arrivee — pas de changement necessaire.

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

**Prerequis — extraction de constantes :**

Les constantes `POSITIONS_AVATAR`, `TAILLE_AVATAR` et `DECALAGE_NOM` sont actuellement privees dans `AvatarJoueur.tsx`. Elles doivent etre extraites dans `constants/layout.ts` pour etre partagees avec `JetonDealer.tsx`. `AvatarJoueur.tsx` les importera depuis le nouveau fichier. Note : `TAILLE_AVATAR` et `DECALAGE_NOM` sont dependants de la plateforme (web/mobile).

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

| Fichier                      | Action                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `constants/layout.ts`        | Ajouter `POSITIONS_AVATAR`, `TAILLE_AVATAR`, `DECALAGE_NOM`                                                          |
| `AvatarJoueur.tsx`           | Importer les constantes extraites depuis `constants/layout.ts`                                                       |
| `distributionLayoutAtlas.ts` | Simplifier `obtenirOrigineDistribution` → point fixe, supprimer `FACTEUR_RAPPROCHEMENT_DONNEUR` et `interpolerPoint` |
| `PaquetCentral.tsx`          | Retirer `indexDonneur`, utiliser constantes layout                                                                   |
| `JetonDealer.tsx`            | Nouveau composant (Reanimated `useAnimatedStyle`)                                                                    |
| `PlateauJeu.tsx`             | Ajouter `JetonDealer`, retirer `indexDonneur` de `PaquetCentral`                                                     |

## Hors scope

- Animation d'apparition du jeton au debut de partie
- Personnalisation du visuel du jeton (icone, couleur selon equipe)
- Changement du systeme d'animation Skia/Atlas existant
