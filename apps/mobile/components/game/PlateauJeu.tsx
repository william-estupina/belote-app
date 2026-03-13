import type { Carte } from "@belote/shared-types";
import { Canvas, Fill, RoundedRect } from "@shopify/react-native-skia";
import { useWindowDimensions, View } from "react-native";

import { CarteSkia } from "./Carte";

// Cartes d'exemple pour le rendu initial
const CARTE_EXEMPLE: Carte = { rang: "as", couleur: "coeur" };
const CARTE_DOS_EXEMPLE: Carte = { rang: "7", couleur: "pique" };

// Proportions du plateau
const RATIO_LARGEUR_CARTE = 0.12; // largeur carte = 12% de la largeur écran
const RATIO_HAUTEUR_CARTE = 1.43; // ratio hauteur/largeur d'une carte

export default function PlateauJeu() {
  const { width: largeurEcran, height: hauteurEcran } = useWindowDimensions();

  // Dimensions proportionnelles
  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_HAUTEUR_CARTE);

  // Centrage de la carte d'exemple
  const xCentre = (largeurEcran - largeurCarte) / 2;
  const yCentre = (hauteurEcran - hauteurCarte) / 2;

  return (
    <View style={{ flex: 1 }}>
      {/* Fond vert du tapis */}
      <Canvas style={{ position: "absolute", width: largeurEcran, height: hauteurEcran }}>
        <Fill color="#1a5c2a" />
        {/* Bordure décorative du tapis */}
        <RoundedRect
          x={8}
          y={8}
          width={largeurEcran - 16}
          height={hauteurEcran - 16}
          r={16}
          color="#145222"
          style="stroke"
          strokeWidth={2}
        />
      </Canvas>

      {/* Carte face visible au centre */}
      <View
        style={{ position: "absolute", left: xCentre - largeurCarte * 0.6, top: yCentre }}
      >
        <CarteSkia
          carte={CARTE_EXEMPLE}
          largeur={largeurCarte}
          hauteur={hauteurCarte}
          faceVisible
        />
      </View>

      {/* Carte dos visible à côté */}
      <View
        style={{ position: "absolute", left: xCentre + largeurCarte * 0.6, top: yCentre }}
      >
        <CarteSkia
          carte={CARTE_DOS_EXEMPLE}
          largeur={largeurCarte}
          hauteur={hauteurCarte}
          faceVisible={false}
        />
      </View>
    </View>
  );
}
