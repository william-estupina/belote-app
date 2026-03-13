import type { PositionJoueur } from "@belote/shared-types";
import { View } from "react-native";

import { ADVERSAIRE, RATIO_ASPECT_CARTE } from "../../constants/layout";
import { CarteSkia } from "./Carte";

// Carte factice pour le dos (le contenu n'est pas affiché)
const CARTE_DOS = { rang: "7" as const, couleur: "pique" as const };

interface PropsMainAdversaire {
  nbCartes: number;
  position: PositionJoueur;
  largeurEcran: number;
  hauteurEcran: number;
}

export function MainAdversaire({
  nbCartes,
  position,
  largeurEcran,
  hauteurEcran,
}: PropsMainAdversaire) {
  if (nbCartes === 0) return null;

  const largeurCarte = Math.round(largeurEcran * ADVERSAIRE.ratioLargeurCarte);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
  const estVertical = position === "est" || position === "ouest";

  // Espacement entre les cartes (avec chevauchement)
  const espacement = estVertical
    ? hauteurCarte * (1 - ADVERSAIRE.chevauchement)
    : largeurCarte * (1 - ADVERSAIRE.chevauchement);

  // Taille totale de la main
  const tailleMain =
    espacement * (nbCartes - 1) + (estVertical ? hauteurCarte : largeurCarte);

  // Positionnement du conteneur
  const styleConteneur = calculerPosition(
    position,
    largeurCarte,
    hauteurCarte,
    tailleMain,
    largeurEcran,
    hauteurEcran,
    estVertical,
  );

  return (
    <View style={styleConteneur}>
      {Array.from({ length: nbCartes }, (_, index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            ...(estVertical
              ? { top: espacement * index, left: 0 }
              : { left: espacement * index, top: 0 }),
            zIndex: index,
          }}
        >
          <CarteSkia
            carte={CARTE_DOS}
            largeur={largeurCarte}
            hauteur={hauteurCarte}
            faceVisible={false}
          />
        </View>
      ))}
    </View>
  );
}

function calculerPosition(
  position: PositionJoueur,
  largeurCarte: number,
  hauteurCarte: number,
  tailleMain: number,
  largeurEcran: number,
  hauteurEcran: number,
  estVertical: boolean,
) {
  if (estVertical) {
    // Empilées verticalement, centrées dans la zone de jeu
    const topCentre = (hauteurEcran - tailleMain) / 2;
    return {
      position: "absolute" as const,
      top: topCentre,
      ...(position === "ouest"
        ? { left: largeurEcran * ADVERSAIRE.margeCoteX }
        : { right: largeurEcran * ADVERSAIRE.margeCoteX }),
      width: largeurCarte,
      height: tailleMain,
      overflow: "visible" as const,
    };
  }

  // Nord : ligne horizontale en haut de la zone de jeu
  const leftCentre = (largeurEcran - tailleMain) / 2;
  return {
    position: "absolute" as const,
    top: hauteurEcran * ADVERSAIRE.margeNordY,
    left: leftCentre,
    width: tailleMain,
    height: hauteurCarte,
    overflow: "visible" as const,
  };
}
