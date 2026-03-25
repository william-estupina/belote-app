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

export type CarteDuPli = { joueur: PositionJoueur; carte: Carte };
export interface CarteRetourPaquet {
  carte: Carte;
  depart: CarteEnVol["depart"];
}

function arrondirPosition(valeur: number): number {
  return Number(valeur.toFixed(3));
}

function estMemeCarte(a: Carte, b: Carte): boolean {
  return a.couleur === b.couleur && a.rang === b.rang;
}

export function construireCartesGeleesDepuisPli(
  pli: CarteDuPli[],
  cartesEnVol: ReadonlyArray<{ carte: Carte }>,
): CarteEnVol[] {
  return pli
    .filter(
      ({ carte }) =>
        !cartesEnVol.some((carteEnVol) => estMemeCarte(carteEnVol.carte, carte)),
    )
    .map(({ joueur, carte }) => {
      const posArrivee = POSITIONS_PLI[joueur];
      const { decalageX, decalageY, rotation } = variationCartePli(
        carte.couleur,
        carte.rang,
        joueur,
      );
      const pos = {
        x: arrondirPosition(posArrivee.x + decalageX),
        y: arrondirPosition(posArrivee.y + decalageY),
        rotation,
        echelle: 0.9,
      };

      return {
        id: `pli-${joueur}-${carte.couleur}-${carte.rang}`,
        carte,
        depart: pos,
        arrivee: pos,
        faceVisible: true,
        duree: 0,
        segment: 0,
      };
    });
}

export function useAnimations() {
  const [cartesEnVol, setCartesEnVol] = useState<CarteEnVol[]>([]);
  const cartesEnVolRef = useRef<CarteEnVol[]>([]);
  cartesEnVolRef.current = cartesEnVol;
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
    const callbackFin = callbacksFinJeuRef.current.get(id);

    if (callbackFin) {
      callbacksFinJeuRef.current.delete(id);
      callbackFin();
      return;
    }

    if (id.startsWith("jeu-")) {
      // Carte jeu sans callback : reste gelée
      return;
    }

    // Autres cartes : retirer
    setCartesEnVol((precedent) => precedent.filter((carte) => carte.id !== id));
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
        segment: 0,
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
        segment: 0,
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

        // Phase 1 : convergence — mettre à jour les cartes "jeu-*" existantes
        setCartesEnVol((precedent) => {
          return precedent.map((carteEnVol) => {
            const correspondance = cartesPli.find(({ carte }) =>
              estMemeCarte(carte, carteEnVol.carte),
            );
            if (!correspondance || !carteEnVol.id.startsWith("jeu-")) {
              return carteEnVol;
            }

            return {
              ...carteEnVol,
              depart: { ...carteEnVol.arrivee },
              arrivee: {
                x: posGagnant.x,
                y: posGagnant.y,
                rotation: 0,
                echelle: 0.85,
              },
              duree: dureeConvergence,
              easing: "inout-cubic" as const,
              segment: carteEnVol.segment + 1,
            };
          });
        });

        // Enregistrer les callbacks de convergence -> glissement
        for (const { carte } of cartesPli) {
          const carteEnVol = cartesEnVolRef.current.find(
            (c) => c.id.startsWith("jeu-") && estMemeCarte(c.carte, carte),
          );
          if (carteEnVol) {
            callbacksFinJeuRef.current.set(carteEnVol.id, () => {
              // Phase 2 : glissement vers la pile
              const centre = (cartesPli.length - 1) / 2;
              const idx = cartesPli.findIndex((cp) => estMemeCarte(cp.carte, carte));
              const offsetIdx = idx - centre;
              const microDecalageX = offsetIdx * 0.004;
              const microDecalageY = offsetIdx * 0.002;

              setCartesEnVol((prec) =>
                prec.map((c) => {
                  if (c.id !== carteEnVol.id) return c;
                  return {
                    ...c,
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
                    easing: "inout-cubic" as const,
                    segment: c.segment + 1,
                  };
                }),
              );

              // Callback fin de glissement : retirer la carte
              callbacksFinJeuRef.current.set(carteEnVol.id, () => {
                setCartesEnVol((prec) => prec.filter((c) => c.id !== carteEnVol.id));
              });
            });
          }
        }

        // Callback onTerminee global après toutes les phases 2
        if (onTerminee) {
          const timeoutFin = setTimeout(onTerminee, delaiPhase2 + dureeGlissement);
          timeoutsRef.current.push(timeoutFin);
        }
      }, ANIMATIONS.ramassagePli.delaiAvant);

      timeoutsRef.current.push(timeout);
    },
    [],
  );

  const lancerAnimationRetourPaquet = useCallback(
    (cartes: ReadonlyArray<CarteRetourPaquet>, onTerminee?: () => void) => {
      if (cartes.length === 0) {
        onTerminee?.();
        return;
      }

      const { distribution } = ANIMATIONS;
      const nouvellesCartes: CarteEnVol[] = cartes.map(({ carte, depart }, index) => {
        compteurId.current += 1;
        return {
          id: `retour-${compteurId.current}`,
          carte,
          depart,
          arrivee: {
            x: ANIMATIONS.distribution.originX,
            y: ANIMATIONS.distribution.originY,
            rotation: 0,
            echelle: 0.5,
          },
          faceVisible: false,
          delai: index * distribution.delaiEntreCartesRetourPaquet,
          duree: distribution.dureeRetourPaquet,
          segment: 0,
          easing: "inout-cubic",
        };
      });

      setCartesEnVol((precedent) => [...precedent, ...nouvellesCartes]);

      if (onTerminee) {
        const delaiTotal =
          (nouvellesCartes[nouvellesCartes.length - 1]?.delai ?? 0) +
          distribution.dureeRetourPaquet +
          distribution.pauseApresRetourPaquet;
        const timeout = setTimeout(onTerminee, delaiTotal);
        timeoutsRef.current.push(timeout);
      }
    },
    [],
  );

  const ajouterCartesGelees = useCallback((cartesGelees: CarteEnVol[]) => {
    setCartesEnVol((precedent) => {
      const idsExistants = new Set(precedent.map((c) => c.id));
      const nouvelles = cartesGelees.filter((c) => !idsExistants.has(c.id));
      return nouvelles.length > 0 ? [...precedent, ...nouvelles] : precedent;
    });
  }, []);

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
    lancerAnimationRetourPaquet,
    ajouterCartesGelees,
    annulerAnimations,
  };
}
