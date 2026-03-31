import type { Couleur } from "@belote/shared-types";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  POSITIONS_PLI,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";

interface PropsZonePli {
  largeurEcran: number;
  hauteurEcran: number;
  couleurAtout: Couleur | null;
  afficherCadre?: boolean;
}

const SYMBOLES_COULEUR: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

const COULEUR_SYMBOLE: Record<Couleur, string> = {
  coeur: "#8b1a1a",
  carreau: "#8b1a1a",
  pique: "#0a0a0a",
  trefle: "#0a0a0a",
};

// Marge entre le cadre et les emplacements extrêmes du pli
const MARGE_CADRE = 0.04;

export const ZonePli = memo(function ZonePli(props: PropsZonePli) {
  const { largeurEcran, hauteurEcran, couleurAtout, afficherCadre = false } = props;
  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE * 0.9);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  const cadreTop =
    POSITIONS_PLI.nord.y * hauteurEcran - hauteurCarte / 2 - MARGE_CADRE * hauteurEcran;
  const cadreBottom =
    POSITIONS_PLI.sud.y * hauteurEcran + hauteurCarte / 2 + MARGE_CADRE * hauteurEcran;
  const cadreLeft =
    POSITIONS_PLI.ouest.x * largeurEcran - largeurCarte / 2 - MARGE_CADRE * largeurEcran;
  const cadreRight =
    POSITIONS_PLI.est.x * largeurEcran + largeurCarte / 2 + MARGE_CADRE * largeurEcran;

  const cadreLargeur = cadreRight - cadreLeft;
  const cadreHauteur = cadreBottom - cadreTop;

  const symbole = couleurAtout ? SYMBOLES_COULEUR[couleurAtout] : null;
  const couleurSymbole = couleurAtout ? COULEUR_SYMBOLE[couleurAtout] : "#ffffff44";

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      pointerEvents="none"
    >
      {/* Cadre décoratif du tapis central */}
      {afficherCadre && (
        <View
          style={[
            styles.cadre,
            {
              top: cadreTop,
              left: cadreLeft,
              width: cadreLargeur,
              height: cadreHauteur,
            },
          ]}
        >
          {couleurAtout && (
            <>
              <View style={[styles.coinAtout, styles.coinHautGauche]}>
                <Text style={[styles.texteAtout, { color: couleurSymbole }]}>
                  {symbole}
                </Text>
              </View>
              <View style={[styles.coinAtout, styles.coinHautDroit]}>
                <Text style={[styles.texteAtout, { color: couleurSymbole }]}>
                  {symbole}
                </Text>
              </View>
              <View style={[styles.coinAtout, styles.coinBasGauche]}>
                <Text style={[styles.texteAtout, { color: couleurSymbole }]}>
                  {symbole}
                </Text>
              </View>
              <View style={[styles.coinAtout, styles.coinBasDroit]}>
                <Text style={[styles.texteAtout, { color: couleurSymbole }]}>
                  {symbole}
                </Text>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  cadre: {
    position: "absolute",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
  coinAtout: {
    position: "absolute",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 6,
  },
  texteAtout: {
    fontSize: 18,
    opacity: 0.85,
  },
  coinHautGauche: {
    top: 6,
    left: 6,
    borderTopLeftRadius: 8,
  },
  coinHautDroit: {
    top: 6,
    right: 6,
    borderTopRightRadius: 8,
  },
  coinBasGauche: {
    bottom: 6,
    left: 6,
    borderBottomLeftRadius: 8,
  },
  coinBasDroit: {
    bottom: 6,
    right: 6,
    borderBottomRightRadius: 8,
  },
});
