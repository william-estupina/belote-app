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

interface CartePoseeAuPli {
  id: string;
  joueur: PositionJoueur;
  carte: Carte;
  x: number;
  y: number;
  rotation: number;
  echelle: number;
  faceVisible: boolean;
}

interface CarteEnVolAvecMeta extends CarteEnVol {
  joueur?: PositionJoueur;
}

function arrondirPosition(valeur: number): number {
  return Number(valeur.toFixed(3));
}

export function useAnimations() {
  const [cartesEnVol, setCartesEnVol] = useState<CarteEnVolAvecMeta[]>([]);
  const [cartesPoseesAuPli, setCartesPoseesAuPli] = useState<CartePoseeAuPli[]>([]);
  const compteurId = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const callbacksFinJeuRef = useRef(new Map<string, () => void>());
  const cartesEnVolRef = useRef<CarteEnVolAvecMeta[]>([]);
  const cartesPoseesAuPliRef = useRef<CartePoseeAuPli[]>([]);

  const remplacerCartesEnVol = useCallback(
    (miseAJour: (precedent: CarteEnVolAvecMeta[]) => CarteEnVolAvecMeta[]) => {
      setCartesEnVol((precedent) => {
        const suivant = miseAJour(precedent);
        cartesEnVolRef.current = suivant;
        return suivant;
      });
    },
    [],
  );

  const remplacerCartesPoseesAuPli = useCallback(
    (miseAJour: (precedent: CartePoseeAuPli[]) => CartePoseeAuPli[]) => {
      setCartesPoseesAuPli((precedent) => {
        const suivant = miseAJour(precedent);
        cartesPoseesAuPliRef.current = suivant;
        return suivant;
      });
    },
    [],
  );

  const creerCartePoseeAuPli = useCallback(
    (id: string, joueur: PositionJoueur, carte: Carte): CartePoseeAuPli => {
      const posArrivee = POSITIONS_PLI[joueur];
      const { decalageX, decalageY, rotation } = variationCartePli(
        carte.couleur,
        carte.rang,
        joueur,
      );

      return {
        id,
        joueur,
        carte,
        x: arrondirPosition(posArrivee.x + decalageX),
        y: arrondirPosition(posArrivee.y + decalageY),
        rotation,
        echelle: 0.9,
        faceVisible: true,
      };
    },
    [],
  );

  const creerCartePoseeAuPliDepuisVol = useCallback(
    (carteEnVol: CarteEnVolAvecMeta): CartePoseeAuPli | null => {
      if (!carteEnVol.joueur) {
        return null;
      }

      return {
        id: carteEnVol.id,
        joueur: carteEnVol.joueur,
        carte: carteEnVol.carte,
        x: arrondirPosition(carteEnVol.arrivee.x),
        y: arrondirPosition(carteEnVol.arrivee.y),
        rotation: carteEnVol.arrivee.rotation,
        echelle: carteEnVol.arrivee.echelle,
        faceVisible: carteEnVol.faceVisible,
      };
    },
    [],
  );

  const nettoyerTimeouts = useCallback(() => {
    for (const timeout of timeoutsRef.current) {
      clearTimeout(timeout);
    }
    timeoutsRef.current = [];
  }, []);

  const surAnimationTerminee = useCallback(
    (id: string) => {
      const carteTerminee = cartesEnVolRef.current.find((carte) => carte.id === id);

      remplacerCartesEnVol((precedent) => precedent.filter((carte) => carte.id !== id));

      if (carteTerminee && id.startsWith("jeu-") && carteTerminee.joueur) {
        const cartePosee =
          creerCartePoseeAuPliDepuisVol(carteTerminee) ??
          creerCartePoseeAuPli(id, carteTerminee.joueur, carteTerminee.carte);

        remplacerCartesPoseesAuPli((precedent) => [...precedent, cartePosee]);
      }

      const callbackFin = callbacksFinJeuRef.current.get(id);
      if (callbackFin) {
        callbacksFinJeuRef.current.delete(id);
        callbackFin();
      }
    },
    [
      creerCartePoseeAuPli,
      creerCartePoseeAuPliDepuisVol,
      remplacerCartesEnVol,
      remplacerCartesPoseesAuPli,
    ],
  );

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

      const vol: CarteEnVolAvecMeta = {
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

      remplacerCartesEnVol((precedent) => [...precedent, vol]);

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

      const vol: CarteEnVolAvecMeta = {
        id,
        carte,
        joueur,
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

      remplacerCartesEnVol((precedent) => [...precedent, vol]);

      if (onTerminee) {
        callbacksFinJeuRef.current.set(id, onTerminee);
      }
    },
    [remplacerCartesEnVol],
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
      const cartesPoseesPourRamassage = cartesPoseesAuPliRef.current;

      remplacerCartesPoseesAuPli(() => []);

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
          const cartePosee = cartesPoseesPourRamassage.find(
            (carteCourante) =>
              carteCourante.joueur === joueur &&
              carteCourante.carte.couleur === carte.couleur &&
              carteCourante.carte.rang === carte.rang,
          );

          const vol: CarteEnVolAvecMeta = {
            id,
            carte,
            depart: {
              x: cartePosee?.x ?? posDepart.x + decalageX,
              y: cartePosee?.y ?? posDepart.y + decalageY,
              rotation: cartePosee?.rotation ?? rotation,
              echelle: cartePosee?.echelle ?? 0.9,
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

          remplacerCartesEnVol((precedent) => [...precedent, vol]);
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

            const vol: CarteEnVolAvecMeta = {
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

            remplacerCartesEnVol((precedent) => [...precedent, vol]);
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
    [remplacerCartesEnVol, remplacerCartesPoseesAuPli],
  );

  const annulerAnimations = useCallback(() => {
    nettoyerTimeouts();
    callbacksFinJeuRef.current.clear();
    remplacerCartesEnVol(() => []);
    remplacerCartesPoseesAuPli(() => []);
  }, [nettoyerTimeouts, remplacerCartesEnVol, remplacerCartesPoseesAuPli]);

  return {
    cartesEnVol,
    cartesPoseesAuPli,
    surAnimationTerminee,
    glisserCarteRetournee,
    lancerAnimationJeuCarte,
    lancerAnimationRamassagePli,
    annulerAnimations,
  };
}
