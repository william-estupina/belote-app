// Bulle affichée quand un joueur annonce "Belote" ou "Rebelote"
import type { PositionJoueur } from "@belote/shared-types";
import { Platform, StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

interface PropsBulleBelote {
  joueur: PositionJoueur;
  type: "belote" | "rebelote";
  largeurEcran: number;
  hauteurEcran: number;
}

// Positions des bulles près de chaque joueur (zone du pli)
const POSITIONS: Record<PositionJoueur, { x: number; y: number }> = {
  sud: { x: 0.5, y: 0.62 },
  nord: { x: 0.5, y: 0.32 },
  ouest: { x: 0.3, y: 0.47 },
  est: { x: 0.7, y: 0.47 },
};

// Largeur estimée de la bulle pour centrage
const LARGEUR_BULLE = 120;
const HAUTEUR_BULLE = 36;

export function BulleBelote({
  joueur,
  type,
  largeurEcran,
  hauteurEcran,
}: PropsBulleBelote) {
  const pos = POSITIONS[joueur];
  const texte = type === "belote" ? "Belote !" : "Rebelote !";

  return (
    <View
      style={[
        styles.conteneur,
        {
          left: pos.x * largeurEcran - LARGEUR_BULLE / 2,
          top: pos.y * hauteurEcran - HAUTEUR_BULLE / 2,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.bulle}>
        <Text style={styles.texte}>{texte}</Text>
      </View>
    </View>
  );
}

const estWeb = Platform.OS === "web";

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    zIndex: 60,
    width: LARGEUR_BULLE,
    alignItems: "center",
  },
  bulle: {
    backgroundColor: "rgba(30, 20, 0, 0.9)",
    paddingHorizontal: estWeb ? 18 : 14,
    paddingVertical: estWeb ? 8 : 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COULEURS.accent,
    alignItems: "center",
  },
  texte: {
    color: COULEURS.accent,
    fontSize: estWeb ? 16 : 14,
    fontWeight: "bold",
  },
});
