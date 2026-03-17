// Affiche le paquet (dos) et la carte retournée au centre du plateau pendant les enchères
import type { Carte } from "@belote/shared-types";
import { StyleSheet, View } from "react-native";

import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { CarteSkia } from "./Carte";

// Carte factice pour le dos du paquet
const CARTE_DOS = { rang: "7" as const, couleur: "pique" as const };

interface PropsZoneCarteRetournee {
  carte: Carte;
  largeurEcran: number;
  hauteurEcran: number;
}

export function ZoneCarteRetournee({
  carte,
  largeurEcran,
  hauteurEcran,
}: PropsZoneCarteRetournee) {
  // Carte plus petite que l'ancienne version
  const largeurCarte = largeurEcran * RATIO_LARGEUR_CARTE * 0.85;
  const hauteurCarte = largeurCarte * RATIO_ASPECT_CARTE;
  const espacement = 6;

  // Largeur totale : paquet + espacement + carte retournée
  const largeurTotale = largeurCarte * 2 + espacement;

  return (
    <View
      style={[
        styles.conteneur,
        {
          left: largeurEcran * 0.5 - largeurTotale / 2,
          top: hauteurEcran * 0.46 - hauteurCarte / 2,
        },
      ]}
    >
      {/* Paquet (dos de carte) avec léger effet d'empilement */}
      <View style={styles.paquet}>
        {/* Cartes empilées pour donner l'illusion d'épaisseur */}
        <View style={[styles.carteEmpilee, { top: -2, left: -1 }]}>
          <CarteSkia
            carte={CARTE_DOS}
            largeur={largeurCarte}
            hauteur={hauteurCarte}
            faceVisible={false}
          />
        </View>
        <View style={[styles.carteEmpilee, { top: -1, left: 0 }]}>
          <CarteSkia
            carte={CARTE_DOS}
            largeur={largeurCarte}
            hauteur={hauteurCarte}
            faceVisible={false}
          />
        </View>
        <CarteSkia
          carte={CARTE_DOS}
          largeur={largeurCarte}
          hauteur={hauteurCarte}
          faceVisible={false}
        />
      </View>

      {/* Carte retournée (face visible) */}
      <View style={{ marginLeft: espacement }}>
        <CarteSkia
          carte={carte}
          largeur={largeurCarte}
          hauteur={hauteurCarte}
          faceVisible
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    zIndex: 15,
  },
  paquet: {
    position: "relative",
  },
  carteEmpilee: {
    position: "absolute",
  },
});
