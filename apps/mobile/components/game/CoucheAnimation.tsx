import type { Carte } from "@belote/shared-types";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CanvasCartesUnifie } from "./CanvasCartesUnifie";
import { CarteAnimee, type PositionCarte } from "./CarteAnimee";

export interface CarteEnVol {
  id: string;
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  delai?: number;
  duree: number;
  segment: number;
  flipDe?: number;
  flipVers?: number;
  easing?: "out-cubic" | "inout-cubic";
}

interface PropsCoucheAnimation {
  cartesEnVol: CarteEnVol[];
  largeurEcran: number;
  hauteurEcran: number;
  onAnimationTerminee: (id: string) => void;
  atlas: AtlasCartes;
  cartesAtlas: CarteAtlas[];
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  nbCartesActives: SharedValue<number>;
  nbCartesAdversaires?: { nord: number; est: number; ouest: number };
  distributionEnCours?: boolean;
}

export function CoucheAnimation({
  cartesEnVol,
  largeurEcran,
  hauteurEcran,
  onAnimationTerminee,
  atlas,
  cartesAtlas,
  progressions,
  donneesWorklet,
  nbCartesActives,
  nbCartesAdversaires,
  distributionEnCours,
}: PropsCoucheAnimation) {
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
      <CanvasCartesUnifie
        atlas={atlas}
        cartesAtlas={cartesAtlas}
        progressions={progressions}
        donneesWorklet={donneesWorklet}
        nbCartesActives={nbCartesActives}
        largeurEcran={largeurEcran}
        hauteurEcran={hauteurEcran}
        nbCartesAdversaires={nbCartesAdversaires}
        distributionEnCours={distributionEnCours}
      />

      {cartesEnVol.map((vol) => (
        <CarteAnimee
          key={vol.id}
          carte={vol.carte}
          depart={vol.depart}
          arrivee={vol.arrivee}
          faceVisible={vol.faceVisible}
          delai={vol.delai}
          duree={vol.duree}
          segment={vol.segment}
          atlas={atlas}
          flipDe={vol.flipDe}
          flipVers={vol.flipVers}
          easing={vol.easing}
          largeurEcran={largeurEcran}
          hauteurEcran={hauteurEcran}
          onTerminee={() => onAnimationTerminee(vol.id)}
        />
      ))}
    </View>
  );
}
