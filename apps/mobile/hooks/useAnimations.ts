import type { Carte, PositionJoueur } from "@belote/shared-types";
import { useCallback, useRef, useState } from "react";

import type { CarteEnVol } from "../components/game/CoucheAnimation";
import { calculerCibleAnimationPilePlis } from "../components/game/pile-plis-geometrie";
import {
  ANIMATIONS,
  POSITIONS_MAINS,
  POSITIONS_PILES,
  POSITIONS_PLI,
  variationCartePli,
} from "../constants/layout";
import { planifierRamassagePli } from "./planRamassagePli";
import { estMemeCarte } from "./utils-cartes";

const POSITIONS_JOUEUR: PositionJoueur[] = ["sud", "ouest", "nord", "est"];

export type CarteDuPli = { joueur: PositionJoueur; carte: Carte };
export type DepartAnimationJeuCarte = CarteEnVol["depart"];
interface OptionsAnimationJeuCarte {
  demarrageDiffere?: boolean;
  surPretAffichage?: (idAnimation: string) => void;
}
export interface CarteRetourPaquet {
  carte: Carte;
  depart: CarteEnVol["depart"];
  delai?: number;
  faceVisible?: boolean;
  flipDe?: number;
  flipVers?: number;
}

interface DimensionsAnimations {
  largeurEcran: number;
  hauteurEcran: number;
}

function arrondirPosition(valeur: number): number {
  return Number(valeur.toFixed(3));
}

function estCartePliAnimable(id: string): boolean {
  return id.startsWith("jeu-") || id.startsWith("pli-");
}

function creerIdCartePli(joueur: PositionJoueur, carte: Carte): string {
  return `pli-${joueur}-${carte.couleur}-${carte.rang}`;
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
        id: creerIdCartePli(joueur, carte),
        carte,
        depart: pos,
        arrivee: pos,
        faceVisible: true,
        duree: 0,
        segment: 0,
      };
    });
}

