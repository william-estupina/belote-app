import { Asset } from "expo-asset";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { COULEURS } from "../constants/theme";
import { SPRITE_SHEET_SOURCE } from "../hooks/spriteSheetSource";

if (Platform.OS !== "web") {
  void SplashScreen.preventAutoHideAsync();
}

export default function Layout() {
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let actif = true;

    const preparer = async () => {
      if (Platform.OS === "web") {
        if (actif) {
          setPret(true);
        }
        return;
      }

      try {
        await Asset.fromModule(SPRITE_SHEET_SOURCE).downloadAsync();
      } finally {
        if (!actif) return;
        setPret(true);
        await SplashScreen.hideAsync();
      }
    };

    void preparer();

    return () => {
      actif = false;
    };
  }, []);

  if (!pret) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COULEURS.fondFonce },
        headerTintColor: COULEURS.textePrincipal,
        contentStyle: { backgroundColor: COULEURS.fondPrincipal },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Belote", headerShown: false }} />
      <Stack.Screen name="debug-cartes" options={{ title: "Debug cartes" }} />
      <Stack.Screen name="partie" options={{ title: "Partie", headerShown: false }} />
      <Stack.Screen name="parametres" options={{ title: "Paramètres" }} />
      <Stack.Screen name="regles" options={{ title: "Règles du jeu" }} />
    </Stack>
  );
}
