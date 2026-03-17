import type { Couleur, PositionJoueur } from "@belote/shared-types";
import { Platform, StyleSheet, Text, View } from "react-native";

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
  pique: "#ffffff",
  trefle: "#ffffff",
};

const NOMS_JOUEUR: Record<PositionJoueur, string> = {
  sud: "Vous",
  nord: "Nord",
  ouest: "Ouest",
  est: "Est",
};

interface PropsIndicateurAtout {
  couleurAtout: Couleur | null;
  positionPreneur: PositionJoueur | null;
}

export function IndicateurAtout({ couleurAtout, positionPreneur }: PropsIndicateurAtout) {
  if (!couleurAtout || !positionPreneur) return null;

  return (
    <View style={styles.conteneur}>
      <Text style={[styles.symbole, { color: COULEURS_SYMBOLE[couleurAtout] }]}>
        {SYMBOLES_COULEUR[couleurAtout]}
      </Text>
      <View style={styles.textes}>
        <Text style={styles.label}>Atout</Text>
        <Text style={styles.preneur}>{NOMS_JOUEUR[positionPreneur]}</Text>
      </View>
    </View>
  );
}

const estWeb = Platform.OS === "web";

const styles = StyleSheet.create({
  conteneur: {
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 6,
    paddingHorizontal: estWeb ? 10 : 6,
    paddingVertical: estWeb ? 5 : 3,
    gap: estWeb ? 6 : 4,
  },
  textes: {
    alignItems: "flex-start",
  },
  label: {
    color: COULEURS.texteSecondaire,
    fontSize: estWeb ? 10 : 7,
    textTransform: "uppercase",
  },
  preneur: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 11 : 8,
    fontWeight: "bold",
  },
  symbole: {
    fontSize: estWeb ? 22 : 16,
  },
});