export function useAnimations(dimensionsEcran?: DimensionsAnimations) {
  const [cartesEnVol, setCartesEnVol] = useState<CarteEnVol[]>([]);
  const cartesEnVolRef = useRef<CarteEnVol[]>([]);
  cartesEnVolRef.current = cartesEnVol;
  const compteurId = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const callbacksFinJeuRef = useRef(new Map<string, () => void>());
  const callbacksPretAffichageRef = useRef(
    new Map<string, (idAnimation: string) => void>(),
  );

  const nettoyerTimeouts = useCallback(() => {
    for (const timeout of timeoutsRef.current) {
      clearTimeout(timeout);
    }
    timeoutsRef.current = [];
  }, []);

  const surAnimationTerminee = useCallback((id: string) => {
    callbacksPretAffichageRef.current.delete(id);
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
      departPersonnalise?: DepartAnimationJeuCarte,
      options?: OptionsAnimationJeuCarte,
    ) => {
      compteurId.current += 1;
      const id = `jeu-${compteurId.current}`;
      const posDepart: DepartAnimationJeuCarte = departPersonnalise ?? {
        x: POSITIONS_MAINS[joueur].x,
        y: POSITIONS_MAINS[joueur].y,
        rotation: 0,
        echelle: 1,
      };
      const posArrivee = POSITIONS_PLI[joueur];
      const { decalageX, decalageY, rotation } = variationCartePli(
        carte.couleur,
        carte.rang,
        joueur,
      );

      const vol: CarteEnVol = {
        id,
        carte,
        depart: posDepart,
        arrivee: {
          x: posArrivee.x + decalageX,
          y: posArrivee.y + decalageY,
          rotation,
          echelle: 0.9,
        },
        faceVisible: true,
        estEnPause: options?.demarrageDiffere ?? false,
        estVisible: true,
        duree: ANIMATIONS.jeuCarte.duree,
        easing: "out-cubic",
        segment: 0,
      };

      setCartesEnVol((prev) => [...prev, vol]);

      if (onTerminee) {
        callbacksFinJeuRef.current.set(id, onTerminee);
      }

      if (options?.surPretAffichage) {
        callbacksPretAffichageRef.current.set(id, options.surPretAffichage);
      }

      return id;
    },
    [],
  );

  const surCarteJeuPreteAffichage = useCallback((id: string) => {
    const callbackPretAffichage = callbacksPretAffichageRef.current.get(id);
    if (!callbackPretAffichage) return;

    callbacksPretAffichageRef.current.delete(id);
    callbackPretAffichage(id);
  }, []);

  const demarrerAnimationJeuCarte = useCallback((id: string) => {
    setCartesEnVol((precedent) =>
      precedent.map((carteEnVol) => {
        if (carteEnVol.id !== id) {
          return carteEnVol;
        }

        return {
          ...carteEnVol,
          estEnPause: false,
          estVisible: true,
          segment: carteEnVol.segment + 1,
        };
      }),
    );
  }, []);

  const lancerAnimationRamassagePli = useCallback(
    (
      cartesPli: { joueur: PositionJoueur; carte: Carte }[],
      gagnant: PositionJoueur,
      onTerminee?: () => void,
      onDebutRamassage?: () => void,
      nbPlisAvantRamassage = 0,
    ) => {
      const indexGagnant = POSITIONS_JOUEUR.indexOf(gagnant);
      const equipe = indexGagnant % 2 === 0 ? "equipe1" : "equipe2";
      const posPile = POSITIONS_PILES[equipe];
      const rotationArrivee = equipe === "equipe2" ? 90 : 0;
      const posGagnant = POSITIONS_PLI[gagnant];
      const ciblePile =
        dimensionsEcran &&
        dimensionsEcran.largeurEcran > 0 &&
        dimensionsEcran.hauteurEcran > 0
          ? calculerCibleAnimationPilePlis({
              equipe,
              nbPlisAvantRamassage,
              largeurEcran: dimensionsEcran.largeurEcran,
              hauteurEcran: dimensionsEcran.hauteurEcran,
            })
          : posPile;
      const { dureeConvergence, dureeGlissement, delaiPhase2 } = planifierRamassagePli();

      const timeout = setTimeout(() => {
        onDebutRamassage?.();
        const idsCartesPli = cartesPli.map(({ joueur, carte }) =>
          creerIdCartePli(joueur, carte),
        );

        // Phase 1 : convergence — mettre à jour les cartes "jeu-*" existantes
        setCartesEnVol((precedent) => {
          return precedent.map((carteEnVol) => {
            const correspondance = cartesPli.find(({ carte }) =>
              estMemeCarte(carte, carteEnVol.carte),
            );
            if (!correspondance || !estCartePliAnimable(carteEnVol.id)) {
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

        // Empêche les callbacks de fin de convergence de retirer les cartes réhydratées.
        for (const idCartePli of idsCartesPli) {
          callbacksFinJeuRef.current.set(idCartePli, () => {});
        }

        const timeoutPhase2 = setTimeout(() => {
          compteurId.current += 1;
          const idRamassage = `ramassage-${compteurId.current}`;
          const carteRepere = cartesPli[0]?.carte;

          setCartesEnVol((precedent) => {
            const cartesHorsPli = precedent.filter((carteEnVol) => {
              if (!estCartePliAnimable(carteEnVol.id)) {
                return true;
              }

              return !cartesPli.some(({ carte }) =>
                estMemeCarte(carte, carteEnVol.carte),
              );
            });

            if (!carteRepere) {
              return cartesHorsPli;
            }

            callbacksFinJeuRef.current.set(idRamassage, () => {
              setCartesEnVol((prec) => prec.filter((c) => c.id !== idRamassage));
            });

            return [
              ...cartesHorsPli,
              {
                id: idRamassage,
                carte: carteRepere,
                depart: {
                  x: posGagnant.x,
                  y: posGagnant.y,
                  rotation: 0,
                  echelle: 0.85,
                },
                arrivee: {
                  x: ciblePile.x,
                  y: ciblePile.y,
                  rotation: rotationArrivee,
                  echelle: 0.62,
                },
                faceVisible: false,
                duree: dureeGlissement,
                easing: "inout-cubic" as const,
                segment: 0,
              },
            ];
          });
        }, delaiPhase2);

        timeoutsRef.current.push(timeoutPhase2);

        // Callback onTerminee global après toutes les phases 2
        if (onTerminee) {
          const timeoutFin = setTimeout(onTerminee, delaiPhase2 + dureeGlissement);
          timeoutsRef.current.push(timeoutFin);
        }
      }, ANIMATIONS.ramassagePli.delaiAvant);

      timeoutsRef.current.push(timeout);
    },
    [dimensionsEcran],
  );

  const lancerAnimationRetourPaquet = useCallback(
    (
      cartes: ReadonlyArray<CarteRetourPaquet>,
      arrivee: { x: number; y: number },
      onTerminee?: () => void,
    ) => {
      if (cartes.length === 0) {
        onTerminee?.();
        return;
      }

      const { distribution } = ANIMATIONS;
      const nouvellesCartes: CarteEnVol[] = cartes.map(
        ({ carte, depart, delai, faceVisible = false, flipDe, flipVers }) => {
          compteurId.current += 1;
          return {
            id: `retour-${compteurId.current}`,
            carte,
            depart,
            arrivee: {
              x: arrivee.x,
              y: arrivee.y,
              rotation: 0,
              echelle: 0.85,
            },
            faceVisible,
            flipDe,
            flipVers,
            delai: delai ?? 0,
            duree: distribution.dureeRetourPaquet,
            segment: 0,
            easing: "inout-cubic",
          };
        },
      );

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
    callbacksPretAffichageRef.current.clear();
    setCartesEnVol([]);
  }, [nettoyerTimeouts]);

  return {
    cartesEnVol,
    surAnimationTerminee,
    surCarteJeuPreteAffichage,
    glisserCarteRetournee,
    lancerAnimationJeuCarte,
    demarrerAnimationJeuCarte,
    lancerAnimationRamassagePli,
    lancerAnimationRetourPaquet,
    ajouterCartesGelees,
    annulerAnimations,
  };
}
