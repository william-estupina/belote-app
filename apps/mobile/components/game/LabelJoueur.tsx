import type { PositionJoueur } from "@belote/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

const NOMS_POSITION: Record<PositionJoueur, string> = {
  sud: "Vous",
  nord: "Partenaire",
  ouest: "Adversaire",
  est: "Adversaire",
};

interface PropsLabelJoueur {
  position: PositionJoueur;
  largeurEcran: number;
  hauteurEcran: number;
}

// Positions relatives à la zone de jeu (sans header)
const COORDS: Record<
  PositionJoueur,
  { x: number; y: number; align: "center" | "left" | "right" }
> = {
  sud: { x: 0.5, y: 0.82, align: "center" },
  nord: { x: 0.5, y: 0.12, align: "center" },
  ouest: { x: 0.02, y: 0.68, align: "left" },
  est: { x: 0.98, y: 0.68, align: "right" },
};

export function LabelJoueur({ position, largeurEcran, hauteurEcran }: PropsLabelJoueur) {
  const coord = COORDS[position];

  const alignStyle =
    coord.align === "center"
      ? { left: coord.x * largeurEcran, transform: [{ translateX: -35 }] }
      : coord.align === "left"
        ? { left: coord.x * largeurEcran }
        : { right: (1 - coord.x) * largeurEcran };

  return (
    <View
      style={[styles.conteneur, { top: coord.y * hauteurEcran }, alignStyle]}
      pointerEvents="none"
    >
      <Text style={styles.texte}>{NOMS_POSITION[position]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
  },
  texte: {
    color: COULEURS.texteSecondaire,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
  },
});
