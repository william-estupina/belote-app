// Panneau d'enchères — UI pour que le joueur humain prenne, annonce ou passe
import type { Carte, Couleur } from "@belote/shared-types";
import { COULEURS as TOUTES_COULEURS } from "@belote/shared-types";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

const SYMBOLES_COULEUR: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

const COULEURS_SYMBOLE: Record<Couleur, string> = {
  coeur: "#cc0000",
  carreau: "#cc0000",
  pique: "#1a1a1a",
  trefle: "#1a1a1a",
};

const NOMS_COULEUR: Record<Couleur, string> = {
  coeur: "Cœur",
  carreau: "Carreau",
  pique: "Pique",
  trefle: "Trèfle",
};

interface PropsPanneauEncheres {
  phaseEncheres: "encheres1" | "encheres2";
  carteRetournee: Carte | null;
  onPrendre: () => void;
  onAnnoncer: (couleur: Couleur) => void;
  onPasser: () => void;
}

export function PanneauEncheres({
  phaseEncheres,
  carteRetournee,
  onPrendre,
  onAnnoncer,
  onPasser,
}: PropsPanneauEncheres) {
  const estTour1 = phaseEncheres === "encheres1";

  return (
    <View style={styles.conteneur}>
      <View style={styles.panneau}>
        {/* Titre */}
        <Text style={styles.titre}>
          {estTour1 ? "Prendre ?" : "Annoncer une couleur ?"}
        </Text>

        {/* Carte retournée (tour 1) */}
        {estTour1 && carteRetournee && (
          <View style={styles.carteRetournee}>
            <Text style={styles.carteRetourneeLabel}>Carte retournée :</Text>
            <Text
              style={[
                styles.carteRetourneeValeur,
                { color: COULEURS_SYMBOLE[carteRetournee.couleur] },
              ]}
            >
              {carteRetournee.rang.toUpperCase()}{" "}
              {SYMBOLES_COULEUR[carteRetournee.couleur]}
            </Text>
          </View>
        )}

        {/* Boutons */}
        <View style={styles.boutons}>
          {estTour1 ? (
            // Tour 1 : Prendre ou Passer
            <>
              <Pressable style={styles.boutonPrendre} onPress={onPrendre}>
                <Text style={styles.texteBoutonPrendre}>Prendre</Text>
              </Pressable>
              <Pressable style={styles.boutonPasser} onPress={onPasser}>
                <Text style={styles.texteBoutonPasser}>Passer</Text>
              </Pressable>
            </>
          ) : (
            // Tour 2 : Choisir une couleur différente de la retournée, ou Passer
            <>
              <View style={styles.grilleCouleurs}>
                {TOUTES_COULEURS.filter(
                  (c) => carteRetournee === null || c !== carteRetournee.couleur,
                ).map((couleur) => (
                  <Pressable
                    key={couleur}
                    style={styles.boutonCouleur}
                    onPress={() => onAnnoncer(couleur)}
                  >
                    <Text
                      style={[
                        styles.symboleCouleur,
                        { color: COULEURS_SYMBOLE[couleur] },
                      ]}
                    >
                      {SYMBOLES_COULEUR[couleur]}
                    </Text>
                    <Text style={styles.nomCouleur}>{NOMS_COULEUR[couleur]}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.boutonPasser} onPress={onPasser}>
                <Text style={styles.texteBoutonPasser}>Passer</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const estWeb = Platform.OS === "web";

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    bottom: estWeb ? "28%" : "25%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 30,
  },
  panneau: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderRadius: 12,
    paddingHorizontal: estWeb ? 24 : 16,
    paddingVertical: estWeb ? 16 : 12,
    alignItems: "center",
    minWidth: estWeb ? 280 : 220,
    gap: estWeb ? 12 : 8,
  },
  titre: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 16 : 14,
    fontWeight: "bold",
  },
  carteRetournee: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  carteRetourneeLabel: {
    color: COULEURS.texteSecondaire,
    fontSize: estWeb ? 13 : 11,
  },
  carteRetourneeValeur: {
    fontSize: estWeb ? 16 : 14,
    fontWeight: "bold",
  },
  boutons: {
    alignItems: "center",
    gap: estWeb ? 10 : 8,
    width: "100%",
  },
  boutonPrendre: {
    backgroundColor: COULEURS.boutonPrimaire,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  texteBoutonPrendre: {
    color: COULEURS.boutonPrimaireTexte,
    fontWeight: "bold",
    fontSize: estWeb ? 15 : 13,
  },
  boutonPasser: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  texteBoutonPasser: {
    color: COULEURS.texteSecondaire,
    fontSize: estWeb ? 14 : 12,
  },
  grilleCouleurs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  boutonCouleur: {
    backgroundColor: COULEURS.surfaceCarte,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    minWidth: estWeb ? 80 : 65,
  },
  symboleCouleur: {
    fontSize: estWeb ? 24 : 20,
  },
  nomCouleur: {
    color: "#333",
    fontSize: estWeb ? 11 : 9,
    marginTop: 2,
  },
});
