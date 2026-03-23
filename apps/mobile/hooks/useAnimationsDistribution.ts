import type { Carte, PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Easing,
  makeMutable,
  type SharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import {
  calculerDispositionMainJoueur,
  calculerPointAncrageCarteMainJoueurNormalisee,
} from "../components/game/mainJoueurDisposition";
import { ANIMATIONS, RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../constants/layout";
import {
  calculerPointArc,
  calculerRectoSource,
  calculerVersoSource,
  type PointNormalise,
  type RectSource,
} from "./distributionAtlas";
import {
  obtenirCibleDistributionAtlas,
  obtenirOrdreDistribution,
  obtenirOrigineDistribution,
} from "./distributionLayoutAtlas";
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
      indexDonneur?: number;
      nbCartesExistantesSud?: number;
      onPaquetDepart?: (position: PositionJoueur, cartes: Carte[]) => void;
      onPaquetArrive?: (position: PositionJoueur, cartes: Carte[]) => void;
      onTerminee?: () => void;
      cartesVisibles?: Carte[];
    },
  ) => void;
  /** Signale la fin de la distribution (retire le canvas). À appeler après le tri. */
  terminerDistribution: () => void;
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
  dimensionsEcran: { largeur: number; hauteur: number },
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
  const timeoutsCallbacksRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Appel en attente si atlas pas encore chargé
  const appelEnAttenteRef = useRef<{
    mains: Record<PositionJoueur, Carte[]>;
    options?: {
      indexDonneur?: number;
      nbCartesExistantesSud?: number;
      onPaquetDepart?: (position: PositionJoueur, cartes: Carte[]) => void;
      onPaquetArrive?: (position: PositionJoueur, cartes: Carte[]) => void;
      onTerminee?: () => void;
      cartesVisibles?: Carte[];
    };
  } | null>(null);

  const lancerDistribution = useCallback(
    (
      mains: Record<PositionJoueur, Carte[]>,
      options?: {
        indexDonneur?: number;
        nbCartesExistantesSud?: number;
        onPaquetDepart?: (position: PositionJoueur, cartes: Carte[]) => void;
        onPaquetArrive?: (position: PositionJoueur, cartes: Carte[]) => void;
        onTerminee?: () => void;
        cartesVisibles?: Carte[];
      },
    ) => {
      for (const timeout of timeoutsCallbacksRef.current) {
        clearTimeout(timeout);
      }
      timeoutsCallbacksRef.current = [];

      const { distribution } = ANIMATIONS;
      const { largeurCellule, hauteurCellule } = atlas;
      const { largeur: largeurEcran, hauteur: hauteurEcran } = dimensionsEcran;
      if (
        !atlas.image ||
        largeurCellule === 0 ||
        largeurEcran === 0 ||
        hauteurEcran === 0
      ) {
        appelEnAttenteRef.current = { mains, options };
        return;
      }
      appelEnAttenteRef.current = null;

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
      const indexDonneur = options?.indexDonneur ?? 0;
      const nbCartesExistantesSud = options?.nbCartesExistantesSud ?? 0;
      const ordreDistribution = obtenirOrdreDistribution(indexDonneur);
      const origineDistribution = obtenirOrigineDistribution(indexDonneur);

      // Tracker les paquets pour les callbacks onPaquetArrive
      const paquetsCallback: {
        indexDerniereCarteAtlas: number;
        position: PositionJoueur;
        cartes: Carte[];
        delaiDepartMs: number;
      }[] = [];

      // Stocker delai et duree pour chaque carte Atlas
      const delaisCartes: { delai: number; duree: number }[] = [];

      for (let p = 0; p < taillesPaquets.length; p++) {
        const taillePaquet = taillesPaquets[p];
        if (p > 0) temps += distribution.pauseEntreRounds;

        for (const position of ordreDistribution) {
          const cartesJoueur = mains[position];
          const cibleDistribution = obtenirCibleDistributionAtlas(position);

          const cartesDuPaquet: Carte[] = [];
          for (let c = 0; c < taillePaquet && indexCarte + c < cartesJoueur.length; c++) {
            cartesDuPaquet.push(cartesJoueur[indexCarte + c]);
          }
          if (cartesDuPaquet.length === 0) continue;

          const delaiPaquet = temps;
          const nbCartesPaquet = cartesDuPaquet.length;
          const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
          const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
          const dispositionSud =
            position === "sud"
              ? calculerDispositionMainJoueur({
                  mode: "reception",
                  nbCartes: nbCartesExistantesSud + indexCarte + nbCartesPaquet,
                  largeurEcran,
                  hauteurEcran,
                  largeurCarte,
                  hauteurCarte,
                })
              : null;
          const posMain = cibleDistribution.arrivee;

          // Direction de vol pour éventail perpendiculaire
          const dx = posMain.x - origineDistribution.x;
          const dy = posMain.y - origineDistribution.y;
          const angle = Math.atan2(dy, dx);
          const perpX = -Math.sin(angle);
          const perpY = Math.cos(angle);

          for (let idx = 0; idx < cartesDuPaquet.length; idx++) {
            const carte = cartesDuPaquet[idx];
            const centre = (nbCartesPaquet - 1) / 2;
            const offsetIdx = idx - centre;

            const departX = origineDistribution.x + offsetIdx * ecartX * perpX;
            const departY = origineDistribution.y + offsetIdx * ecartX * perpY;
            const depart: PointNormalise = { x: departX, y: departY };
            const dispositionCarteSud =
              position === "sud" && dispositionSud
                ? dispositionSud.cartes[nbCartesExistantesSud + indexCarte + idx]
                : null;
            const arrivee: PointNormalise =
              position === "sud" && dispositionCarteSud
                ? calculerPointAncrageCarteMainJoueurNormalisee({
                    x: dispositionCarteSud.x,
                    decalageY: dispositionCarteSud.decalageY,
                    largeurEcran,
                    hauteurEcran,
                    largeurCarte,
                    hauteurCarte,
                  })
                : { x: posMain.x, y: posMain.y };
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
            const rotArrivee =
              position === "sud" && dispositionCarteSud
                ? dispositionCarteSud.angle
                : cibleDistribution.rotationArrivee;
            const echDepart = 0.5;
            const echArrivee = cibleDistribution.echelleArrivee;

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
            delaiDepartMs: delaiPaquet,
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

      // Réinitialiser les progressions :
      // -1 = en attente, [0..1] = en vol, 1 = arrivée (reste visible)
      for (let i = 0; i < MAX_CARTES; i++) {
        progressions[i].value = -1;
      }

      // Planifier les callbacks et masquer les cartes arrivées dans l'atlas.
      // Stratégie anti-doublon / anti-clignotement :
      // - Les cartes arrivées (t=1) restent visibles dans le canvas
      // - Quand un NOUVEAU paquet "sud" part, on masque les cartes "sud"
      //   du paquet précédent (MainJoueur les a déjà depuis plusieurs frames)
      // - Pour le dernier paquet, le canvas et MainJoueur affichent les cartes
      //   aux mêmes positions → superposition invisible jusqu'au démontage
      let delaiFinDistributionMs = 0;
      let indexDebutPaquet = 0;
      const indicesSudArrivees: { debut: number; fin: number }[] = [];

      for (const paquet of paquetsCallback) {
        const indexFin = paquet.indexDerniereCarteAtlas;
        const delaiCarte = delaisCartes[indexFin];

        // Quand un nouveau paquet sud part, masquer les cartes sud
        // précédemment arrivées dans le canvas (MainJoueur les a déjà)
        if (paquet.position === "sud" && indicesSudArrivees.length > 0) {
          const indicesToHide = [...indicesSudArrivees];
          const timeout = setTimeout(() => {
            for (const range of indicesToHide) {
              for (let i = range.debut; i <= range.fin; i++) {
                progressions[i].value = 2;
              }
            }
            options?.onPaquetDepart?.(paquet.position, paquet.cartes);
          }, paquet.delaiDepartMs);
          timeoutsCallbacksRef.current.push(timeout);
        } else if (options?.onPaquetDepart) {
          const timeout = setTimeout(() => {
            options.onPaquetDepart?.(paquet.position, paquet.cartes);
          }, paquet.delaiDepartMs);
          timeoutsCallbacksRef.current.push(timeout);
        }

        if (delaiCarte) {
          const delaiArriveeMs = delaiCarte.delai + delaiCarte.duree;
          delaiFinDistributionMs = Math.max(delaiFinDistributionMs, delaiArriveeMs);
          const debut = indexDebutPaquet;
          const fin = indexFin;

          if (paquet.position === "sud") {
            indicesSudArrivees.push({ debut, fin });
          }

          const timeout = setTimeout(() => {
            options?.onPaquetArrive?.(paquet.position, paquet.cartes);
          }, delaiArriveeMs);
          timeoutsCallbacksRef.current.push(timeout);
        }

        indexDebutPaquet = indexFin + 1;
      }

      // Callback de fin (toutes les animations terminées).
      // Note : setEnCours(false) n'est PAS appelé ici — c'est le contrôleur
      // qui appelle terminerDistribution() après le tri, pour éviter un
      // re-layout intermédiaire avec les cartes non triées.
      if (options?.onTerminee) {
        const DELAI_SECURITE_DEMONTAGE = 100;
        const timeoutFin = setTimeout(() => {
          options.onTerminee?.();
        }, delaiFinDistributionMs + DELAI_SECURITE_DEMONTAGE);
        timeoutsCallbacksRef.current.push(timeoutFin);
      }

      // Lancer les animations withDelay + withTiming
      const totalCartes = nouvCartesAtlas.length;

      for (let i = 0; i < totalCartes; i++) {
        const { delai, duree } = delaisCartes[i];
        const progression = progressions[i];

        progression.value = withDelay(
          delai,
          withTiming(1, { duration: duree, easing: EASING_OUT_CUBIC }),
        );
      }
    },
    [atlas, dimensionsEcran, progressions, donneesWorklet, nbCartesActives],
  );

  const terminerDistribution = useCallback(() => {
    setEnCours(false);
  }, []);

  // Rejouer l'appel en attente quand l'atlas devient disponible
  useEffect(() => {
    const enAttente = appelEnAttenteRef.current;
    if (atlas.image && enAttente) {
      appelEnAttenteRef.current = null;
      lancerDistribution(enAttente.mains, enAttente.options);
    }
  }, [atlas.image, lancerDistribution]);

  useEffect(() => {
    return () => {
      for (const timeout of timeoutsCallbacksRef.current) {
        clearTimeout(timeout);
      }
      timeoutsCallbacksRef.current = [];
    };
  }, []);

  return {
    lancerDistribution,
    terminerDistribution,
    cartesAtlas,
    progressions,
    donneesWorklet,
    nbCartesActives,
    enCours,
  };
}
