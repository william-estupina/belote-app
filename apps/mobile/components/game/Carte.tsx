import type { Carte, Couleur } from "@belote/shared-types";
import {
  Atlas,
  Canvas,
  Group,
  rect,
  Shadow,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { AtlasCartes } from "../../hooks/useAtlasCartes";

const RAYON_COIN = 6;
const LARGEUR_REFERENCE_DOS = 167;

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

function calculerMetriquesDos(largeur: number) {
  const facteur = largeur / LARGEUR_REFERENCE_DOS;

  return {
    rayonCoin: RAYON_COIN * facteur,
    rayonCadreExterieur: 5 * facteur,
    rayonMotifInterieur: 4 * facteur,
    bordureCarte: 2.5 * facteur,
    bordureCadreExterieur: 2 * facteur,
    bordureMotifInterieur: 1 * facteur,
    ombreOffsetX: 2 * facteur,
    ombreOffsetY: 3 * facteur,
    ombreRayon: 6 * facteur,
    elevation: 6 * facteur,
  };
}

export function CarteDos({ largeur, hauteur }: { largeur: number; hauteur: number }) {
  const marge = largeur * 0.08;
  const tailleMotif = largeur * 0.12;
  const metriques = calculerMetriquesDos(largeur);

  return (
    <View
      style={[
        dosStyles.carte,
        {
          width: largeur,
          height: hauteur,
          borderRadius: metriques.rayonCoin,
          borderWidth: metriques.bordureCarte,
          shadowOffset: {
            width: metriques.ombreOffsetX,
            height: metriques.ombreOffsetY,
          },
          shadowRadius: metriques.ombreRayon,
          elevation: metriques.elevation,
        },
      ]}
    >
      <View
        style={[
          dosStyles.cadreExterieur,
          {
            borderRadius: metriques.rayonCadreExterieur,
            margin: marge * 0.5,
            borderWidth: metriques.bordureCadreExterieur,
          },
        ]}
      >
        <View
          style={[
            dosStyles.motifInterieur,
            {
              borderRadius: metriques.rayonMotifInterieur,
              margin: marge * 0.4,
              borderWidth: metriques.bordureMotifInterieur,
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
    borderColor: "#c8a84e",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    overflow: "hidden",
  },
  cadreExterieur: {
    flex: 1,
    borderColor: "#dbb855",
  },
  motifInterieur: {
    flex: 1,
    backgroundColor: "#6a1010",
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

export function CarteDosAtlas({
  atlas,
  largeur,
  hauteur,
}: {
  atlas: AtlasCartes;
  largeur: number;
  hauteur: number;
}) {
  const { image, largeurCellule, hauteurCellule } = atlas;
  const sprite = atlas.rectDos();
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
    return <CarteDos largeur={largeur} hauteur={hauteur} />;
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
        <Group>
          <Shadow dx={1} dy={2} blur={4} color="rgba(0, 0, 0, 0.35)" />
          <Atlas image={image} sprites={sprites} transforms={transformations} />
        </Group>
      </Canvas>
    </View>
  );
}

export function CarteFaceAtlas({
  atlas,
  carte,
  largeur,
  hauteur,
  grisee = false,
}: {
  atlas: AtlasCartes;
  carte: Carte;
  largeur: number;
  hauteur: number;
  grisee?: boolean;
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
      >
        {grisee && (
          <View style={[faceAtlasStyles.overlayGris, { borderRadius: RAYON_COIN }]} />
        )}
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
        <Group>
          <Shadow dx={1} dy={2} blur={4} color="rgba(0, 0, 0, 0.35)" />
          <Atlas image={image} sprites={sprites} transforms={transformations} />
        </Group>
      </Canvas>
      {grisee && (
        <View style={[faceAtlasStyles.overlayGris, { borderRadius: RAYON_COIN }]} />
      )}
    </View>
  );
}

const faceAtlasStyles = StyleSheet.create({
  conteneur: {
    overflow: "hidden",
    borderRadius: RAYON_COIN,
  },
  overlayGris: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
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
