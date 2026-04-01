import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

import { PlateauJeuLoader } from "../components/game/PlateauJeuLoader";
import { COULEURS } from "../constants/theme";

export default function EcranPartie() {
  return (
    <View style={styles.conteneur} testID="ecran-partie">
      <StatusBar hidden />
      <PlateauJeuLoader />
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    backgroundColor: COULEURS.fondPrincipal,
  },
});
