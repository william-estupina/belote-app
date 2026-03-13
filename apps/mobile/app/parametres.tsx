import type { Difficulte } from "@belote/shared-types";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { BORDURES, COULEURS, ESPACEMENTS, TYPOGRAPHIE } from "../constants/theme";
import { useAppStore } from "../stores/app-store";

const OPTIONS_DIFFICULTE: { valeur: Difficulte; libelle: string }[] = [
  { valeur: "facile", libelle: "Facile" },
  { valeur: "moyen", libelle: "Moyen" },
  { valeur: "difficile", libelle: "Difficile" },
];

const OPTIONS_SCORE: number[] = [500, 1000, 1500, 2000];

export default function EcranParametres() {
  const { preferences, setDifficulte, setSonActive, setScoreObjectif } = useAppStore();

  return (
    <ScrollView style={styles.conteneur} contentContainerStyle={styles.contenu}>
      {/* Difficulté */}
      <View style={styles.section}>
        <Text style={styles.titreSectionTexte}>Difficulté des bots</Text>
        <View style={styles.groupeOptions}>
          {OPTIONS_DIFFICULTE.map((option) => (
            <Pressable
              key={option.valeur}
              style={[
                styles.optionBouton,
                preferences.difficulte === option.valeur && styles.optionBoutonActif,
              ]}
              onPress={() => setDifficulte(option.valeur)}
              testID={`difficulte-${option.valeur}`}
            >
              <Text
                style={[
                  styles.optionTexte,
                  preferences.difficulte === option.valeur && styles.optionTexteActif,
                ]}
              >
                {option.libelle}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Son */}
      <View style={styles.section}>
        <Text style={styles.titreSectionTexte}>Son</Text>
        <View style={styles.ligneOption}>
          <Text style={styles.libelleOption}>Effets sonores</Text>
          <Switch
            value={preferences.sonActive}
            onValueChange={setSonActive}
            trackColor={{
              false: COULEURS.boutonDesactive,
              true: COULEURS.accent,
            }}
            testID="switch-son"
          />
        </View>
      </View>

      {/* Score objectif */}
      <View style={styles.section}>
        <Text style={styles.titreSectionTexte}>Score objectif</Text>
        <View style={styles.groupeOptions}>
          {OPTIONS_SCORE.map((score) => (
            <Pressable
              key={score}
              style={[
                styles.optionBouton,
                preferences.scoreObjectif === score && styles.optionBoutonActif,
              ]}
              onPress={() => setScoreObjectif(score)}
              testID={`score-${score}`}
            >
              <Text
                style={[
                  styles.optionTexte,
                  preferences.scoreObjectif === score && styles.optionTexteActif,
                ]}
              >
                {score}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
export { EcranParametres };

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    backgroundColor: COULEURS.fondPrincipal,
  },
  contenu: {
    padding: ESPACEMENTS.lg,
  },
  section: {
    marginBottom: ESPACEMENTS.xl,
  },
  titreSectionTexte: {
    fontSize: TYPOGRAPHIE.sousTitreTaille,
    fontWeight: TYPOGRAPHIE.poidsMoyen,
    color: COULEURS.textePrincipal,
    marginBottom: ESPACEMENTS.md,
  },
  groupeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ESPACEMENTS.sm,
  },
  optionBouton: {
    paddingVertical: ESPACEMENTS.sm,
    paddingHorizontal: ESPACEMENTS.md,
    borderRadius: BORDURES.rayonPetit,
    borderWidth: BORDURES.largeur,
    borderColor: COULEURS.texteSecondaire,
    minWidth: 80,
    alignItems: "center",
  },
  optionBoutonActif: {
    backgroundColor: COULEURS.accent,
    borderColor: COULEURS.accent,
  },
  optionTexte: {
    fontSize: TYPOGRAPHIE.corpsTaille,
    color: COULEURS.texteSecondaire,
  },
  optionTexteActif: {
    color: COULEURS.boutonPrimaireTexte,
    fontWeight: TYPOGRAPHIE.poidsMoyen,
  },
  ligneOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: ESPACEMENTS.sm,
  },
  libelleOption: {
    fontSize: TYPOGRAPHIE.corpsTaille,
    color: COULEURS.textePrincipal,
  },
});
