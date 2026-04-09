// Pont entre useAnimations (cartesEnVol React state) et le buffer unifié (slots 36-43)
// Chaque CarteEnVol est synchronisée vers un slot animation du canvas Skia unifié.

import { useEffect, useRef } from "react";
import { Easing, runOnJS, withDelay, withTiming } from "react-native-reanimated";

import type { CarteEnVol } from "../components/game/CoucheAnimation";
import { ANIMATIONS } from "../constants/layout";
import {
  calculerPointArc,
  calculerRectoSource,
  calculerVersoSource,
} from "./distributionAtlas";
import type { AtlasCartes } from "./useAtlasCartes";
import type { BufferCanvasUnifie } from "./useBufferCanvasUnifie";

const EASINGS = {
  "out-cubic": Easing.out(Easing.cubic),
  "inout-cubic": Easing.inOut(Easing.cubic),
  "out-back-soft": Easing.out(Easing.back(0.85)),
} as const;

interface InfoSlot {
  slotIndex: number;
  segment: number;
  estEnPause: boolean;
}

export function useSyncCartesVersBuffer(
  cartesEnVol: ReadonlyArray<CarteEnVol>,
  bufferUnifie: BufferCanvasUnifie,
  atlas: AtlasCartes,
  surAnimationTerminee: (id: string) => void,
  surCarteJeuPreteAffichage: (id: string) => void,
): void {
  const mapIdVersSlotRef = useRef(new Map<string, InfoSlot>());
  const surTermineeRef = useRef(surAnimationTerminee);
  surTermineeRef.current = surAnimationTerminee;
  const surPretRef = useRef(surCarteJeuPreteAffichage);
  surPretRef.current = surCarteJeuPreteAffichage;

  useEffect(() => {
    const map = mapIdVersSlotRef.current;
    const { largeurCellule, hauteurCellule } = atlas;
    if (largeurCellule === 0) return;

    const idsActuels = new Set(cartesEnVol.map((c) => c.id));

    // --- Libérer les slots des cartes supprimées ---
    for (const [id, info] of map) {
      if (!idsActuels.has(id)) {
        bufferUnifie.libererSlotAnimation(info.slotIndex);
        map.delete(id);
      }
    }

    // --- Allouer / mettre à jour chaque carte ---
    for (const vol of cartesEnVol) {
      const infoExistante = map.get(vol.id);

      // Sprite : face ou dos
      const rectSrc = vol.faceVisible
        ? calculerRectoSource(
            largeurCellule,
            hauteurCellule,
            vol.carte.couleur,
            vol.carte.rang,
          )
        : calculerVersoSource(largeurCellule, hauteurCellule);

      // Trajectoire Bézier
      const controle = calculerPointArc(
        { x: vol.depart.x, y: vol.depart.y },
        { x: vol.arrivee.x, y: vol.arrivee.y },
        ANIMATIONS.distribution.arcDistribution.decalagePerpendiculaire,
      );
      const donnees = {
        departX: vol.depart.x,
        departY: vol.depart.y,
        controleX: controle.x,
        controleY: controle.y,
        arriveeX: vol.arrivee.x,
        arriveeY: vol.arrivee.y,
        rotDepart: vol.depart.rotation,
        rotArrivee: vol.arrivee.rotation,
        echDepart: vol.depart.echelle,
        echArrivee: vol.arrivee.echelle,
      };

      const enPause = vol.estEnPause ?? false;
      const easing = vol.easing ?? "out-cubic";
      const delai = vol.delai ?? 0;

      if (!infoExistante) {
        // --- Nouveau slot ---
        const slotIndex = bufferUnifie.allouerSlotAnimation();
        if (slotIndex === null) continue;

        map.set(vol.id, { slotIndex, segment: vol.segment, estEnPause: enPause });
        bufferUnifie.mettreAJourSprite(slotIndex, rectSrc);
        bufferUnifie.ecrireSlotAnime(slotIndex, donnees);

        lancerOuPauserAnimation(
          bufferUnifie,
          slotIndex,
          vol.id,
          enPause,
          vol.duree,
          easing,
          delai,
          surTermineeRef,
          surPretRef,
        );
      } else if (
        infoExistante.segment !== vol.segment ||
        infoExistante.estEnPause !== enPause
      ) {
        // --- Segment ou pause changé → mettre à jour et relancer ---
        const { slotIndex } = infoExistante;
        infoExistante.segment = vol.segment;
        infoExistante.estEnPause = enPause;

        bufferUnifie.mettreAJourSprite(slotIndex, rectSrc);
        bufferUnifie.ecrireSlotAnime(slotIndex, donnees);

        lancerOuPauserAnimation(
          bufferUnifie,
          slotIndex,
          vol.id,
          enPause,
          vol.duree,
          easing,
          delai,
          surTermineeRef,
          /* surPretRef= */ undefined,
        );
      }
    }
  }, [cartesEnVol, bufferUnifie, atlas]);
}

// --- Helpers ---

function lancerOuPauserAnimation(
  bufferUnifie: BufferCanvasUnifie,
  slotIndex: number,
  id: string,
  enPause: boolean,
  duree: number,
  easing: keyof typeof EASINGS,
  delai: number,
  surTermineeRef: React.RefObject<(id: string) => void>,
  surPretRef?: React.RefObject<(id: string) => void>,
): void {
  const prog = bufferUnifie.progressions[slotIndex];

  if (enPause) {
    prog.value = 0;
    if (surPretRef) {
      const idCapture = id;
      const refCapture = surPretRef;
      if (typeof globalThis.requestAnimationFrame === "function") {
        globalThis.requestAnimationFrame(() => {
          refCapture.current(idCapture);
        });
      } else {
        setTimeout(() => {
          refCapture.current(idCapture);
        }, 0);
      }
    }
    return;
  }

  if (duree === 0) {
    prog.value = 1;
    return;
  }

  const idCapture = id;
  const refCapture = surTermineeRef;
  prog.value = 0;
  prog.value = withDelay(
    delai,
    withTiming(1, { duration: duree, easing: EASINGS[easing] }, (termine) => {
      "worklet";
      if (termine) {
        runOnJS(notifierFinAnimation)(refCapture, idCapture);
      }
    }),
  );
}

function notifierFinAnimation(
  ref: React.RefObject<(id: string) => void>,
  id: string,
): void {
  ref.current(id);
}
