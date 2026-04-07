import type { Carte } from "@belote/shared-types";
import { StyleSheet, View } from "react-native";

import { ANIMATIONS } from "../../constants/layout";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteDosAtlas, CarteFaceAtlas } from "./Carte";
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

const NB_CARTES_PAQUET_COMPLET = 32;
const NB_COUCHES_MAX = 8;

interface ParametresEmpilementPaquet {
  nbCouches: number;
  decalageHorizontal: number;
  decalageVertical: number;
}

function calculerEmpilementPaquet(
  cartesPaquetVisibles: number,
): ParametresEmpilementPaquet {
  const cartesVisibles = Math.max(cartesPaquetVisibles, 1);
  const ratioRemplissage = Math.min(cartesVisibles / NB_CARTES_PAQUET_COMPLET, 1);

  return {
    nbCouches: Math.min(NB_COUCHES_MAX, Math.max(1, Math.ceil(cartesVisibles / 4))),
    decalageHorizontal: 0.65 + ratioRemplissage * 0.55,
    decalageVertical: 1.2 + ratioRemplissage * 0.9,
  };
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
  const afficherPaquetVisible = afficherPaquet && cartesPaquetVisibles > 0;

  if (!afficherPaquetVisible && !afficherCarteRetournee) {
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
  const { nbCouches, decalageHorizontal, decalageVertical } =
    calculerEmpilementPaquet(cartesPaquetVisibles);

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
      {afficherPaquetVisible && (
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
              testID={`reserve-paquet-couche-${index}`}
              style={[
                styles.carteEmpilee,
                {
                  left: index * decalageHorizontal,
                  top: -(index * decalageVertical),
                },
              ]}
            >
              <CarteDosAtlas
                atlas={atlas}
                largeur={largeurCarte}
                hauteur={hauteurCarte}
              />
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
