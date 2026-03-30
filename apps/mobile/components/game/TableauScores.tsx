import { memo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

interface PropsTableauScores {
  scoreEquipe1: number;
  scoreEquipe2: number;
}

export const TableauScores = memo(function TableauScores({
  scoreEquipe1,
  scoreEquipe2,
}: PropsTableauScores) {
  return (
    <View style={styles.conteneur}>
      <View style={styles.ligne}>
        <Text style={styles.labelEquipe}>Nous</Text>
        <Text style={styles.score}>{scoreEquipe1}</Text>
      </View>
      <View style={styles.separateur} />
      <View style={styles.ligne}>
        <Text style={styles.labelEquipe}>Eux</Text>
        <Text style={styles.score}>{scoreEquipe2}</Text>
      </View>
    </View>
  );
});

const estWeb = Platform.OS === "web";

const styles = StyleSheet.create({
  conteneur: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 8,
    paddingHorizontal: estWeb ? 14 : 10,
    paddingVertical: estWeb ? 8 : 5,
  },
  labelEquipe: {
    color: COULEURS.texteSecondaire,
    fontSize: estWeb ? 14 : 12,
    marginRight: estWeb ? 14 : 10,
  },
  ligne: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minWidth: estWeb ? 90 : 70,
  },
  score: {
    color: COULEURS.textePrincipal,
    fontWeight: "bold",
    fontSize: estWeb ? 18 : 14,
  },
  separateur: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    height: 1,
    marginVertical: estWeb ? 4 : 3,
  },
});
