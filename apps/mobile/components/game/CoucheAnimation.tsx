import type { Carte } from "@belote/shared-types";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CanvasAdversaires } from "./CanvasAdversaires";
import { CarteAnimee, type PositionCarte } from "./CarteAnimee";
import { DistributionCanvasSud } from "./DistributionCanvasSud";

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
  nbCartesAdversaires: { nord: number; est: number; ouest: number };
  // Pool adversaires (CanvasAdversaires — permanent)
  cartesAtlasAdversaires: CarteAtlas[];
  progressionsAdv: SharedValue<number>[];
  donneesWorkletAdv: SharedValue<number[]>;
  nbCartesActivesAdv: SharedValue<number>;
  // Pool sud (DistributionCanvasSud — éphémère)
  cartesAtlasSud?: CarteAtlas[];
  progressionsSud?: SharedValue<number>[];
  donneesWorkletSud?: SharedValue<number[]>;
  nbCartesActivesSud?: SharedValue<number>;
  distributionEnCours?: boolean;
}

export function CoucheAnimation({
  cartesEnVol,
  largeurEcran,
  hauteurEcran,
  onAnimationTerminee,
  atlas,
  nbCartesAdversaires,
  cartesAtlasAdversaires,
  progressionsAdv,
  donneesWorkletAdv,
  nbCartesActivesAdv,
  cartesAtlasSud,
  progressionsSud,
  donneesWorkletSud,
  nbCartesActivesSud,
  distributionEnCours,
}: PropsCoucheAnimation) {
  const aDistributionSud =
    distributionEnCours &&
    cartesAtlasSud &&
    progressionsSud &&
    donneesWorkletSud &&
    nbCartesActivesSud;
  const afficherCanvasAdversaires =
    (distributionEnCours ?? false) ||
    nbCartesAdversaires.nord > 0 ||
    nbCartesAdversaires.est > 0 ||
    nbCartesAdversaires.ouest > 0;

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
      {/* Canvas adversaires permanent (zIndex bas) */}
      {afficherCanvasAdversaires && (
        <CanvasAdversaires
          atlas={atlas}
          largeurEcran={largeurEcran}
          hauteurEcran={hauteurEcran}
          nbCartesAdversaires={nbCartesAdversaires}
          cartesAtlasAdversaires={cartesAtlasAdversaires}
          progressions={progressionsAdv}
          donneesWorklet={donneesWorkletAdv}
          nbCartesActives={nbCartesActivesAdv}
          distributionEnCours={distributionEnCours ?? false}
        />
      )}

      {/* Canvas sud éphémère — uniquement pendant la distribution (zIndex haut) */}
      {aDistributionSud && (
        <DistributionCanvasSud
          atlas={atlas}
          cartesAtlas={cartesAtlasSud}
          progressions={progressionsSud}
          donneesWorklet={donneesWorkletSud}
          nbCartesActives={nbCartesActivesSud}
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
