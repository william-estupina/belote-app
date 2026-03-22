import type { Carte, Couleur } from "@belote/shared-types";
import { Atlas, Canvas, rect, useRSXformBuffer } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";

import { type AtlasCartes, SPRITE_SHEET_SOURCE } from "../../hooks/useAtlasCartes";

const RAYON_COIN = 6;

// Couleurs des symboles (utilisé par SymboleCouleur)
const COULEURS_SYMBOLES: Record<Couleur, string> = {
  coeur: "#c41e3a",
  carreau: "#c41e3a",
  pique: "#1b1b2f",
  trefle: "#1b1b2f",
};

// Symboles Unicode pour chaque couleur (utilisé par SymboleCouleur)
const SYMBOLES: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

// --- Dos de carte ---

export function CarteDos({ largeur, hauteur }: { largeur: number; hauteur: number }) {
  const marge = largeur * 0.08;
  const tailleMotif = largeur * 0.12;

  return (
    <View
      style={[
        dosStyles.carte,
        {
          width: largeur,
          height: hauteur,
          borderRadius: RAYON_COIN,
        },
      ]}
    >
      <View
        style={[
          dosStyles.cadreExterieur,
          {
            borderRadius: RAYON_COIN - 1,
            margin: marge * 0.5,
          },
        ]}
      >
        <View
          style={[
            dosStyles.motifInterieur,
            {
              borderRadius: RAYON_COIN - 2,
              margin: marge * 0.4,
            },
          ]}
        >
          <View style={dosStyles.grilleMotif}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Text
                key={i}
                style={[
                  dosStyles.motifLosange,
                  { fontSize: tailleMotif, lineHeight: tailleMotif * 1.2 },
                ]}
              >
                {"\u2666"}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const dosStyles = StyleSheet.create({
  carte: {
    backgroundColor: "#9b2020",
    borderWidth: 2.5,
    borderColor: "#c8a84e",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
    overflow: "hidden",
  },
  cadreExterieur: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#dbb855",
  },
  motifInterieur: {
    flex: 1,
    backgroundColor: "#6a1010",
    borderWidth: 1,
    borderColor: "#dbb855",
    overflow: "hidden",
  },
  grilleMotif: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    alignContent: "center",
    padding: "4%",
  },
  motifLosange: {
    color: "#c04040",
    textAlign: "center",
    width: "33%",
  },
});

export function CarteFaceAtlas({
  atlas,
  carte,
  largeur,
  hauteur,
}: {
  atlas: AtlasCartes;
  carte: Carte;
  largeur: number;
  hauteur: number;
}) {
  const { image, largeurCellule, hauteurCellule } = atlas;
  const sprite = atlas.rectSource(carte.couleur, carte.rang);
  const sprites = useMemo(
    () => [rect(sprite.x, sprite.y, sprite.width, sprite.height)],
    [sprite.height, sprite.width, sprite.x, sprite.y],
  );
  const echelle =
    largeurCellule > 0 && hauteurCellule > 0
      ? Math.min(largeur / largeurCellule, hauteur / hauteurCellule)
      : 1;
  const transformations = useRSXformBuffer(1, (valeur) => {
    "worklet";
    valeur.set(echelle, 0, 0, 0);
  });

  if (!image || largeurCellule === 0 || hauteurCellule === 0) {
    return (
      <View
        style={[
          faceAtlasStyles.conteneur,
          {
            width: largeur,
            height: hauteur,
            borderRadius: RAYON_COIN,
            backgroundColor: "#f0e8d4",
          },
        ]}
      />
    );
  }

  if (Platform.OS === "web") {
    const sourceSprite =
      typeof SPRITE_SHEET_SOURCE === "string"
        ? { uri: SPRITE_SHEET_SOURCE }
        : SPRITE_SHEET_SOURCE;

    return (
      <View
        style={[
          faceAtlasStyles.conteneur,
          {
            width: largeur,
            height: hauteur,
            overflow: "hidden",
            borderRadius: RAYON_COIN,
          },
        ]}
      >
        <Image
          source={sourceSprite}
          style={{
            position: "absolute",
            width: image.width() * echelle,
            height: image.height() * echelle,
            transform: [
              { translateX: -sprite.x * echelle },
              { translateY: -sprite.y * echelle },
            ],
          }}
          resizeMode="stretch"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        faceAtlasStyles.conteneur,
        {
          width: largeur,
          height: hauteur,
        },
      ]}
    >
      <Canvas style={{ width: largeur, height: hauteur }} pointerEvents="none">
        <Atlas image={image} sprites={sprites} transforms={transformations} />
      </Canvas>
    </View>
  );
}

const faceAtlasStyles = StyleSheet.create({
  conteneur: {
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
});

/**
 * Composant simple pour afficher le symbole d'une couleur.
 * Utilisé par IndicateurAtout et d'autres UI non-jeu.
 */
export function SymboleCouleur({
  couleur,
  taille = 24,
}: {
  couleur: Couleur;
  taille?: number;
}) {
  return (
    <Text style={{ fontSize: taille, color: COULEURS_SYMBOLES[couleur] }}>
      {SYMBOLES[couleur]}
    </Text>
  );
}
