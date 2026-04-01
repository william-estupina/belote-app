import { Stack } from "expo-router";

import { COULEURS } from "../constants/theme";

export default function Layout() {
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
