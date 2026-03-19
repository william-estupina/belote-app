import type { Couleur, PliComplete, PositionJoueur, Rang } from "@belote/shared-types";
import { Platform, StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

interface PropsDernierPli {
  dernierPli: PliComplete;
}

const estWeb = Platform.OS === "web";
const LARGEUR_JETON = estWeb ? 50 : 46;
const HAUTEUR_JETON = estWeb ? 28 : 26;
const TAILLE_ZONE = estWeb ? 136 : 124;
const LARGEUR_CONTENEUR = estWeb ? 176 : 164;

const LIBELLES_RANG: Record<Rang, string> = {
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  valet: "V",
  dame: "D",
  roi: "R",
  as: "A",
};

const SYMBOLES_COULEUR: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

const COULEURS_TEXTE_COULEUR: Record<Couleur, string> = {
  coeur: "#d94b4b",
  carreau: "#d94b4b",
  pique: COULEURS.fondFonce,
  trefle: COULEURS.fondFonce,
};

function positionsCroix(): Record<PositionJoueur, { top: number; left: number }> {
  return {
    nord: {
      top: 0,
      left: (TAILLE_ZONE - LARGEUR_JETON) / 2,
    },
    sud: {
      top: TAILLE_ZONE - HAUTEUR_JETON,
      left: (TAILLE_ZONE - LARGEUR_JETON) / 2,
    },
    ouest: {
      top: (TAILLE_ZONE - HAUTEUR_JETON) / 2,
      left: 0,
    },
    est: {
      top: (TAILLE_ZONE - HAUTEUR_JETON) / 2,
      left: TAILLE_ZONE - LARGEUR_JETON,
    },
  };
}

const POSITIONS = positionsCroix();

function formaterCarte(rang: Rang, couleur: Couleur): string {
  return `${LIBELLES_RANG[rang]} ${SYMBOLES_COULEUR[couleur]}`;
}

export function DernierPli({ dernierPli }: PropsDernierPli) {
  return (
    <View style={styles.conteneur}>
      <View style={styles.enTete}>
        <Text style={styles.titre}>Dernier pli</Text>
        <Text style={styles.pointsBadge}>{dernierPli.points} pts</Text>
      </View>

      <View style={[styles.plateauCompact, { width: TAILLE_ZONE, height: TAILLE_ZONE }]}>
        {dernierPli.cartes.map(({ joueur, carte }) => {
          const estGagnant = joueur === dernierPli.gagnant;
          const position = POSITIONS[joueur];

          return (
            <View
              key={`dernier-pli-${joueur}`}
              style={[
                styles.jeton,
                { top: position.top, left: position.left },
                estGagnant && styles.jetonGagnant,
              ]}
            >
              <Text
                style={[
                  styles.texteJeton,
                  { color: COULEURS_TEXTE_COULEUR[carte.couleur] },
                ]}
              >
                {formaterCarte(carte.rang, carte.couleur)}
              </Text>
              {estGagnant && (
                <View style={styles.badgeGagnant}>
                  <Text style={styles.texteBadgeGagnant}>{"\u2605"}</Text>
                </View>
              )}
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
    width: LARGEUR_CONTENEUR,
    backgroundColor: "rgba(0, 0, 0, 0.56)",
    borderRadius: estWeb ? 28 : 24,
    paddingHorizontal: estWeb ? 12 : 10,
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: "center",
    zIndex: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  enTete: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  titre: {
    color: "#ffffffcc",
    fontSize: estWeb ? 12 : 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pointsBadge: {
    color: COULEURS.accent,
    fontSize: estWeb ? 12 : 11,
    fontWeight: "700",
  },
  plateauCompact: {
    position: "relative",
  },
  jeton: {
    position: "absolute",
    width: LARGEUR_JETON,
    height: HAUTEUR_JETON,
    borderRadius: 999,
    backgroundColor: COULEURS.surfaceCarte,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COULEURS.ombre,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2,
    elevation: 2,
  },
  jetonGagnant: {
    borderColor: COULEURS.accent,
    borderWidth: 2,
    shadowColor: COULEURS.accent,
    shadowOpacity: 0.32,
    shadowRadius: 4,
    elevation: 4,
  },
  texteJeton: {
    fontSize: estWeb ? 13 : 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  badgeGagnant: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ffd64a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ffd64a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 5,
  },
  texteBadgeGagnant: {
    color: "#3b2c00",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 12,
  },
});
