// Pile visuelle des plis remportés par une équipe
import type { IdEquipe } from "@belote/shared-types";
import { Platform, View } from "react-native";

import {
  POSITIONS_PILES,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";
import { CarteSkia } from "./Carte";

interface PropsPilePlis {
  equipe: IdEquipe;
  nbPlis: number;
  largeurEcran: number;
  hauteurEcran: number;
}

const estWeb = Platform.OS === "web";

// Décalage par carte empilée (en pixels)
const DECALAGE_PAR_PLI = estWeb ? 3 : 2;
// Nombre max de cartes visibles dans la pile
const MAX_CARTES_VISIBLES = 8;
// Carte fictive pour le rendu dos
const CARTE_FICTIVE = { couleur: "pique" as const, rang: "7" as const };

export function PilePlis({ equipe, nbPlis, largeurEcran, hauteurEcran }: PropsPilePlis) {
  const pos = POSITIONS_PILES[equipe];
  const largeurCarte = largeurEcran * RATIO_LARGEUR_CARTE * 0.65;
  const hauteurCarte = largeurCarte * RATIO_ASPECT_CARTE;
  const nbVisibles = Math.min(nbPlis, MAX_CARTES_VISIBLES);

  // Equipe2 (ouest) : cartes tournées à 90° comme la main du joueur ouest
  const estTourne = equipe === "equipe2";

  // Dimensions visuelles après rotation éventuelle
  const largeurVisuelle = estTourne ? hauteurCarte : largeurCarte;
  const hauteurVisuelle = estTourne ? largeurCarte : hauteurCarte;

  // La pile grandit vers le haut
  const hauteurPile = hauteurVisuelle + nbVisibles * DECALAGE_PAR_PLI;

  if (nbPlis === 0) {
    // Emplacement vide
    return (
      <View
        style={{
          position: "absolute",
          left: pos.x * largeurEcran - largeurVisuelle / 2,
          top: pos.y * hauteurEcran - hauteurVisuelle / 2,
          width: largeurVisuelle,
          height: hauteurVisuelle,
          borderWidth: 1.5,
          borderColor: "rgba(255, 255, 255, 0.12)",
          borderStyle: "dashed",
          backgroundColor: "rgba(0, 0, 0, 0.08)",
          borderRadius: 4,
          zIndex: 5,
        }}
        pointerEvents="none"
      />
    );
  }

  return (
    <View
      style={{
        position: "absolute",
        left: pos.x * largeurEcran - largeurVisuelle / 2,
        top: pos.y * hauteurEcran - hauteurPile + hauteurVisuelle / 2,
        width: largeurVisuelle,
        height: hauteurPile,
        zIndex: 5,
      }}
      pointerEvents="none"
    >
      {Array.from({ length: nbVisibles }).map((_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            bottom: i * DECALAGE_PAR_PLI,
            left: (largeurVisuelle - largeurCarte) / 2,
            width: largeurCarte,
            height: hauteurCarte,
            transform: estTourne ? [{ rotate: "90deg" }] : [],
          }}
        >
          <CarteSkia
            carte={CARTE_FICTIVE}
            largeur={largeurCarte}
            hauteur={hauteurCarte}
            faceVisible={false}
          />
        </View>
      ))}
    </View>
  );
}
