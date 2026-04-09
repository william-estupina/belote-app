import type { Carte } from "@belote/shared-types";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import type { ModeRenduCartes } from "../../hooks/useControleurJeu";
import { CarteAnimee, type PositionCarte } from "./CarteAnimee";
import { DistributionCanvasSud } from "./DistributionCanvasSud";

export interface CarteEnVol {
  id: string;
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  estEnPause?: boolean;
  estVisible?: boolean;
  delai?: number;
  duree: number;
  segment: number;
  flipDe?: number;
  flipVers?: number;
  easing?: "out-cubic" | "inout-cubic" | "out-back-soft";
}

interface PropsCoucheAnimation {
  cartesEnVol: CarteEnVol[];
  largeurEcran: number;
  hauteurEcran: number;
  onAnimationTerminee: (id: string) => void;
  onCarteJeuPreteAffichage: (id: string) => void;
  atlas: AtlasCartes;
  // Pool sud (DistributionCanvasSud — éphémère)
  cartesAtlasSud?: CarteAtlas[];
  progressionsSud?: SharedValue<number>[];
  donneesWorkletSud?: SharedValue<number[]>;
  nbCartesActivesSud?: SharedValue<number>;
  zIndexesSud?: SharedValue<number>[];
  distributionEnCours?: boolean;
  modeRenduCartes?: ModeRenduCartes;
}

export function CoucheAnimation({
  cartesEnVol,
  largeurEcran,
  hauteurEcran,
  onAnimationTerminee,
  onCarteJeuPreteAffichage,
  atlas,
  cartesAtlasSud,
  progressionsSud,
  donneesWorkletSud,
  nbCartesActivesSud,
  zIndexesSud,
  distributionEnCours,
  modeRenduCartes,
}: PropsCoucheAnimation) {
  const afficherSceneAtlas = modeRenduCartes === "cinematique-distribution";
  const aDistributionSud =
    (distributionEnCours || afficherSceneAtlas) &&
    cartesAtlasSud &&
    progressionsSud &&
    donneesWorkletSud &&
    nbCartesActivesSud &&
    zIndexesSud;

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
      testID={afficherSceneAtlas ? "couche-animation-scene-atlas" : undefined}
    >
      {/* Canvas sud éphémère — uniquement pendant la distribution (zIndex haut) */}
      {aDistributionSud && (
        <DistributionCanvasSud
          atlas={atlas}
          cartesAtlas={cartesAtlasSud}
          progressions={progressionsSud}
          donneesWorklet={donneesWorkletSud}
          nbCartesActives={nbCartesActivesSud}
          zIndexes={zIndexesSud}
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
          estEnPause={vol.estEnPause}
          estVisible={vol.estVisible}
          delai={vol.delai}
          duree={vol.duree}
          segment={vol.segment}
          atlas={atlas}
          flipDe={vol.flipDe}
          flipVers={vol.flipVers}
          easing={vol.easing}
          largeurEcran={largeurEcran}
          hauteurEcran={hauteurEcran}
          onPretAffichage={() => onCarteJeuPreteAffichage(vol.id)}
          onTerminee={() => onAnimationTerminee(vol.id)}
        />
      ))}
    </View>
  );
}
