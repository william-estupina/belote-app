import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { StyleSheet, Text, View } from "react-native";

import { COULEURS, TYPOGRAPHIE } from "../../constants/theme";

export function PlateauJeuLoader() {
  return (
    <WithSkiaWeb
      getComponent={() => import("./PlateauJeu")}
      fallback={
        <View style={styles.chargement}>
          <Text style={styles.texteChargement}>Chargement du plateau...</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  chargement: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COULEURS.fondPrincipal,
  },
  texteChargement: {
    fontSize: TYPOGRAPHIE.corpsTaille,
    color: COULEURS.texteSecondaire,
  },
});
