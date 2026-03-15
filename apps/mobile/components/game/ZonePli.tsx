import type { Carte, Couleur, PositionJoueur } from "@belote/shared-types";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  POSITIONS_PLI,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
  variationCartePli,
} from "../../constants/layout";
import { CarteSkia } from "./Carte";

interface CartePli {
  joueur: PositionJoueur;
  carte: Carte;
}

interface PropsZonePli {
  cartes: CartePli[];
  largeurEcran: number;
  hauteurEcran: number;
  couleurAtout: Couleur | null;
}

const SYMBOLES_COULEUR: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

const COULEUR_SYMBOLE: Record<Couleur, string> = {
  coeur: "#e03030",
  carreau: "#e03030",
  pique: "#1a1a1a",
  trefle: "#1a1a1a",
};

// Marge entre le cadre et les cartes les plus extérieures
const MARGE_CADRE = 0.04;

export function ZonePli({
  cartes,
  largeurEcran,
  hauteurEcran,
  couleurAtout,
}: PropsZonePli) {
  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE * 0.9);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  const variations = useMemo(
    () =>
      cartes.map(({ joueur, carte }) =>
        variationCartePli(carte.couleur, carte.rang, joueur),
      ),
    [cartes],
  );

  // Dimensions du cadre central basées sur les positions extrêmes du pli
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
      {/* Cadre décoratif */}
      {couleurAtout && (
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
          {/* Coins atout */}
          <Text
            style={[styles.coinAtout, styles.coinHautGauche, { color: couleurSymbole }]}
          >
            {symbole}
          </Text>
          <Text
            style={[styles.coinAtout, styles.coinHautDroit, { color: couleurSymbole }]}
          >
            {symbole}
          </Text>
          <Text
            style={[styles.coinAtout, styles.coinBasGauche, { color: couleurSymbole }]}
          >
            {symbole}
          </Text>
          <Text
            style={[styles.coinAtout, styles.coinBasDroit, { color: couleurSymbole }]}
          >
            {symbole}
          </Text>
        </View>
      )}

      {/* Cartes du pli */}
      {cartes.map(({ joueur, carte }, index) => {
        const pos = POSITIONS_PLI[joueur];
        const { rotation, decalageX, decalageY } = variations[index];

        return (
          <View
            key={`pli-${joueur}`}
            style={{
              position: "absolute",
              left: (pos.x + decalageX) * largeurEcran - largeurCarte / 2,
              top: (pos.y + decalageY) * hauteurEcran - hauteurCarte / 2,
              transform: [{ rotate: `${rotation}deg` }],
              shadowColor: "#000",
              shadowOffset: { width: 1, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 3,
              elevation: 4,
            }}
          >
            <CarteSkia
              carte={carte}
              largeur={largeurCarte}
              hauteur={hauteurCarte}
              faceVisible
            />
          </View>
        );
      })}
    </View>
  );
}

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
    fontSize: 20,
    opacity: 0.55,
  },
  coinHautGauche: {
    top: 4,
    left: 6,
  },
  coinHautDroit: {
    top: 4,
    right: 6,
  },
  coinBasGauche: {
    bottom: 4,
    left: 6,
  },
  coinBasDroit: {
    bottom: 4,
    right: 6,
  },
});
