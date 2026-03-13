import type { Carte } from "@belote/shared-types";
import { View } from "react-native";

import {
  EVENTAIL,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";
import { CarteSkia } from "./Carte";

interface PropsMainJoueur {
  cartes: Carte[];
  largeurEcran: number;
  hauteurEcran: number;
}

export function MainJoueur({ cartes, largeurEcran, hauteurEcran }: PropsMainJoueur) {
  const nbCartes = cartes.length;
  if (nbCartes === 0) return null;

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  // Éventail : chaque carte tourne autour de sa base (bas-centre)
  const angleTotal = EVENTAIL.angleTotal;
  const arcMax = hauteurEcran * EVENTAIL.decalageArc;

  // Espacement horizontal
  const espacement = largeurCarte * (1 - EVENTAIL.chevauchement);
  const largeurMain = espacement * (nbCartes - 1) + largeurCarte;
  const xDepart = (largeurEcran - largeurMain) / 2;

  // Hauteur du conteneur : carte + arc + marge pour rotation
  const hauteurConteneur = hauteurCarte + arcMax + largeurCarte * 0.3;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: hauteurConteneur,
        overflow: "visible",
      }}
    >
      {cartes.map((carte, index) => {
        // Progression normalisée de -1 (gauche) à +1 (droite)
        const t = nbCartes > 1 ? (index / (nbCartes - 1)) * 2 - 1 : 0;

        // Angle de rotation : linéaire de -angleTotal/2 à +angleTotal/2
        const angle = (t * angleTotal) / 2;

        // Arc parabolique : les cartes du centre montent, celles des bords descendent
        const decalageY = arcMax * (1 - t * t);

        const x = xDepart + espacement * index;

        return (
          <View
            key={`${carte.couleur}-${carte.rang}`}
            style={{
              position: "absolute",
              left: x,
              bottom: decalageY,
              // Rotation autour du bas-centre de la carte (effet éventail naturel)
              transformOrigin: `${largeurCarte / 2}px ${hauteurCarte}px`,
              transform: [{ rotate: `${angle}deg` }],
              zIndex: index,
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
