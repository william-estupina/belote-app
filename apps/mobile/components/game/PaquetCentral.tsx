import { memo } from "react";
import { StyleSheet, View } from "react-native";

import {
  ANIMATIONS,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CanvasCartesAtlas } from "./CanvasCartesAtlas";

interface PropsPaquetCentral {
  cartesRestantes: number;
  largeurEcran: number;
  hauteurEcran: number;
  atlas: AtlasCartes;
}

/**
 * Paquet de dos de cartes empilees proche du donneur courant.
 * Visible uniquement pendant la distribution, diminue visuellement
 * au fur et a mesure que les cartes sont distribuees.
 */
export const PaquetCentral = memo(function PaquetCentral({
  cartesRestantes,
  largeurEcran,
  hauteurEcran,
  atlas,
}: PropsPaquetCentral) {
  if (cartesRestantes <= 0) return null;

  const nbCouches = Math.min(5, Math.ceil(cartesRestantes / 6));
  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE * 0.85);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
  const centreX = largeurEcran * ANIMATIONS.distribution.originX - largeurCarte / 2;
  const centreY = hauteurEcran * ANIMATIONS.distribution.originY - hauteurCarte / 2;

  return (
    <View
      style={[
        styles.conteneur,
        {
          left: centreX,
          top: centreY,
          width: largeurCarte,
          height: hauteurCarte,
        },
      ]}
    >
      {Array.from({ length: nbCouches }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.couche,
            {
              left: i * 0.5,
              top: -i * 1,
            },
          ]}
        >
          <CanvasCartesAtlas
            atlas={atlas}
            largeur={largeurCarte}
            hauteur={hauteurCarte}
            cartes={[
              {
                id: `dos-paquet-${i}`,
                type: "dos",
                x: 0,
                y: 0,
                largeur: largeurCarte,
                hauteur: hauteurCarte,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    zIndex: 30,
  },
  couche: {
    position: "absolute",
  },
});
