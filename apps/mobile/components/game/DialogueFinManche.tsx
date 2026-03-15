// Dialogue affiché à la fin d'une manche — affiche les scores et permet de continuer
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

interface PropsDialogueFinManche {
  pointsEquipe1: number;
  pointsEquipe2: number;
  scoreEquipe1: number;
  scoreEquipe2: number;
  onContinuer: () => void;
}

export function DialogueFinManche({
  pointsEquipe1,
  pointsEquipe2,
  scoreEquipe1,
  scoreEquipe2,
  onContinuer,
}: PropsDialogueFinManche) {
  return (
    <View style={styles.overlay}>
      <View style={styles.panneau}>
        <Text style={styles.titre}>Fin de manche</Text>

        {/* Points de la manche */}
        <View style={styles.ligne}>
          <Text style={styles.equipe}>Vous</Text>
          <Text style={styles.points}>{pointsEquipe1} pts</Text>
        </View>
        <View style={styles.ligne}>
          <Text style={styles.equipe}>Adversaires</Text>
          <Text style={styles.points}>{pointsEquipe2} pts</Text>
        </View>

        <View style={styles.separateur} />

        {/* Scores cumulés */}
        <Text style={styles.sousTitre}>Score total</Text>
        <View style={styles.ligne}>
          <Text style={styles.equipe}>Vous</Text>
          <Text style={styles.score}>{scoreEquipe1}</Text>
        </View>
        <View style={styles.ligne}>
          <Text style={styles.equipe}>Adversaires</Text>
          <Text style={styles.score}>{scoreEquipe2}</Text>
        </View>

        <Pressable style={styles.bouton} onPress={onContinuer}>
          <Text style={styles.texteBouton}>Continuer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const estWeb = Platform.OS === "web";

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  panneau: {
    backgroundColor: "#1a3a2a",
    borderRadius: 16,
    paddingHorizontal: estWeb ? 32 : 24,
    paddingVertical: estWeb ? 24 : 20,
    minWidth: estWeb ? 300 : 250,
    gap: estWeb ? 10 : 8,
    borderWidth: 2,
    borderColor: COULEURS.accent,
  },
  titre: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 22 : 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  sousTitre: {
    color: COULEURS.texteSecondaire,
    fontSize: estWeb ? 13 : 11,
    textTransform: "uppercase",
    textAlign: "center",
  },
  ligne: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  equipe: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 16 : 14,
  },
  points: {
    color: COULEURS.accent,
    fontSize: estWeb ? 18 : 16,
    fontWeight: "bold",
  },
  score: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 18 : 16,
    fontWeight: "bold",
  },
  separateur: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginVertical: 4,
  },
  bouton: {
    backgroundColor: COULEURS.boutonPrimaire,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  texteBouton: {
    color: COULEURS.boutonPrimaireTexte,
    fontWeight: "bold",
    fontSize: estWeb ? 16 : 14,
  },
});
