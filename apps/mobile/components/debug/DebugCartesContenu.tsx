import { ScrollView, StyleSheet, Text, View } from "react-native";

import { RATIO_ASPECT_CARTE } from "../../constants/layout";
import { COULEURS, ESPACEMENTS, TYPOGRAPHIE } from "../../constants/theme";
import { useAtlasCartes } from "../../hooks/useAtlasCartes";
import { ComparaisonRenduCarte } from "./ComparaisonRenduCarte";

export function EcranDebugCartes() {
  const atlas = useAtlasCartes();
  const largeurCarte = 180;
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  return (
    <ScrollView contentContainerStyle={styles.conteneur}>
      <View style={styles.hero}>
        <Text style={styles.titre}>Debug rendu cartes</Text>
        <Text style={styles.description}>Carte de reference: 7 de coeur.</Text>
        <Text style={styles.description}>
          Ouvre cette page en web pour comparer visuellement le rendu de la main et le
          rendu atlas.
        </Text>
      </View>

      <ComparaisonRenduCarte
        atlas={atlas}
        carte={{ couleur: "coeur", rang: "7" }}
        largeurCarte={largeurCarte}
        hauteurCarte={hauteurCarte}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: ESPACEMENTS.xl,
    paddingHorizontal: ESPACEMENTS.lg,
    paddingVertical: ESPACEMENTS.xxl,
    backgroundColor: COULEURS.fondPrincipal,
  },
  hero: {
    maxWidth: 760,
    gap: ESPACEMENTS.sm,
  },
  titre: {
    textAlign: "center",
    fontSize: TYPOGRAPHIE.titreTaille,
    fontWeight: TYPOGRAPHIE.poidsGras,
    color: COULEURS.textePrincipal,
  },
  description: {
    textAlign: "center",
    fontSize: TYPOGRAPHIE.corpsTaille,
    color: COULEURS.texteSecondaire,
  },
});
