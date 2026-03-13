import type { Carte, PositionJoueur } from "@belote/shared-types";
import { View } from "react-native";

import {
  POSITIONS_PLI,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
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
}

// Légère rotation pour donner un aspect naturel
const ROTATIONS: Record<PositionJoueur, number> = {
  sud: 0,
  nord: 0,
  ouest: -8,
  est: 8,
};

export function ZonePli({ cartes, largeurEcran, hauteurEcran }: PropsZonePli) {
  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE * 0.9);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

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
      {cartes.map(({ joueur, carte }) => {
        const pos = POSITIONS_PLI[joueur];
        const rotation = ROTATIONS[joueur];

        return (
          <View
            key={`pli-${joueur}`}
            style={{
              position: "absolute",
              left: pos.x * largeurEcran - largeurCarte / 2,
              top: pos.y * hauteurEcran - hauteurCarte / 2,
              transform: [{ rotate: `${rotation}deg` }],
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
