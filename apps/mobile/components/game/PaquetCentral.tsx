import { memo } from "react";
import { StyleSheet, View } from "react-native";

import {
  ANIMATIONS,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";
import { CarteDos } from "./Carte";

interface PropsPaquetCentral {
  cartesRestantes: number;
  largeurEcran: number;
  hauteurEcran: number;
}

/**
 * Paquet de dos de cartes empilées au centre du tapis.
 * Visible uniquement pendant la distribution, diminue visuellement
 * au fur et à mesure que les cartes sont distribuées.
 */
export const PaquetCentral = memo(function PaquetCentral({
  cartesRestantes,
  largeurEcran,
  hauteurEcran,
}: PropsPaquetCentral) {
  if (cartesRestantes <= 0) return null;

  const nbCouches = Math.min(5, Math.ceil(cartesRestantes / 6));
  // Même facteur 0.85 que ZoneCarteRetournee pour une transition cohérente
  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE * 0.85);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  // Position alignée sur le paquet de ZoneCarteRetournee
  // Le paquet est la partie gauche d'un ensemble (paquet + espacement + carte retournée)
  const espacement = 6;
  const largeurTotale = largeurCarte * 2 + espacement;
  const centreX = largeurEcran * 0.5 - largeurTotale / 2;
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
