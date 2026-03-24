import type { Carte } from "@belote/shared-types";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import type { CarteAtlas } from "../../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteFaceAtlas } from "./Carte";
import { CarteAnimee, type PositionCarte } from "./CarteAnimee";
import { DistributionCanvas } from "./DistributionCanvas";

export interface CarteEnVol {
  id: string;
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  duree: number;
  segment: number;
  flipDe?: number;
  flipVers?: number;
  easing?: "out-cubic" | "inout-cubic";
}

interface PropsCoucheAnimation {
  cartesEnVol: CarteEnVol[];
  cartesPoseesAuPli?: CartePoseeAuPli[];
  largeurEcran: number;
  hauteurEcran: number;
  onAnimationTerminee: (id: string) => void;
  atlas: AtlasCartes;
  cartesAtlasDistribution?: CarteAtlas[];
  progressionsDistribution?: SharedValue<number>[];
  donneesWorkletDistribution?: SharedValue<number[]>;
  nbCartesActivesDistribution?: SharedValue<number>;
  distributionEnCours?: boolean;
}

interface CartePoseeAuPli {
  id: string;
  carte: Carte;
  x: number;
  y: number;
  rotation: number;
  echelle: number;
  faceVisible: boolean;
}

export function CoucheAnimation({
  cartesEnVol,
  cartesPoseesAuPli = [],
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

  if (cartesEnVol.length === 0 && cartesPoseesAuPli.length === 0 && !aDistributionAtlas) {
    return null;
  }

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

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

      {cartesPoseesAuPli.map((cartePosee) => (
        <View
          key={cartePosee.id}
          style={{
            position: "absolute",
            left: cartePosee.x * largeurEcran - largeurCarte / 2,
            top: cartePosee.y * hauteurEcran - hauteurCarte / 2,
            transform: [
              { rotate: `${cartePosee.rotation}deg` },
              { scale: cartePosee.echelle },
            ],
            shadowColor: "#000",
            shadowOffset: { width: 1, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 3,
            elevation: 4,
          }}
        >
          <CarteFaceAtlas
            atlas={atlas}
            carte={cartePosee.carte}
            largeur={largeurCarte}
            hauteur={hauteurCarte}
          />
        </View>
      ))}

      {cartesEnVol.map((vol) => (
        <CarteAnimee
          key={vol.id}
          carte={vol.carte}
          depart={vol.depart}
          arrivee={vol.arrivee}
          faceVisible={vol.faceVisible}
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
