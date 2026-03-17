import type { PliComplete, PositionJoueur } from "@belote/shared-types";
import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { RATIO_ASPECT_CARTE } from "../../constants/layout";
import { COULEURS } from "../../constants/theme";
import { CarteSkia } from "./Carte";

interface PropsDernierPli {
  dernierPli: PliComplete;
}

const estWeb = Platform.OS === "web";

// --- Mini-cartes (vignette) ---
const LARGEUR_MINI_CARTE = estWeb ? 46 : 38;
const HAUTEUR_MINI_CARTE = Math.round(LARGEUR_MINI_CARTE * RATIO_ASPECT_CARTE);
const TAILLE_ZONE_MINI = LARGEUR_MINI_CARTE * 4;

// --- Grandes cartes (overlay agrandi) ---
const LARGEUR_GRANDE_CARTE = estWeb ? 90 : 72;
const HAUTEUR_GRANDE_CARTE = Math.round(LARGEUR_GRANDE_CARTE * RATIO_ASPECT_CARTE);
const TAILLE_ZONE_GRANDE = LARGEUR_GRANDE_CARTE * 4;

// Positions relatives des cartes dans le mini-plateau (croix)
function positionsCroix(
  tailleZone: number,
  largeurCarte: number,
  hauteurCarte: number,
): Record<PositionJoueur, { top: number; left: number }> {
  return {
    nord: {
      top: 0,
      left: (tailleZone - largeurCarte) / 2,
    },
    sud: {
      top: tailleZone - hauteurCarte,
      left: (tailleZone - largeurCarte) / 2,
    },
    ouest: {
      top: (tailleZone - hauteurCarte) / 2,
      left: 0,
    },
    est: {
      top: (tailleZone - hauteurCarte) / 2,
      left: tailleZone - largeurCarte,
    },
  };
}

const POSITIONS_MINI = positionsCroix(
  TAILLE_ZONE_MINI,
  LARGEUR_MINI_CARTE,
  HAUTEUR_MINI_CARTE,
);
const POSITIONS_GRANDE = positionsCroix(
  TAILLE_ZONE_GRANDE,
  LARGEUR_GRANDE_CARTE,
  HAUTEUR_GRANDE_CARTE,
);

const LABELS_POSITION: Record<PositionJoueur, string> = {
  sud: "Vous",
  nord: "Nord",
  ouest: "Ouest",
  est: "Est",
};

export function DernierPli({ dernierPli }: PropsDernierPli) {
  const [agrandi, setAgrandi] = useState(false);

  return (
    <>
      {/* Vignette compacte — cliquable */}
      <Pressable
        style={styles.conteneur}
        onPress={() => setAgrandi(true)}
        accessibilityRole="button"
        accessibilityLabel="Voir le dernier pli en détail"
      >
        <View style={styles.enTete}>
          <Text style={styles.titre}>Dernier pli</Text>
          <Text style={styles.pointsBadge}>{dernierPli.points} pts</Text>
        </View>
        <View
          style={[
            styles.miniPlateau,
            { width: TAILLE_ZONE_MINI, height: TAILLE_ZONE_MINI },
          ]}
        >
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
                {estGagnant && (
                  <View style={styles.badgeGagnantMini}>
                    <Text style={styles.texteBadgeGagnantMini}>&#9733;</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <Text style={styles.indiceAgrandir}>Appuyer pour agrandir</Text>
      </Pressable>

      {/* Overlay agrandi */}
      <Modal
        visible={agrandi}
        transparent
        animationType="fade"
        onRequestClose={() => setAgrandi(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setAgrandi(false)}>
          <View style={styles.panneauAgrandi}>
            <Text style={styles.titreAgrandi}>Dernier pli</Text>

            <View
              style={[
                styles.grandPlateau,
                { width: TAILLE_ZONE_GRANDE, height: TAILLE_ZONE_GRANDE },
              ]}
            >
              {dernierPli.cartes.map(({ joueur, carte }) => {
                const pos = POSITIONS_GRANDE[joueur];
                const estGagnant = joueur === dernierPli.gagnant;
                return (
                  <View
                    key={`dpg-${joueur}`}
                    style={[
                      styles.carteGrande,
                      { top: pos.top, left: pos.left },
                      estGagnant && styles.carteGagnanteGrande,
                    ]}
                  >
                    <CarteSkia
                      carte={carte}
                      largeur={LARGEUR_GRANDE_CARTE}
                      hauteur={HAUTEUR_GRANDE_CARTE}
                      faceVisible
                    />
                    {estGagnant && (
                      <View style={styles.badgeGagnant}>
                        <Text style={styles.texteBadgeGagnant}>&#9733;</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Info gagnant + points */}
            <Text style={styles.infoGagnant}>
              {LABELS_POSITION[dernierPli.gagnant]} remporte le pli ({dernierPli.points}{" "}
              pts)
            </Text>

            <Text style={styles.indiceFermer}>Appuyer pour fermer</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // --- Vignette ---
  conteneur: {
    position: "absolute",
    top: estWeb ? 8 : 4,
    right: estWeb ? 8 : 40,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    alignItems: "center",
    zIndex: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  enTete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
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
  miniPlateau: {
    position: "relative",
  },
  carteMini: {
    position: "absolute",
  },
  carteGagnante: {
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 6,
  },
  badgeGagnantMini: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ffd700",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 4,
  },
  texteBadgeGagnantMini: {
    fontSize: 9,
    color: "#1a1a1a",
    fontWeight: "bold",
  },
  indiceAgrandir: {
    color: "rgba(255, 255, 255, 0.35)",
    fontSize: 8,
    marginTop: 2,
  },

  // --- Overlay agrandi ---
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  panneauAgrandi: {
    backgroundColor: "#1a3a2a",
    borderRadius: 16,
    paddingHorizontal: estWeb ? 40 : 30,
    paddingVertical: estWeb ? 28 : 22,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COULEURS.accent,
    gap: 10,
  },
  titreAgrandi: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 20 : 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  grandPlateau: {
    position: "relative",
  },
  carteGrande: {
    position: "absolute",
  },
  carteGagnanteGrande: {
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  badgeGagnant: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffd700",
    alignItems: "center",
    justifyContent: "center",
  },
  texteBadgeGagnant: {
    fontSize: 12,
    color: "#1a1a1a",
  },
  infoGagnant: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 15 : 13,
    fontWeight: "600",
  },
  indiceFermer: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: estWeb ? 12 : 10,
  },
});
