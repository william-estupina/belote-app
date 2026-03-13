import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { BoutonMenu } from "../components/BoutonMenu";
import { COULEURS, ESPACEMENTS, TYPOGRAPHIE } from "../constants/theme";

export { EcranAccueil as HomeScreen };

export default function EcranAccueil() {
  const router = useRouter();

  return (
    <View style={styles.conteneur}>
      <View style={styles.enTete}>
        <Text style={styles.titre}>Belote</Text>
        <Text style={styles.sousTitre}>Jeu de cartes</Text>
      </View>

      <View style={styles.menu}>
        <BoutonMenu
          titre="Jouer"
          onPress={() => router.push("/partie")}
          testID="bouton-jouer"
        />
        <BoutonMenu
          titre="Paramètres"
          onPress={() => router.push("/parametres")}
          variante="secondaire"
          testID="bouton-parametres"
        />
        <BoutonMenu
          titre="Règles"
          onPress={() => router.push("/regles")}
          variante="secondaire"
          testID="bouton-regles"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COULEURS.fondPrincipal,
    padding: ESPACEMENTS.lg,
  },
  enTete: {
    alignItems: "center",
    marginBottom: ESPACEMENTS.xxl,
  },
  titre: {
    fontSize: TYPOGRAPHIE.titreTaille,
    fontWeight: TYPOGRAPHIE.poidsGras,
    color: COULEURS.textePrincipal,
  },
  sousTitre: {
    fontSize: TYPOGRAPHIE.sousTitreTaille,
    color: COULEURS.texteSecondaire,
    marginTop: ESPACEMENTS.sm,
  },
  menu: {
    alignItems: "center",
    gap: ESPACEMENTS.sm,
  },
});
