// Dialogue affiché à la fin d'une partie — affiche le gagnant et permet de rejouer
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

interface PropsDialogueFinPartie {
  scoreEquipe1: number;
  scoreEquipe2: number;
  scoreObjectif: number;
  onRecommencer: () => void;
}

export function DialogueFinPartie({
  scoreEquipe1,
  scoreEquipe2,
  scoreObjectif,
  onRecommencer,
}: PropsDialogueFinPartie) {
  const victoire = scoreEquipe1 >= scoreObjectif;

  return (
    <View style={styles.overlay}>
      <View style={styles.panneau}>
        <Text
          style={[styles.titre, victoire ? styles.titreVictoire : styles.titreDefaite]}
        >
          {victoire ? "Victoire !" : "Défaite"}
        </Text>

        <Text style={styles.sousTitre}>
          {victoire
            ? "Votre équipe a remporté la partie !"
            : "L'équipe adverse a remporté la partie."}
        </Text>

        {/* Scores finaux */}
        <View style={styles.scores}>
          <View style={styles.ligne}>
            <Text style={styles.equipe}>Vous</Text>
            <Text style={[styles.score, victoire && styles.scoreGagnant]}>
              {scoreEquipe1}
            </Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.equipe}>Adversaires</Text>
            <Text style={[styles.score, !victoire && styles.scoreGagnant]}>
              {scoreEquipe2}
            </Text>
          </View>
        </View>

        <Pressable style={styles.bouton} onPress={onRecommencer}>
          <Text style={styles.texteBouton}>Nouvelle partie</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  panneau: {
    backgroundColor: "#1a3a2a",
    borderRadius: 16,
    paddingHorizontal: estWeb ? 40 : 28,
    paddingVertical: estWeb ? 32 : 24,
    minWidth: estWeb ? 320 : 260,
    gap: estWeb ? 14 : 10,
    borderWidth: 2,
    borderColor: COULEURS.accent,
    alignItems: "center",
  },
  titre: {
    fontSize: estWeb ? 28 : 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  titreVictoire: {
    color: COULEURS.accent,
  },
  titreDefaite: {
    color: COULEURS.danger,
  },
  sousTitre: {
    color: COULEURS.texteSecondaire,
    fontSize: estWeb ? 14 : 12,
    textAlign: "center",
  },
  scores: {
    width: "100%",
    gap: 6,
    marginVertical: 4,
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
  score: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 20 : 18,
    fontWeight: "bold",
  },
  scoreGagnant: {
    color: COULEURS.accent,
  },
  bouton: {
    backgroundColor: COULEURS.boutonPrimaire,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  texteBouton: {
    color: COULEURS.boutonPrimaireTexte,
    fontWeight: "bold",
    fontSize: estWeb ? 16 : 14,
  },
});
