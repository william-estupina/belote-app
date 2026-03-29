import type { Carte } from "@belote/shared-types";
import { StyleSheet, View } from "react-native";

import { ANIMATIONS } from "../../constants/layout";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteDos, CarteFaceAtlas } from "./Carte";
import { calculerDispositionReserveCentrale } from "./reserve-centrale-disposition";

interface PropsReserveCentrale {
  afficherPaquet: boolean;
  cartesPaquetVisibles: number;
  carteRetournee: Carte | null;
  opaciteCarteRetournee?: number;
  largeurEcran: number;
  hauteurEcran: number;
  atlas: AtlasCartes;
}

export function ReserveCentrale({
  afficherPaquet,
  cartesPaquetVisibles,
  carteRetournee,
  opaciteCarteRetournee = 1,
  largeurEcran,
  hauteurEcran,
  atlas,
}: PropsReserveCentrale) {
  const afficherCarteRetournee = carteRetournee !== null;

  if (!afficherPaquet && !afficherCarteRetournee) {
    return null;
  }

  const {
    largeurCarte,
    hauteurCarte,
    espacement,
    largeurTotaleAvecCarte,
    ancragePaquetX,
  } = calculerDispositionReserveCentrale({
    largeurEcran,
    hauteurEcran,
  });
  const largeurTotale = afficherCarteRetournee ? largeurTotaleAvecCarte : largeurCarte;
  const nbCouches = Math.min(5, Math.ceil(Math.max(cartesPaquetVisibles, 1) / 6));

  return (
    <View
      testID="reserve-centrale"
      style={[
        styles.conteneur,
        {
          left: ancragePaquetX,
          top: hauteurEcran * ANIMATIONS.distribution.originY - hauteurCarte / 2,
          width: largeurTotale,
          height: hauteurCarte,
        },
      ]}
      pointerEvents="none"
    >
      {afficherPaquet && (
        <View
          testID="reserve-paquet"
          style={[
            styles.paquet,
            {
              left: 0,
              top: 0,
              width: largeurCarte,
              height: hauteurCarte,
            },
          ]}
        >
          {Array.from({ length: nbCouches }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.carteEmpilee,
                {
                  left: index * 0.5,
                  top: -index,
                },
              ]}
            >
              <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
            </View>
          ))}
        </View>
      )}

      {afficherCarteRetournee && carteRetournee && (
        <View
          testID="reserve-carte-retournee"
          style={[
            styles.carteRetournee,
            {
              left: largeurCarte + espacement,
              top: 0,
              width: largeurCarte,
              height: hauteurCarte,
              opacity: opaciteCarteRetournee,
            },
          ]}
        >
          <View style={styles.faceCarteRetournee}>
            <CarteFaceAtlas
              atlas={atlas}
              carte={carteRetournee}
              largeur={largeurCarte}
              hauteur={hauteurCarte}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    zIndex: 30,
  },
  paquet: {
    position: "absolute",
  },
  carteEmpilee: {
    position: "absolute",
  },
  carteRetournee: {
    position: "absolute",
  },
  faceCarteRetournee: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
