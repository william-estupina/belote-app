import type { Couleur } from "@belote/shared-types";
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

const NOMS_COULEUR: Record<Couleur, string> = {
  coeur: "C\u0153ur",
  carreau: "Carreau",
  pique: "Pique",
  trefle: "Tr\u00e8fle",
};

interface PropsIndicateurAtout {
  couleurAtout: Couleur | null;
}

export function IndicateurAtout({ couleurAtout }: PropsIndicateurAtout) {
  if (!couleurAtout) return null;

  return (
    <View style={styles.conteneur}>
      <Text style={styles.label}>Atout</Text>
      <Text style={[styles.symbole, { color: COULEURS_SYMBOLE[couleurAtout] }]}>
        {SYMBOLES_COULEUR[couleurAtout]}
      </Text>
      <Text style={styles.nom}>{NOMS_COULEUR[couleurAtout]}</Text>
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
  label: {
    color: COULEURS.texteSecondaire,
    fontSize: estWeb ? 11 : 8,
    textTransform: "uppercase",
  },
  nom: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 12 : 9,
  },
  symbole: {
    fontSize: estWeb ? 20 : 14,
  },
});
