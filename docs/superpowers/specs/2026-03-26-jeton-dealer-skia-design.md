# Jeton dealer — rendu casino en Skia

**Date :** 2026-03-26

## Contexte

Le jeton dealer actuel est un simple cercle doré (`#d4a017`) de 24-28px avec la lettre "D" en blanc. Il manque de relief et de personnalité pour un jeu de cartes.

## Objectif

Remplacer le rendu View+Text par un jeton style "poker chip" utilisant les primitives Skia, tout en conservant l'animation Reanimated existante (glissement 500ms au changement de donneur).

---

## Design visuel

### Dimensions

- Mobile : **32px** (au lieu de 24px)
- Web : **36px** (au lieu de 28px)

### Couches de rendu (du fond vers l'avant)

1. **Ombre au sol** — `Circle` avec `blur(6)`, couleur `rgba(0,0,0,0.35)`, décalé de 2px vers le bas. Donne un effet flottant.

2. **Corps du jeton** — `Circle` rempli avec un dégradé radial :
   - Centre : `#f0c040` (doré clair, reflet)
   - Bord : `#9a7209` (doré foncé)
   - Le point focal du dégradé est légèrement décalé vers le haut-gauche pour simuler un éclairage.

3. **Anneau extérieur** — `Circle` en stroke (épaisseur 2px), couleur `#7a5a06`, pour marquer le bord du jeton.

4. **Reflet lumineux** — Arc supérieur (demi-cercle haut) en stroke semi-transparent `rgba(255,255,255,0.4)`, épaisseur 1px. Simule un highlight.

5. **Encoches décoratives** — 8 petits rectangles arrondis (`RoundedRect` ou `Path`) disposés radialement sur le pourtour, en `rgba(255,255,255,0.3)`. Chaque encoche : 4×2px, espacées de 45°.

6. **Lettre "D"** — Conservée en React Native `<Text>` superposé sur le `Canvas` Skia (évite de charger une font Skia). Blanc, bold, taille 14px (mobile) / 16px (web), avec `textShadowColor` pour le contraste.

### Structure du composant

```
<Animated.View style={[styles.conteneur, styleAnime]}>
  <Canvas style={styles.canvas} pointerEvents="none">
    {/* Ombre */}
    <Circle cx={centre} cy={centre+2} r={rayon} color="rgba(0,0,0,0.35)">
      <Blur blur={6} />
    </Circle>
    {/* Corps avec dégradé radial */}
    <Circle cx={centre} cy={centre} r={rayon}>
      <RadialGradient c={vec(centre-2, centre-2)} r={rayon} colors={['#f0c040','#9a7209']} />
    </Circle>
    {/* Anneau */}
    <Circle cx={centre} cy={centre} r={rayon-1} style="stroke" strokeWidth={2} color="#7a5a06" />
    {/* Reflet haut */}
    <Path path={arcHaut} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.4)" />
    {/* Encoches ×8 */}
    <Group>{encoches}</Group>
  </Canvas>
  <Text style={styles.texte}>D</Text>
</Animated.View>
```

### Animation

- Inchangée : `withTiming` sur `left`/`top`, durée `ANIMATIONS.redistribution.dureeGlissementDealer`, easing `inOut(ease)`.
- Le `Animated.View` conteneur se déplace, le contenu Skia+Text suit.

---

## Fichiers impactés

| Fichier                 | Changement                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `JetonDealer.tsx`       | Réécriture du rendu : Canvas Skia + Text RN superposé. Nouvelles constantes de taille.                              |
| `layout.ts`             | Mise à jour `TAILLE_JETON` si exporté (sinon reste local au composant). OFFSET_Y recalculé avec la nouvelle taille. |
| `jeton-dealer.test.tsx` | Adapter au nouveau rendu (testID conservé sur le View conteneur).                                                   |

## Hors périmètre

- Pas de changement de positionnement relatif aux avatars (juste recalcul OFFSET_Y pour la nouvelle taille).
- Pas de nouvelle dépendance (Skia déjà présent).
- Pas d'animation supplémentaire (rotation, pulsation, etc.).
