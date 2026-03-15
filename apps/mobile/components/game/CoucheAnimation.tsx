import type { Carte } from "@belote/shared-types";
import { View } from "react-native";

import { CarteAnimee, type PositionCarte } from "./CarteAnimee";

export interface CarteEnVol {
  id: string;
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  duree: number;
}

interface PropsCoucheAnimation {
  cartesEnVol: CarteEnVol[];
  largeurEcran: number;
  hauteurEcran: number;
  onAnimationTerminee: (id: string) => void;
}

/**
 * Couche transparente superposée au plateau pour afficher
 * les cartes en cours d'animation (distribution, jeu, ramassage).
 */
export function CoucheAnimation({
  cartesEnVol,
  largeurEcran,
  hauteurEcran,
  onAnimationTerminee,
}: PropsCoucheAnimation) {
  if (cartesEnVol.length === 0) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
      }}
      pointerEvents="none"
    >
      {cartesEnVol.map((vol) => (
        <CarteAnimee
          key={vol.id}
          carte={vol.carte}
          depart={vol.depart}
          arrivee={vol.arrivee}
          faceVisible={vol.faceVisible}
          duree={vol.duree}
          largeurEcran={largeurEcran}
          hauteurEcran={hauteurEcran}
          onTerminee={() => onAnimationTerminee(vol.id)}
        />
      ))}
    </View>
  );
}
