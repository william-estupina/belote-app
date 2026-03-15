import type { PliComplete, PositionJoueur } from "@belote/shared-types";
import { Platform, StyleSheet, Text, View } from "react-native";

import { RATIO_ASPECT_CARTE } from "../../constants/layout";
import { CarteSkia } from "./Carte";

interface PropsDernierPli {
  dernierPli: PliComplete;
}

const estWeb = Platform.OS === "web";

const LARGEUR_MINI_CARTE = estWeb ? 26 : 22;
const HAUTEUR_MINI_CARTE = Math.round(LARGEUR_MINI_CARTE * RATIO_ASPECT_CARTE);

// Taille du mini-plateau (carré)
const TAILLE_ZONE = LARGEUR_MINI_CARTE * 4;

// Positions relatives des cartes dans le mini-plateau (comme sur le vrai plateau)
const POSITIONS_MINI: Record<PositionJoueur, { top: number; left: number }> = {
  nord: {
    top: 0,
    left: (TAILLE_ZONE - LARGEUR_MINI_CARTE) / 2,
  },
  sud: {
    top: TAILLE_ZONE - HAUTEUR_MINI_CARTE,
    left: (TAILLE_ZONE - LARGEUR_MINI_CARTE) / 2,
  },
  ouest: {
    top: (TAILLE_ZONE - HAUTEUR_MINI_CARTE) / 2,
    left: 0,
  },
  est: {
    top: (TAILLE_ZONE - HAUTEUR_MINI_CARTE) / 2,
    left: TAILLE_ZONE - LARGEUR_MINI_CARTE,
  },
};

export function DernierPli({ dernierPli }: PropsDernierPli) {
  return (
    <View style={styles.conteneur}>
      <Text style={styles.titre}>Dernier pli</Text>
      <View style={[styles.miniPlateau, { width: TAILLE_ZONE, height: TAILLE_ZONE }]}>
        {dernierPli.cartes.map(({ joueur, carte }) => {
          const pos = POSITIONS_MINI[joueur];
          const estGagnant = joueur === dernierPli.gagnant;
          return (
            <View
              key={`dp-${joueur}`}
              style={[
                styles.carteMini,
                { top: pos.top, left: pos.left },
                estGagnant && styles.carteGagnante,
              ]}
            >
              <CarteSkia
                carte={carte}
                largeur={LARGEUR_MINI_CARTE}
                hauteur={HAUTEUR_MINI_CARTE}
                faceVisible
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    top: estWeb ? 8 : 4,
    right: estWeb ? 8 : 40,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 6,
    alignItems: "center",
    zIndex: 10,
  },
  titre: {
    color: "#ffffffaa",
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  miniPlateau: {
    position: "relative",
  },
  carteMini: {
    position: "absolute",
  },
  carteGagnante: {
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 4,
  },
});
