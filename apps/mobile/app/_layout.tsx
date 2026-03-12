import { Stack } from "expo-router";

export function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Belote" }} />
    </Stack>
  );
}
