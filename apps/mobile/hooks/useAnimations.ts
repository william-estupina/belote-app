import type { Carte, PositionJoueur } from "@belote/shared-types";
import { useCallback, useRef, useState } from "react";

import type { CarteEnVol } from "../components/game/CoucheAnimation";
import {
  ANIMATIONS,
  POSITIONS_MAINS,
  POSITIONS_PILES,
  POSITIONS_PLI,
  variationCartePli,
} from "../constants/layout";
import { planifierRamassagePli } from "./planRamassagePli";

const POSITIONS_JOUEUR: PositionJoueur[] = ["sud", "ouest", "nord", "est"];

export function useAnimations() {
  const [cartesEnVol, setCartesEnVol] = useState<CarteEnVol[]>([]);
  const compteurId = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const callbacksFinJeuRef = useRef(new Map<string, () => void>());

  const nettoyerTimeouts = useCallback(() => {
    for (const timeout of timeoutsRef.current) {
      clearTimeout(timeout);
    }
    timeoutsRef.current = [];
  }, []);

  const surAnimationTerminee = useCallback((id: string) => {
    setCartesEnVol((prev) => prev.filter((carte) => carte.id !== id));

    const callbackFin = callbacksFinJeuRef.current.get(id);
    if (callbackFin) {
      callbacksFinJeuRef.current.delete(id);
      callbackFin();
    }
  }, []);

  const glisserCarteRetournee = useCallback(
    (
      carte: Carte,
      xDepart: number,
      yDepart: number,
      preneur: PositionJoueur,
      onTerminee?: () => void,
    ) => {
      const { distribution } = ANIMATIONS;
      const posMain = POSITIONS_MAINS[preneur];

      compteurId.current += 1;
      const id = `slide-retournee-${compteurId.current}`;

      const vol: CarteEnVol = {
        id,
        carte,
        depart: {
          x: xDepart,
          y: yDepart,
          rotation: 0,
          echelle: 1,
        },
        arrivee: {
          x: posMain.x,
          y: posMain.y,
          rotation: 0,
          echelle: 1,
        },
        faceVisible: true,
        duree: distribution.dureeSlideRetournee,
        easing: "inout-cubic",
      };

      setCartesEnVol((prev) => [...prev, vol]);

      if (onTerminee) {
        const timeout = setTimeout(onTerminee, distribution.dureeSlideRetournee);
        timeoutsRef.current.push(timeout);
      }
    },
    [],
  );

  const lancerAnimationJeuCarte = useCallback(
    (
      carte: Carte,
      joueur: PositionJoueur,
      onTerminee?: () => void,
      positionDepartCustom?: { x: number; y: number },
    ) => {
      compteurId.current += 1;
      const id = `jeu-${compteurId.current}`;
      const posDepart = positionDepartCustom ?? POSITIONS_MAINS[joueur];
      const posArrivee = POSITIONS_PLI[joueur];
      const { decalageX, decalageY, rotation } = variationCartePli(
        carte.couleur,
        carte.rang,
        joueur,
      );

      const vol: CarteEnVol = {
        id,
        carte,
        depart: {
          x: posDepart.x,
          y: posDepart.y,
          rotation: 0,
          echelle: 1,
        },
        arrivee: {
          x: posArrivee.x + decalageX,
          y: posArrivee.y + decalageY,
          rotation,
          echelle: 0.9,
        },
        faceVisible: true,
        duree: ANIMATIONS.jeuCarte.duree,
      };

      setCartesEnVol((prev) => [...prev, vol]);

      if (onTerminee) {
        callbacksFinJeuRef.current.set(id, onTerminee);
      }
    },
    [],
  );

  const lancerAnimationRamassagePli = useCallback(
    (
      cartesPli: { joueur: PositionJoueur; carte: Carte }[],
      gagnant: PositionJoueur,
      onTerminee?: () => void,
      onDebutRamassage?: () => void,
    ) => {
      const indexGagnant = POSITIONS_JOUEUR.indexOf(gagnant);
      const equipe = indexGagnant % 2 === 0 ? "equipe1" : "equipe2";
      const posPile = POSITIONS_PILES[equipe];
      const rotationArrivee = equipe === "equipe2" ? 90 : 0;
      const posGagnant = POSITIONS_PLI[gagnant];
      const { dureeConvergence, dureeGlissement, delaiPhase2 } = planifierRamassagePli();

      const timeout = setTimeout(() => {
        onDebutRamassage?.();

        for (let i = 0; i < cartesPli.length; i += 1) {
          const { joueur, carte } = cartesPli[i];
          compteurId.current += 1;
          const id = `ramassage-p1-${compteurId.current}`;
          const posDepart = POSITIONS_PLI[joueur];
          const { decalageX, decalageY, rotation } = variationCartePli(
            carte.couleur,
            carte.rang,
            joueur,
          );

          const vol: CarteEnVol = {
            id,
            carte,
            depart: {
              x: posDepart.x + decalageX,
              y: posDepart.y + decalageY,
              rotation,
              echelle: 0.9,
            },
            arrivee: {
              x: posGagnant.x,
              y: posGagnant.y,
              rotation: 0,
              echelle: 0.85,
            },
            faceVisible: true,
            duree: dureeConvergence,
            easing: "inout-cubic",
          };

          setCartesEnVol((prev) => [...prev, vol]);
        }

        const timeoutPhase2 = setTimeout(() => {
          for (let i = 0; i < cartesPli.length; i += 1) {
            const { carte } = cartesPli[i];
            compteurId.current += 1;
            const id = `ramassage-p2-${compteurId.current}`;

            const centre = (cartesPli.length - 1) / 2;
            const offsetIdx = i - centre;
            const microDecalageX = offsetIdx * 0.004;
            const microDecalageY = offsetIdx * 0.002;

            const vol: CarteEnVol = {
              id,
              carte,
              depart: {
                x: posGagnant.x + microDecalageX,
                y: posGagnant.y + microDecalageY,
                rotation: 0,
                echelle: 0.85,
              },
              arrivee: {
                x: posPile.x,
                y: posPile.y,
                rotation: rotationArrivee,
                echelle: 0.6,
              },
              faceVisible: false,
              duree: dureeGlissement,
              easing: "inout-cubic",
            };

            setCartesEnVol((prev) => [...prev, vol]);
          }

          if (onTerminee) {
            const timeoutFin = setTimeout(onTerminee, dureeGlissement);
            timeoutsRef.current.push(timeoutFin);
          }
        }, delaiPhase2);

        timeoutsRef.current.push(timeoutPhase2);
      }, ANIMATIONS.ramassagePli.delaiAvant);

      timeoutsRef.current.push(timeout);
    },
    [],
  );

  const annulerAnimations = useCallback(() => {
    nettoyerTimeouts();
    callbacksFinJeuRef.current.clear();
    setCartesEnVol([]);
  }, [nettoyerTimeouts]);

  return {
    cartesEnVol,
    surAnimationTerminee,
    glisserCarteRetournee,
    lancerAnimationJeuCarte,
    lancerAnimationRamassagePli,
    annulerAnimations,
  };
}
