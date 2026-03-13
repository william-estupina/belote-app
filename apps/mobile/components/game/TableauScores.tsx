import { StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

interface PropsTableauScores {
  scoreEquipe1: number;
  scoreEquipe2: number;
}

export function TableauScores({ scoreEquipe1, scoreEquipe2 }: PropsTableauScores) {
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
}

const styles = StyleSheet.create({
  conteneur: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  labelEquipe: {
    color: COULEURS.texteSecondaire,
    fontSize: 12,
    marginRight: 10,
  },
  ligne: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minWidth: 80,
  },
  score: {
    color: COULEURS.textePrincipal,
    fontWeight: "bold",
    fontSize: 14,
  },
  separateur: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    height: 1,
    marginVertical: 3,
  },
});
