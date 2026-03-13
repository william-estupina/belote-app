import { StyleSheet, View } from "react-native";

import { PlateauJeuLoader } from "../components/game/PlateauJeuLoader";
import { COULEURS } from "../constants/theme";

export default function EcranPartie() {
  return (
    <View style={styles.conteneur}>
      <PlateauJeuLoader />
    </View>
  );
}
export { EcranPartie };

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    backgroundColor: COULEURS.fondPrincipal,
  },
});
