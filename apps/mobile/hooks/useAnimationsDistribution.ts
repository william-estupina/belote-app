import type { Carte, PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { useCallback, useRef, useState } from "react";
import {
  Easing,
  makeMutable,
  runOnJS,
  type SharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { ANIMATIONS, POSITIONS_MAINS } from "../constants/layout";
import {
  calculerPointArc,
  calculerRectoSource,
  calculerVersoSource,
  type PointNormalise,
  type RectSource,
} from "./distributionAtlas";
import type { AtlasCartes } from "./useAtlasCartes";

// --- Types ---

/** Données géométriques pour une carte dans l'Atlas (côté JS) */
export interface CarteAtlas {
  carte: Carte;
  joueur: PositionJoueur;
  depart: PointNormalise;
  arrivee: PointNormalise;
  controle: PointNormalise;
  rotationDepart: number;
  rotationArrivee: number;
  echelleDepart: number;
  echelleArrivee: number;
  rectSource: RectSource;
}

/**
 * Données géométriques aplaties pour le worklet.
 * Pour chaque carte i, les données sont à l'offset i * STRIDE :
 * [departX, departY, controleX, controleY, arriveeX, arriveeY,
 *  rotationDepart, rotationArrivee, echelleDepart, echelleArrivee]
 */
const STRIDE = 10;

export interface ResultatAnimationsDistribution {
  lancerDistribution: (
    mains: Record<PositionJoueur, Carte[]>,
    options?: {
      onPaquetArrive?: (position: PositionJoueur, cartes: Carte[]) => void;
      onTerminee?: () => void;
      cartesVisibles?: Carte[];
    },
  ) => void;
  cartesAtlas: CarteAtlas[];
  /** SharedValues de progression (0→1) pour chaque carte, accessibles depuis worklet */
  progressions: SharedValue<number>[];
  /** Données géométriques aplaties pour le worklet */
  donneesWorklet: SharedValue<number[]>;
  /** Nombre de cartes actives dans la distribution courante */
  nbCartesActives: SharedValue<number>;
  enCours: boolean;
}

const MAX_CARTES = 32;
const EASING_OUT_CUBIC = Easing.out(Easing.cubic);

/**
 * Hook d'orchestration de la distribution via Skia Atlas.
 * Utilise withDelay natif Reanimated pour orchestrer sur le UI thread.
 */
export function useAnimationsDistribution(
  atlas: AtlasCartes,
): ResultatAnimationsDistribution {
  const [cartesAtlas, setCartesAtlas] = useState<CarteAtlas[]>([]);
  const [enCours, setEnCours] = useState(false);

  // Pool de SharedValues via makeMutable (pas un hook, pas de Rules of Hooks violation)
  const progressionsRef = useRef<SharedValue<number>[]>(
    Array.from({ length: MAX_CARTES }, () => makeMutable(0)),
  );
  const progressions = progressionsRef.current;

  // Données géométriques aplaties pour le worklet
  const donneesWorkletRef = useRef<SharedValue<number[]>>(
    makeMutable(new Array(MAX_CARTES * STRIDE).fill(0)),
  );
  const donneesWorklet = donneesWorkletRef.current;

  // Nombre de cartes actives
  const nbCartesActivesRef = useRef<SharedValue<number>>(makeMutable(0));
  const nbCartesActives = nbCartesActivesRef.current;

  const lancerDistribution = useCallback(
    (
      mains: Record<PositionJoueur, Carte[]>,
      options?: {
        onPaquetArrive?: (position: PositionJoueur, cartes: Carte[]) => void;
        onTerminee?: () => void;
        cartesVisibles?: Carte[];
      },
    ) => {
      const { distribution } = ANIMATIONS;
      const { largeurCellule, hauteurCellule } = atlas;

      if (!atlas.image || largeurCellule === 0) return;

      // Construire les paquets (3 puis 2)
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

      const nouvCartesAtlas: CarteAtlas[] = [];
      const donneesPlat: number[] = [];
      let temps = 0;
      let indexCarte = 0;

      const { ecartX, ecartRotation } = distribution.eventailVol;
      const decalage = distribution.arcDistribution.decalagePerpendiculaire;

      // Tracker les paquets pour les callbacks onPaquetArrive
      const paquetsCallback: {
        indexDerniereCarteAtlas: number;
        position: PositionJoueur;
        cartes: Carte[];
      }[] = [];

      // Stocker delai et duree pour chaque carte Atlas
      const delaisCartes: { delai: number; duree: number }[] = [];

      for (let p = 0; p < taillesPaquets.length; p++) {
        const taillePaquet = taillesPaquets[p];
        if (p > 0) temps += distribution.pauseEntreRounds;

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

          // Direction de vol pour éventail perpendiculaire
          const dx = posMain.x - distribution.originX;
          const dy = posMain.y - distribution.originY;
          const angle = Math.atan2(dy, dx);
          const perpX = -Math.sin(angle);
          const perpY = Math.cos(angle);

          for (let idx = 0; idx < cartesDuPaquet.length; idx++) {
            const carte = cartesDuPaquet[idx];
            const centre = (nbCartesPaquet - 1) / 2;
            const offsetIdx = idx - centre;

            const departX = distribution.originX + offsetIdx * ecartX * perpX;
            const departY = distribution.originY + offsetIdx * ecartX * perpY;
            const depart: PointNormalise = { x: departX, y: departY };
            const arrivee: PointNormalise = { x: posMain.x, y: posMain.y };
            const controle = calculerPointArc(depart, arrivee, decalage);

            const estVisible =
              options?.cartesVisibles?.some(
                (cv) => cv.couleur === carte.couleur && cv.rang === carte.rang,
              ) ?? false;

            const rectSrc = estVisible
              ? calculerRectoSource(
                  largeurCellule,
                  hauteurCellule,
                  carte.couleur,
                  carte.rang,
                )
              : calculerVersoSource(largeurCellule, hauteurCellule);

            const rotDepart = offsetIdx * ecartRotation;
            const rotArrivee = 0;
            const echDepart = 0.5;
            const echArrivee = 1;

            nouvCartesAtlas.push({
              carte,
              joueur: position,
              depart,
              arrivee,
              controle,
              rotationDepart: rotDepart,
              rotationArrivee: rotArrivee,
              echelleDepart: echDepart,
              echelleArrivee: echArrivee,
              rectSource: rectSrc,
            });

            // Données aplaties pour le worklet
            donneesPlat.push(
              depart.x,
              depart.y,
              controle.x,
              controle.y,
              arrivee.x,
              arrivee.y,
              rotDepart,
              rotArrivee,
              echDepart,
              echArrivee,
            );

            delaisCartes.push({ delai: delaiPaquet, duree: distribution.dureeCarte });
          }

          // Tracker la dernière carte du paquet pour le callback
          paquetsCallback.push({
            indexDerniereCarteAtlas: nouvCartesAtlas.length - 1,
            position,
            cartes: [...cartesDuPaquet],
          });

          temps += distribution.delaiEntreJoueurs;
        }

        indexCarte += taillePaquet;
      }

      // Mettre à jour l'état React
      setCartesAtlas(nouvCartesAtlas);
      setEnCours(true);

      // Mettre à jour les données worklet
      const donneesComplet = new Array(MAX_CARTES * STRIDE).fill(0);
      for (let i = 0; i < donneesPlat.length; i++) {
        donneesComplet[i] = donneesPlat[i];
      }
      donneesWorklet.value = donneesComplet;
      nbCartesActives.value = nouvCartesAtlas.length;

      // Réinitialiser les progressions
      for (let i = 0; i < MAX_CARTES; i++) {
        progressions[i].value = 0;
      }

      // Lancer les animations withDelay + withTiming
      let compteurTermines = 0;
      const totalCartes = nouvCartesAtlas.length;

      for (let i = 0; i < totalCartes; i++) {
        const { delai, duree } = delaisCartes[i];

        // Chercher si cette carte est la dernière d'un paquet (pour onPaquetArrive)
        const paquet = paquetsCallback.find((p) => p.indexDerniereCarteAtlas === i);

        progressions[i].value = withDelay(
          delai,
          withTiming(1, { duration: duree, easing: EASING_OUT_CUBIC }, (termine) => {
            "worklet";
            if (!termine) return;

            compteurTermines++;

            // Callback onPaquetArrive via runOnJS
            if (paquet && options?.onPaquetArrive) {
              runOnJS(options.onPaquetArrive)(paquet.position, paquet.cartes);
            }

            // Callback onTerminee quand toutes les cartes sont arrivées
            if (compteurTermines >= totalCartes) {
              if (options?.onTerminee) {
                runOnJS(options.onTerminee)();
              }
              runOnJS(setEnCours)(false);
            }
          }),
        );
      }
    },
    [atlas, progressions, donneesWorklet, nbCartesActives],
  );

  return {
    lancerDistribution,
    cartesAtlas,
    progressions,
    donneesWorklet,
    nbCartesActives,
    enCours,
  };
}
