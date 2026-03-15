// Affiche la carte retournée au centre du plateau pendant les enchères
import type { Carte } from "@belote/shared-types";
import { Platform, StyleSheet, Text, View } from "react-native";

import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { COULEURS } from "../../constants/theme";
import { CarteSkia } from "./Carte";

interface PropsZoneCarteRetournee {
  carte: Carte;
  largeurEcran: number;
  hauteurEcran: number;
}

export function ZoneCarteRetournee({
  carte,
  largeurEcran,
  hauteurEcran,
}: PropsZoneCarteRetournee) {
  const largeurCarte = largeurEcran * RATIO_LARGEUR_CARTE * 1.3;
  const hauteurCarte = largeurCarte * RATIO_ASPECT_CARTE;

  return (
    <View
      style={[
        styles.conteneur,
        {
          left: largeurEcran * 0.5 - largeurCarte / 2,
          top: hauteurEcran * 0.33 - hauteurCarte / 2,
        },
      ]}
    >
      <CarteSkia
        carte={carte}
        largeur={largeurCarte}
        hauteur={hauteurCarte}
        faceVisible
      />
      <Text style={styles.label}>Carte retournée</Text>
    </View>
  );
}

const estWeb = Platform.OS === "web";

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    alignItems: "center",
    zIndex: 15,
    gap: 4,
  },
  label: {
    color: COULEURS.texteSecondaire,
    fontSize: estWeb ? 11 : 9,
    textTransform: "uppercase",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
