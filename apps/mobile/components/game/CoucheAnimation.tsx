import type { Carte } from "@belote/shared-types";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteAnimee, type PositionCarte } from "./CarteAnimee";
import { DistributionCanvas } from "./DistributionCanvas";

export interface CarteEnVol {
  id: string;
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  duree: number;
  flipDe?: number;
  flipVers?: number;
  easing?: "out-cubic" | "inout-cubic";
}

interface PropsCoucheAnimation {
  cartesEnVol: CarteEnVol[];
  largeurEcran: number;
  hauteurEcran: number;
  onAnimationTerminee: (id: string) => void;
  atlas?: AtlasCartes;
  cartesAtlasDistribution?: CarteAtlas[];
  progressionsDistribution?: SharedValue<number>[];
  donneesWorkletDistribution?: SharedValue<number[]>;
  nbCartesActivesDistribution?: SharedValue<number>;
  distributionEnCours?: boolean;
}

export function CoucheAnimation({
  cartesEnVol,
  largeurEcran,
  hauteurEcran,
  onAnimationTerminee,
  atlas,
  cartesAtlasDistribution,
  progressionsDistribution,
  donneesWorkletDistribution,
  nbCartesActivesDistribution,
  distributionEnCours,
}: PropsCoucheAnimation) {
  const aDistributionAtlas =
    atlas &&
    cartesAtlasDistribution &&
    progressionsDistribution &&
    donneesWorkletDistribution &&
    nbCartesActivesDistribution &&
    distributionEnCours;

  if (cartesEnVol.length === 0 && !aDistributionAtlas) {
    return null;
  }

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
      {aDistributionAtlas && (
        <DistributionCanvas
          atlas={atlas}
          cartesAtlas={cartesAtlasDistribution}
          progressions={progressionsDistribution}
          donneesWorklet={donneesWorkletDistribution}
          nbCartesActives={nbCartesActivesDistribution}
          largeurEcran={largeurEcran}
          hauteurEcran={hauteurEcran}
        />
      )}

      {cartesEnVol.map((vol) => (
        <CarteAnimee
          key={vol.id}
          carte={vol.carte}
          depart={vol.depart}
          arrivee={vol.arrivee}
          faceVisible={vol.faceVisible}
          duree={vol.duree}
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
