import { Pressable, StyleSheet, Text } from "react-native";

import { BORDURES, COULEURS, ESPACEMENTS, TYPOGRAPHIE } from "../constants/theme";

interface BoutonMenuProps {
  titre: string;
  onPress: () => void;
  variante?: "primaire" | "secondaire";
  testID?: string;
}

export function BoutonMenu({
  titre,
  onPress,
  variante = "primaire",
  testID,
}: BoutonMenuProps) {
  const estPrimaire = variante === "primaire";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.bouton,
        estPrimaire ? styles.boutonPrimaire : styles.boutonSecondaire,
        pressed && styles.boutonPresse,
      ]}
      onPress={onPress}
      testID={testID}
    >
      <Text
        style={[
          styles.texte,
          estPrimaire ? styles.textePrimaire : styles.texteSecondaire,
        ]}
      >
        {titre}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bouton: {
    paddingVertical: ESPACEMENTS.md,
    paddingHorizontal: ESPACEMENTS.xl,
    borderRadius: BORDURES.rayon,
    minWidth: 220,
    alignItems: "center",
    marginVertical: ESPACEMENTS.sm,
  },
  boutonPrimaire: {
    backgroundColor: COULEURS.boutonPrimaire,
  },
  boutonSecondaire: {
    backgroundColor: COULEURS.boutonSecondaire,
    borderWidth: BORDURES.largeur,
    borderColor: COULEURS.textePrincipal,
  },
  boutonPresse: {
    opacity: 0.8,
  },
  texte: {
    fontSize: TYPOGRAPHIE.boutonTaille,
    fontWeight: TYPOGRAPHIE.poidsMoyen,
  },
  textePrimaire: {
    color: COULEURS.boutonPrimaireTexte,
  },
  texteSecondaire: {
    color: COULEURS.boutonSecondaireTexte,
  },
});
