import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import type { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";

import { COULEURS, TYPOGRAPHIE } from "../../constants/theme";

async function chargerEcranDebugCartes(): Promise<{
  default: ComponentType<object>;
}> {
  const module = await import("./DebugCartesContenu");

  return {
    default: module.EcranDebugCartes as ComponentType<object>,
  };
}

export function DebugCartesLoader() {
  return (
    <WithSkiaWeb
      getComponent={chargerEcranDebugCartes}
      fallback={
        <View style={styles.chargement}>
          <Text style={styles.texteChargement}>Chargement du debug cartes...</Text>
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
