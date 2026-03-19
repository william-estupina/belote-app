import type { Carte, PositionJoueur } from "@belote/shared-types";
import { useCallback, useRef, useState } from "react";

import type { CarteEnVol, CarteSurTapis } from "../components/game/CoucheAnimation";
import {
  ANIMATIONS,
  POSITIONS_MAINS,
  POSITIONS_PILES,
  POSITIONS_PLI,
  variationCartePli,
} from "../constants/layout";

const POSITIONS_JOUEUR: PositionJoueur[] = ["sud", "ouest", "nord", "est"];

/**
 * Hook central de gestion des animations de cartes.
 * Gère les cartes en vol et expose des fonctions pour déclencher chaque type d'animation.
 */
export function useAnimations() {
  const [cartesEnVol, setCartesEnVol] = useState<CarteEnVol[]>([]);
  const [cartesSurTapis, setCartesSurTapis] = useState<CarteSurTapis[]>([]);
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

  // --- Distribution directe vers la main (par paquets simultanés) ---
  const lancerDistribution = useCallback(
    (
      mains: Record<PositionJoueur, Carte[]>,
      options?: {
        /** Appelé quand un paquet de cartes arrive dans la main d'un joueur */
        onPaquetArrive?: (position: PositionJoueur, cartes: Carte[]) => void;
        onTerminee?: () => void;
        /** Cartes qui doivent être envoyées face visible */
        cartesVisibles?: Carte[];
      },
    ) => {
      nettoyerTimeouts();
      const { distribution } = ANIMATIONS;

      // Construire les paquets comme en vraie Belote (3 puis 2)
      const nbCartesParJoueur = Math.max(
        ...POSITIONS_JOUEUR.map((pos) => mains[pos].length),
      );
      const taillesPaquets: number[] = [];
      let cartesRestantes = nbCartesParJoueur;
      if (cartesRestantes >= 3) {
        taillesPaquets.push(3);
        cartesRestantes -= 3;
      }
      while (cartesRestantes > 0) {
        const taille = Math.min(cartesRestantes, 3);
        taillesPaquets.push(taille);
        cartesRestantes -= taille;
      }

      let temps = 0;
      let indexCarte = 0;

      const { ecartX, ecartRotation } = distribution.eventailVol;

      for (let p = 0; p < taillesPaquets.length; p++) {
        const taillePaquet = taillesPaquets[p];

        // Pause entre les rounds (ex: entre le paquet de 3 et le paquet de 2)
        if (p > 0) {
          temps += distribution.pauseEntreRounds;
        }

        for (const position of POSITIONS_JOUEUR) {
          const cartesJoueur = mains[position];
          const posMain = POSITIONS_MAINS[position];

          const cartesDuPaquet: Carte[] = [];
          for (let c = 0; c < taillePaquet && indexCarte + c < cartesJoueur.length; c++) {
            cartesDuPaquet.push(cartesJoueur[indexCarte + c]);
          }

          if (cartesDuPaquet.length === 0) continue;

          const delaiPaquet = temps;
          const nbCartesPaquet = cartesDuPaquet.length;

          // Direction de vol pour orienter l'éventail perpendiculairement
          const dx = posMain.x - distribution.originX;
          const dy = posMain.y - distribution.originY;
          const angle = Math.atan2(dy, dx);
          const perpX = -Math.sin(angle);
          const perpY = Math.cos(angle);

          for (let idx = 0; idx < cartesDuPaquet.length; idx++) {
            const carte = cartesDuPaquet[idx];
            // Toutes les cartes du paquet partent en même temps (pas de stagger)
            const delaiCarte = delaiPaquet;

            // Offset en éventail centré autour de 0
            const centre = (nbCartesPaquet - 1) / 2;
            const offsetIdx = idx - centre;

            const timeout = setTimeout(() => {
              compteurId.current += 1;
              const id = `distrib-${compteurId.current}`;

              const estVisible =
                options?.cartesVisibles?.some(
                  (cv) => cv.couleur === carte.couleur && cv.rang === carte.rang,
                ) ?? false;

              const vol: CarteEnVol = {
                id,
                carte,
                depart: {
                  // Éventail pleine taille au départ (facteur 1.0) → se referme à l'arrivée
                  x: distribution.originX + offsetIdx * ecartX * perpX,
                  y: distribution.originY + offsetIdx * ecartX * perpY,
                  rotation: offsetIdx * ecartRotation,
                  echelle: 0.5,
                },
                // Arrivée : toutes convergent vers le centre de la main (pas de spread résiduel)
                arrivee: {
                  x: posMain.x,
                  y: posMain.y,
                  rotation: 0,
                  echelle: 1,
                },
                faceVisible: estVisible,
                duree: distribution.dureeCarte,
                easing: distribution.easingDistribution,
              };

              setCartesEnVol((prev) => [...prev, vol]);
            }, delaiCarte);

            timeoutsRef.current.push(timeout);
          }

          // Quand le paquet arrive dans la main (toutes les cartes partent simultanément)
          const timeoutArrivee = setTimeout(() => {
            options?.onPaquetArrive?.(position, cartesDuPaquet);
          }, delaiPaquet + distribution.dureeCarte);

          timeoutsRef.current.push(timeoutArrivee);
          temps += distribution.delaiEntreJoueurs;
        }

        indexCarte += taillePaquet;
      }

      // Callback de fin après toutes les animations
      if (options?.onTerminee) {
        const dernierDelai = Math.max(0, temps - distribution.delaiEntreJoueurs);
        const dureeTotale = dernierDelai + distribution.dureeCarte;
        const timeout = setTimeout(options.onTerminee, dureeTotale);
        timeoutsRef.current.push(timeout);
      }
    },
    [nettoyerTimeouts],
  );

  // --- Slide de la carte retournée vers la main du preneur ---
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

  // --- Jeu de carte (main → centre avec variation naturelle) ---
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
        const timeout = setTimeout(onTerminee, ANIMATIONS.jeuCarte.duree);
        timeoutsRef.current.push(timeout);
      }
    },
    [],
  );

  // --- Ramassage du pli en 2 phases (convergence → glissement vers pile) ---
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

      // Phase 1 : convergence vers la position du gagnant (toutes les cartes simultanément)
      const dureeConvergence = 180;
      // Phase 2 : glissement groupé vers la pile de l'équipe
      const dureeGlissement = 270;
      // Petit délai entre les deux phases
      const pauseEntrePhases = 50;

      const timeout = setTimeout(() => {
        onDebutRamassage?.();

        // Phase 1 : toutes les cartes convergent vers le gagnant (simultané, pas de stagger)
        for (let i = 0; i < cartesPli.length; i++) {
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

        // Phase 2 : après convergence, glissement groupé vers la pile
        const delaiPhase2 = dureeConvergence + pauseEntrePhases;
        const timeoutPhase2 = setTimeout(() => {
          for (let i = 0; i < cartesPli.length; i++) {
            const { carte } = cartesPli[i];
            compteurId.current += 1;
            const id = `ramassage-p2-${compteurId.current}`;

            // Léger décalage en éventail pour simuler un paquet tenu en main
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

  // Tout annuler (ex: quitter la partie)
  const annulerAnimations = useCallback(() => {
    nettoyerTimeouts();
    setCartesEnVol([]);
    setCartesSurTapis([]);
  }, [nettoyerTimeouts]);

  return {
    cartesEnVol,
    cartesSurTapis,
    surAnimationTerminee,
    lancerDistribution,
    glisserCarteRetournee,
    lancerAnimationJeuCarte,
    lancerAnimationRamassagePli,
    annulerAnimations,
  };
}
