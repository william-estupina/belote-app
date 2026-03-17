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
        /** Appelé quand un paquet complet arrive chez un joueur (3 ou 2 cartes d'un coup) */
        onPaquetArrive?: (joueur: PositionJoueur, cartes: Carte[]) => void;
        onTerminee?: () => void;
      },
    ) => {
      nettoyerTimeouts();
      const { distribution } = ANIMATIONS;

      // Construire les paquets comme en vraie Belote :
      // (ex: 5 cartes → [3, 2], 3 cartes → [3], 2 cartes → [2])
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

      // Construire la séquence avec timing par paquet
      type CarteAvecDelai = {
        carte: Carte;
        position: PositionJoueur;
        delai: number;
      };
      const sequence: CarteAvecDelai[] = [];

      // Paquets avec leur timing pour le callback onPaquetArrive
      type PaquetInfo = {
        position: PositionJoueur;
        cartes: Carte[];
        delaiArrivee: number; // moment où la dernière carte du paquet arrive
      };
      const paquets: PaquetInfo[] = [];

      let temps = 0;
      let indexCarte = 0;

      for (const taillePaquet of taillesPaquets) {
        if (indexCarte > 0) {
          temps += distribution.pauseEntreTours;
        }

        for (const position of POSITIONS_JOUEUR) {
          const cartesJoueur = mains[position];
          const cartesPaquet: Carte[] = [];

          for (let c = 0; c < taillePaquet && indexCarte + c < cartesJoueur.length; c++) {
            const carte = cartesJoueur[indexCarte + c];
            cartesPaquet.push(carte);
            sequence.push({
              carte,
              position,
              delai: temps + c * distribution.delaiDansPaquet,
            });
          }

          // Le paquet arrive quand la dernière carte atterrit
          if (cartesPaquet.length > 0) {
            const delaiDerniereCartePaquet =
              temps + (cartesPaquet.length - 1) * distribution.delaiDansPaquet;
            paquets.push({
              position,
              cartes: cartesPaquet,
              delaiArrivee: delaiDerniereCartePaquet + distribution.dureeCarte,
            });
          }

          temps += distribution.delaiEntreJoueurs;
        }

        indexCarte += taillePaquet;
      }

      // Lancer chaque carte à son moment (animation de vol)
      for (const { carte, position, delai } of sequence) {
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
        }, delai);

        timeoutsRef.current.push(timeout);
      }

      // Callback par paquet quand toutes les cartes du paquet sont arrivées
      for (const { position, cartes, delaiArrivee } of paquets) {
        const timeout = setTimeout(() => {
          options?.onPaquetArrive?.(position, cartes);
        }, delaiArrivee);
        timeoutsRef.current.push(timeout);
      }

      // Callback de fin après toutes les animations
      if (options?.onTerminee) {
        const dernierDelai =
          sequence.length > 0 ? sequence[sequence.length - 1].delai : 0;
        const dureeTotale = dernierDelai + distribution.dureeCarte;
        const timeout = setTimeout(options.onTerminee, dureeTotale);
        timeoutsRef.current.push(timeout);
      }
    },
    [nettoyerTimeouts],
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

  // --- Ramassage du pli (centre → pile de l'équipe gagnante) ---
  const lancerAnimationRamassagePli = useCallback(
    (
      cartesPli: { joueur: PositionJoueur; carte: Carte }[],
      gagnant: PositionJoueur,
      onTerminee?: () => void,
      onDebutRamassage?: () => void,
    ) => {
      // Déterminer la pile cible selon l'équipe du gagnant
      const indexGagnant = POSITIONS_JOUEUR.indexOf(gagnant);
      const equipe = indexGagnant % 2 === 0 ? "equipe1" : "equipe2";
      const posPile = POSITIONS_PILES[equipe];
      // Equipe2 (ouest) : la pile est tournée à 90°
      const rotationArrivee = equipe === "equipe2" ? 90 : 0;

      const dureeRamassage = 500;
      const delaiEntreCartes = 60;

      // Délai avant ramassage pour laisser voir le pli
      const timeout = setTimeout(() => {
        // Signaler le début du ramassage (pour effacer les cartes statiques)
        onDebutRamassage?.();

        for (let i = 0; i < cartesPli.length; i++) {
          const { joueur, carte } = cartesPli[i];

          const timeoutCarte = setTimeout(() => {
            compteurId.current += 1;
            const id = `ramassage-${compteurId.current}`;
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
                x: posPile.x,
                y: posPile.y,
                rotation: rotationArrivee,
                echelle: 0.4,
              },
              faceVisible: false,
              duree: dureeRamassage,
            };

            setCartesEnVol((prev) => [...prev, vol]);
          }, i * delaiEntreCartes);

          timeoutsRef.current.push(timeoutCarte);
        }

        if (onTerminee) {
          const dureeTotale = (cartesPli.length - 1) * delaiEntreCartes + dureeRamassage;
          const timeoutFin = setTimeout(onTerminee, dureeTotale);
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
