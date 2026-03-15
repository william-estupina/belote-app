import type { Carte, PositionJoueur } from "@belote/shared-types";
import { useCallback, useRef, useState } from "react";

import type { CarteEnVol } from "../components/game/CoucheAnimation";
import { ANIMATIONS, POSITIONS_MAINS, POSITIONS_PLI } from "../constants/layout";

const POSITIONS_JOUEUR: PositionJoueur[] = ["sud", "ouest", "nord", "est"];

/**
 * Hook central de gestion des animations de cartes.
 * Gère les cartes en vol (distribution, jeu, ramassage)
 * et expose des fonctions pour déclencher chaque type d'animation.
 */
export function useAnimations() {
  const [cartesEnVol, setCartesEnVol] = useState<CarteEnVol[]>([]);
  const compteurId = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Nettoyage des timeouts
  const nettoyerTimeouts = useCallback(() => {
    for (const t of timeoutsRef.current) {
      clearTimeout(t);
    }
    timeoutsRef.current = [];
  }, []);

  // Retirer une carte en vol terminée
  const surAnimationTerminee = useCallback((id: string) => {
    setCartesEnVol((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // --- Distribution ---
  const lancerDistribution = useCallback(
    (
      mains: Record<PositionJoueur, Carte[]>,
      options?: {
        onCarteArrivee?: (joueur: PositionJoueur, carte: Carte) => void;
        onTerminee?: () => void;
      },
    ) => {
      nettoyerTimeouts();
      const { distribution } = ANIMATIONS;

      // Construire la séquence de cartes à distribuer
      const sequence: { carte: Carte; position: PositionJoueur }[] = [];
      const maxCartes = Math.max(...POSITIONS_JOUEUR.map((pos) => mains[pos].length));

      for (let i = 0; i < maxCartes; i++) {
        for (const position of POSITIONS_JOUEUR) {
          if (i < mains[position].length) {
            sequence.push({ carte: mains[position][i], position });
          }
        }
      }

      // Lancer chaque carte avec un délai échelonné
      for (let i = 0; i < sequence.length; i++) {
        const { carte, position } = sequence[i];
        const delai = i * distribution.delaiEntre;

        const timeout = setTimeout(() => {
          compteurId.current += 1;
          const id = `distrib-${compteurId.current}`;
          const posArrivee = POSITIONS_MAINS[position];

          const vol: CarteEnVol = {
            id,
            carte,
            depart: {
              x: distribution.originX,
              y: distribution.originY,
              rotation: 0,
              echelle: 0.5,
            },
            arrivee: {
              x: posArrivee.x,
              y: posArrivee.y,
              rotation: 0,
              echelle: 1,
            },
            faceVisible: position === "sud",
            duree: distribution.dureeCarte,
          };

          setCartesEnVol((prev) => [...prev, vol]);

          // Quand la carte arrive, notifier pour empiler dans la main
          const timeoutArrivee = setTimeout(() => {
            options?.onCarteArrivee?.(position, carte);
          }, distribution.dureeCarte);
          timeoutsRef.current.push(timeoutArrivee);
        }, delai);

        timeoutsRef.current.push(timeout);
      }

      // Callback de fin après toutes les animations
      if (options?.onTerminee) {
        const dureeTotale =
          sequence.length * distribution.delaiEntre + distribution.dureeCarte;
        const timeout = setTimeout(options.onTerminee, dureeTotale);
        timeoutsRef.current.push(timeout);
      }
    },
    [nettoyerTimeouts],
  );

  // --- Jeu de carte (main → centre) ---
  const lancerAnimationJeuCarte = useCallback(
    (carte: Carte, joueur: PositionJoueur, onTerminee?: () => void) => {
      compteurId.current += 1;
      const id = `jeu-${compteurId.current}`;
      const posDepart = POSITIONS_MAINS[joueur];
      const posArrivee = POSITIONS_PLI[joueur];

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
          x: posArrivee.x,
          y: posArrivee.y,
          rotation: 0,
          echelle: 0.9,
        },
        faceVisible: true,
        duree: ANIMATIONS.jeuCarte.duree,
      };

      setCartesEnVol((prev) => [...prev, vol]);

      if (onTerminee) {
        const timeout = setTimeout(onTerminee, ANIMATIONS.jeuCarte.duree);
        timeoutsRef.current.push(timeout);
      }
    },
    [],
  );

  // --- Ramassage du pli (centre → gagnant) ---
  const lancerAnimationRamassagePli = useCallback(
    (
      cartesPli: { joueur: PositionJoueur; carte: Carte }[],
      gagnant: PositionJoueur,
      onTerminee?: () => void,
    ) => {
      const posGagnant = POSITIONS_MAINS[gagnant];

      // Délai avant ramassage pour laisser voir le pli
      const timeout = setTimeout(() => {
        for (const { joueur, carte } of cartesPli) {
          compteurId.current += 1;
          const id = `ramassage-${compteurId.current}`;
          const posDepart = POSITIONS_PLI[joueur];

          const vol: CarteEnVol = {
            id,
            carte,
            depart: {
              x: posDepart.x,
              y: posDepart.y,
              rotation: 0,
              echelle: 0.9,
            },
            arrivee: {
              x: posGagnant.x,
              y: posGagnant.y,
              rotation: 0,
              echelle: 0.3,
            },
            faceVisible: true,
            duree: ANIMATIONS.ramassagePli.duree,
          };

          setCartesEnVol((prev) => [...prev, vol]);
        }

        if (onTerminee) {
          const timeoutFin = setTimeout(onTerminee, ANIMATIONS.ramassagePli.duree);
          timeoutsRef.current.push(timeoutFin);
        }
      }, ANIMATIONS.ramassagePli.delaiAvant);

      timeoutsRef.current.push(timeout);
    },
    [],
  );

  // Tout annuler (ex: quitter la partie)
  const annulerAnimations = useCallback(() => {
    nettoyerTimeouts();
    setCartesEnVol([]);
  }, [nettoyerTimeouts]);

  return {
    cartesEnVol,
    surAnimationTerminee,
    lancerDistribution,
    lancerAnimationJeuCarte,
    lancerAnimationRamassagePli,
    annulerAnimations,
  };
}
