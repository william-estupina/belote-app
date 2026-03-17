import type { Carte, PositionJoueur } from "@belote/shared-types";
import { useCallback, useRef, useState } from "react";

import type { CarteEnVol, CarteSurTapis } from "../components/game/CoucheAnimation";
import {
  ANIMATIONS,
  POSITIONS_MAINS,
  POSITIONS_PILES,
  POSITIONS_PLI,
  POSITIONS_TAPIS,
  variationCartePli,
} from "../constants/layout";

const POSITIONS_JOUEUR: PositionJoueur[] = ["sud", "ouest", "nord", "est"];

/** Génère un offset aléatoire dans [-max, +max] */
function aleatoire(max: number): number {
  return (Math.random() * 2 - 1) * max;
}

/**
 * Hook central de gestion des animations de cartes.
 * Gère les cartes en vol, les cartes sur le tapis,
 * et expose des fonctions pour déclencher chaque type d'animation.
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

  // --- Phase 1 : Distribution sur le tapis ---
  const lancerDistribution = useCallback(
    (
      mains: Record<PositionJoueur, Carte[]>,
      options?: {
        /** Appelé quand une carte atterrit sur le tapis */
        onCarteArrivee?: (carteSurTapis: CarteSurTapis) => void;
        /** Appelé quand un joueur a toutes ses cartes sur le tapis */
        onJoueurComplet?: (position: PositionJoueur) => void;
        onTerminee?: () => void;
        /** Cartes qui doivent être posées face visible (ex: carte retournée du preneur) */
        cartesVisibles?: Carte[];
      },
    ) => {
      nettoyerTimeouts();
      const { distribution } = ANIMATIONS;

      // Construire les paquets comme en vraie Belote
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

      // Compteur de cartes arrivées par joueur
      const cartesArrivees: Record<PositionJoueur, number> = {
        sud: 0,
        ouest: 0,
        nord: 0,
        est: 0,
      };
      const cartesAttenduesTotales: Record<PositionJoueur, number> = {
        sud: mains.sud.length,
        ouest: mains.ouest.length,
        nord: mains.nord.length,
        est: mains.est.length,
      };

      // Séquence de vol
      type CarteAvecDelai = {
        carte: Carte;
        position: PositionJoueur;
        delai: number;
        indexDansPaquet: number;
        numPaquet: number;
      };
      const sequence: CarteAvecDelai[] = [];

      let temps = 0;
      let indexCarte = 0;

      for (let p = 0; p < taillesPaquets.length; p++) {
        const taillePaquet = taillesPaquets[p];
        if (indexCarte > 0) {
          temps += distribution.pauseEntreTours;
        }

        for (const position of POSITIONS_JOUEUR) {
          const cartesJoueur = mains[position];

          for (let c = 0; c < taillePaquet && indexCarte + c < cartesJoueur.length; c++) {
            sequence.push({
              carte: cartesJoueur[indexCarte + c],
              position,
              delai: temps + c * distribution.delaiDansPaquet,
              indexDansPaquet: c,
              numPaquet: p + 1,
            });
          }

          temps += distribution.delaiEntreJoueurs;
        }

        indexCarte += taillePaquet;
      }

      // Lancer chaque carte
      for (const { carte, position, delai, numPaquet } of sequence) {
        const posTapis = POSITIONS_TAPIS[position];
        // Décalage pour distinguer paquet 1 et 2
        const decalageXPaquet = numPaquet === 2 ? distribution.decalagePaquet2 : 0;
        // Position finale aléatoire sur le tapis
        const xFinal =
          posTapis.x + decalageXPaquet + aleatoire(distribution.offsetAleatoireMax);
        const yFinal = posTapis.y + aleatoire(distribution.offsetAleatoireMax);
        const rotFinal = aleatoire(distribution.rotationAleatoireMax);

        const estVisible =
          options?.cartesVisibles?.some(
            (cv) => cv.couleur === carte.couleur && cv.rang === carte.rang,
          ) ?? false;

        const timeout = setTimeout(() => {
          compteurId.current += 1;
          const id = `distrib-${compteurId.current}`;

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
              x: xFinal,
              y: yFinal,
              rotation: rotFinal,
              echelle: 1,
            },
            faceVisible: estVisible,
            duree: distribution.dureeCarte,
          };

          setCartesEnVol((prev) => [...prev, vol]);

          // Quand la carte atterrit → créer CarteSurTapis
          const timeoutArrivee = setTimeout(() => {
            const cst: CarteSurTapis = {
              id: `tapis-${id}`,
              carte,
              position,
              x: xFinal,
              y: yFinal,
              rotation: rotFinal,
              faceVisible: estVisible,
              paquet: numPaquet as 1 | 2,
            };
            setCartesSurTapis((prev) => [...prev, cst]);
            options?.onCarteArrivee?.(cst);

            // Vérifier si le joueur a toutes ses cartes
            cartesArrivees[position] += 1;
            if (cartesArrivees[position] >= cartesAttenduesTotales[position]) {
              options?.onJoueurComplet?.(position);
            }
          }, distribution.dureeCarte);

          timeoutsRef.current.push(timeoutArrivee);
        }, delai);

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

  // --- Phase 2 : Prise en main (flip + vol tapis → main) ---
  const lancerPriseEnMain = useCallback(
    (
      position: PositionJoueur,
      cartesATrouver: CarteSurTapis[],
      positionsArrivee: { x: number; y: number }[],
      options?: {
        flipVers?: number; // 180 = révèle la face (sud), 0 ou absent = reste dos (bots)
        onTerminee?: () => void;
      },
    ) => {
      const { distribution } = ANIMATIONS;

      for (let i = 0; i < cartesATrouver.length; i++) {
        const cst = cartesATrouver[i];
        const posArrivee = positionsArrivee[i] ?? POSITIONS_MAINS[position];
        const delai = i * distribution.staggerPriseEnMain;
        const doitFlip = options?.flipVers !== undefined;

        const timeout = setTimeout(() => {
          // Retirer du tapis
          setCartesSurTapis((prev) => prev.filter((c) => c.id !== cst.id));

          compteurId.current += 1;
          const id = `prise-${compteurId.current}`;

          const vol: CarteEnVol = {
            id,
            carte: cst.carte,
            depart: {
              x: cst.x,
              y: cst.y,
              rotation: cst.rotation,
              echelle: 1.1, // soulèvement
            },
            arrivee: {
              x: posArrivee.x,
              y: posArrivee.y,
              rotation: 0,
              echelle: 1,
            },
            faceVisible: cst.faceVisible,
            duree: distribution.dureePriseEnMain,
            easing: "inout-cubic",
            ...(doitFlip
              ? {
                  flipDe: cst.faceVisible ? 180 : 0,
                  flipVers: options!.flipVers!,
                }
              : {}),
          };

          setCartesEnVol((prev) => [...prev, vol]);
        }, delai);

        timeoutsRef.current.push(timeout);
      }

      // Callback de fin
      if (options?.onTerminee) {
        const dureeTotale =
          (cartesATrouver.length - 1) * distribution.staggerPriseEnMain +
          distribution.dureePriseEnMain;
        const timeout = setTimeout(options.onTerminee, dureeTotale);
        timeoutsRef.current.push(timeout);
      }
    },
    [],
  );

  // --- Slide de la carte retournée vers le tapis du preneur ---
  const glisserCarteRetournee = useCallback(
    (
      carte: Carte,
      xDepart: number,
      yDepart: number,
      preneur: PositionJoueur,
      onTerminee?: (carteSurTapis: CarteSurTapis) => void,
    ) => {
      const { distribution } = ANIMATIONS;
      const posTapis = POSITIONS_TAPIS[preneur];
      const xArrivee = posTapis.x + aleatoire(distribution.offsetAleatoireMax);
      const yArrivee = posTapis.y + aleatoire(distribution.offsetAleatoireMax);
      const rotArrivee = aleatoire(distribution.rotationAleatoireMax);

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
          x: xArrivee,
          y: yArrivee,
          rotation: rotArrivee,
          echelle: 1,
        },
        faceVisible: true,
        duree: distribution.dureeSlideRetournee,
        easing: "inout-cubic",
      };

      setCartesEnVol((prev) => [...prev, vol]);

      // Créer CarteSurTapis quand elle arrive et la passer au callback
      const timeout = setTimeout(() => {
        const cst: CarteSurTapis = {
          id: `tapis-${id}`,
          carte,
          position: preneur,
          x: xArrivee,
          y: yArrivee,
          rotation: rotArrivee,
          faceVisible: true,
          paquet: 1,
        };
        setCartesSurTapis((prev) => [...prev, cst]);
        onTerminee?.(cst);
      }, distribution.dureeSlideRetournee);

      timeoutsRef.current.push(timeout);
    },
    [],
  );

  // --- Jeu de carte (main → centre avec variation naturelle) --- (INCHANGÉ)
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

  // --- Ramassage du pli (centre → pile de l'équipe gagnante) --- (INCHANGÉ)
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

      const dureeRamassage = 500;
      const delaiEntreCartes = 60;

      const timeout = setTimeout(() => {
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
    setCartesSurTapis([]);
  }, [nettoyerTimeouts]);

  return {
    cartesEnVol,
    cartesSurTapis,
    surAnimationTerminee,
    lancerDistribution,
    lancerPriseEnMain,
    glisserCarteRetournee,
    lancerAnimationJeuCarte,
    lancerAnimationRamassagePli,
    annulerAnimations,
  };
}
