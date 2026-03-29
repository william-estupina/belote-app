import type { Carte } from "@belote/shared-types";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { COULEURS, ESPACEMENTS, TYPOGRAPHIE } from "../../constants/theme";
import {
  construireCleCarteDebug,
  formaterCarteDebug,
  OPTIONS_CARTES_DEBUG,
} from "./cartes-debug";

interface PropsSelecteurCarteDebug {
  carte: Carte;
  identifiant: "gauche" | "droite";
  label: string;
  onSelection: (carte: Carte) => void;
}

export function SelecteurCarteDebug({
  carte,
  identifiant,
  label,
  onSelection,
}: PropsSelecteurCarteDebug) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <View style={styles.conteneur}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOuvert((valeur) => !valeur)}
        style={({ pressed }) => [
          styles.bouton,
          pressed ? styles.boutonPresse : null,
          ouvert ? styles.boutonOuvert : null,
        ]}
        testID={`selecteur-carte-${identifiant}-bouton`}
      >
        <Text style={styles.texteBouton}>
          {`Carte ${identifiant} : ${formaterCarteDebug(carte)}`}
        </Text>
      </Pressable>

      {ouvert && (
        <View style={styles.menu} testID={`selecteur-carte-${identifiant}-menu`}>
          <ScrollView nestedScrollEnabled style={styles.scroll}>
            {OPTIONS_CARTES_DEBUG.map((option) => {
              const cle = construireCleCarteDebug(option);
              const estActive = cle === construireCleCarteDebug(carte);

              return (
                <Pressable
                  key={cle}
                  onPress={() => {
                    onSelection(option);
                    setOuvert(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    estActive ? styles.optionActive : null,
                    pressed ? styles.optionPresse : null,
                  ]}
                >
                  <Text style={styles.texteOption}>{formaterCarteDebug(option)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    minWidth: 250,
    position: "relative",
    zIndex: 20,
    gap: ESPACEMENTS.sm,
  },
  label: {
    color: COULEURS.texteSecondaire,
    fontSize: TYPOGRAPHIE.petitTaille,
    textAlign: "center",
  },
  bouton: {
    paddingHorizontal: ESPACEMENTS.md,
    paddingVertical: ESPACEMENTS.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  boutonOuvert: {
    borderColor: COULEURS.accent,
  },
  boutonPresse: {
    opacity: 0.85,
  },
  texteBouton: {
    color: COULEURS.textePrincipal,
    fontSize: TYPOGRAPHIE.corpsTaille,
    fontWeight: TYPOGRAPHIE.poidsMoyen,
    textAlign: "center",
  },
  menu: {
    position: "absolute",
    top: 78,
    left: 0,
    right: 0,
    maxHeight: 260,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "#13361c",
    overflow: "hidden",
    zIndex: 30,
  },
  scroll: {
    maxHeight: 260,
  },
  option: {
    paddingHorizontal: ESPACEMENTS.md,
    paddingVertical: ESPACEMENTS.md,
  },
  optionActive: {
    backgroundColor: "rgba(232, 183, 48, 0.14)",
  },
  optionPresse: {
    opacity: 0.85,
  },
  texteOption: {
    color: COULEURS.textePrincipal,
    fontSize: TYPOGRAPHIE.corpsTaille,
  },
});
