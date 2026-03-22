import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { obtenirOrigineDistribution } from "../../hooks/distributionLayoutAtlas";
import { CarteDos } from "./Carte";

interface PropsPaquetCentral {
  cartesRestantes: number;
  largeurEcran: number;
  hauteurEcran: number;
  indexDonneur: number;
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
  indexDonneur,
}: PropsPaquetCentral) {
  if (cartesRestantes <= 0) return null;

  const nbCouches = Math.min(5, Math.ceil(cartesRestantes / 6));
  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE * 0.85);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
  const origineDistribution = obtenirOrigineDistribution(indexDonneur);
  const centreX = largeurEcran * origineDistribution.x - largeurCarte / 2;
  const centreY = hauteurEcran * origineDistribution.y - hauteurCarte / 2;

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
          <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
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
