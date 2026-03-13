import { StyleSheet, Text, View } from "react-native";

import { COULEURS, ESPACEMENTS, TYPOGRAPHIE } from "../constants/theme";

export default function EcranPartie() {
  return (
    <View style={styles.conteneur}>
      <Text style={styles.texte}>Partie en cours...</Text>
      <Text style={styles.sousTitre}>Le plateau de jeu sera implémenté à l'étape 6</Text>
    </View>
  );
}
export { EcranPartie };

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COULEURS.fondPrincipal,
  },
  texte: {
    fontSize: TYPOGRAPHIE.sousTitreTaille,
    fontWeight: TYPOGRAPHIE.poidsMoyen,
    color: COULEURS.textePrincipal,
  },
  sousTitre: {
    fontSize: TYPOGRAPHIE.corpsTaille,
    color: COULEURS.texteSecondaire,
    marginTop: ESPACEMENTS.sm,
  },
});
