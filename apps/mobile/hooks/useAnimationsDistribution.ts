import type { Carte, PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Easing,
  makeMutable,
  runOnUI,
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
  calculerCiblesEventailAdversaire,
  ECHELLE_MAIN_ADVERSE,
  obtenirCibleDistributionAtlas,
  obtenirOrdreDistribution,
  obtenirOrigineDistribution,
} from "./distributionLayoutAtlas";
import type { AtlasCartes } from "./useAtlasCartes";
import { creerCarteFactice } from "./utils-cartes";

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
      cartesExistantesSud?: Carte[];
      nbCartesExistantesSud?: number;
      nbCartesExistantesAdversaires?: Partial<Record<"nord" | "est" | "ouest", number>>;
      onPaquetDepart?: (position: PositionJoueur, cartes: Carte[]) => void;
      onPaquetArrive?: (position: PositionJoueur, cartes: Carte[]) => void;
      onTerminee?: () => void;
      cartesVisibles?: Carte[];
    },
  ) => void;
  animerTriSud: (params: {
    mainDistribuee: Carte[];
    mainTriee: Carte[];
    largeurEcran: number;
    hauteurEcran: number;
    onTerminee: () => void;
  }) => void;
  /** Signale la fin de la distribution (retire le canvas). À appeler après le tri. */
  terminerDistribution: () => void;
  cartesAtlasAdversaires: CarteAtlas[];
  cartesAtlasSud: CarteAtlas[];
  /** Pool adversaires — SharedValues pour CanvasAdversaires */
  progressionsAdv: SharedValue<number>[];
  donneesWorkletAdv: SharedValue<number[]>;
  nbCartesActivesAdv: SharedValue<number>;
  /** Pool sud — SharedValues pour DistributionCanvasSud */
  progressionsSud: SharedValue<number>[];
  donneesWorkletSud: SharedValue<number[]>;
  nbCartesActivesSud: SharedValue<number>;
  enCours: boolean;
}

const MAX_CARTES_ADV = 24; // 8 cartes × 3 adversaires
const MAX_CARTES_SUD = 8;
const EASING_OUT_CUBIC = Easing.out(Easing.cubic);

function cartesSontEgales(carteA: Carte, carteB: Carte): boolean {
  return carteA.couleur === carteB.couleur && carteA.rang === carteB.rang;
}

/**
 * Hook d'orchestration de la distribution via Skia Atlas.
 * Utilise withDelay natif Reanimated pour orchestrer sur le UI thread.
 * Gère deux pools de SharedValues séparés : adversaires et sud.
 */
export function useAnimationsDistribution(
  atlas: AtlasCartes,
  dimensionsEcran: { largeur: number; hauteur: number },
): ResultatAnimationsDistribution {
  const [cartesAtlasAdversaires, setCartesAtlasAdversaires] = useState<CarteAtlas[]>([]);
  const [cartesAtlasSud, setCartesAtlasSud] = useState<CarteAtlas[]>([]);
  const [enCours, setEnCours] = useState(false);

  // Pool adversaires
  const progressionsAdvRef = useRef<SharedValue<number>[]>(
    Array.from({ length: MAX_CARTES_ADV }, () => makeMutable(0)),
  );
  const progressionsAdv = progressionsAdvRef.current;
  const donneesWorkletAdvRef = useRef<SharedValue<number[]>>(
    makeMutable(new Array(MAX_CARTES_ADV * STRIDE).fill(0)),
  );
  const donneesWorkletAdv = donneesWorkletAdvRef.current;
  const nbCartesActivesAdvRef = useRef<SharedValue<number>>(makeMutable(0));
  const nbCartesActivesAdv = nbCartesActivesAdvRef.current;

  // Pool sud
  const progressionsSudRef = useRef<SharedValue<number>[]>(
    Array.from({ length: MAX_CARTES_SUD }, () => makeMutable(0)),
  );
  const progressionsSud = progressionsSudRef.current;
  const donneesWorkletSudRef = useRef<SharedValue<number[]>>(
    makeMutable(new Array(MAX_CARTES_SUD * STRIDE).fill(0)),
  );
  const donneesWorkletSud = donneesWorkletSudRef.current;
  const nbCartesActivesSudRef = useRef<SharedValue<number>>(makeMutable(0));
  const nbCartesActivesSud = nbCartesActivesSudRef.current;

  const timeoutsCallbacksRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Appel en attente si atlas pas encore chargé
  const appelEnAttenteRef = useRef<{
    mains: Record<PositionJoueur, Carte[]>;
    options?: {
      indexDonneur?: number;
      cartesExistantesSud?: Carte[];
      nbCartesExistantesSud?: number;
      nbCartesExistantesAdversaires?: Partial<Record<"nord" | "est" | "ouest", number>>;
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
        cartesExistantesSud?: Carte[];
        nbCartesExistantesSud?: number;
        nbCartesExistantesAdversaires?: Partial<Record<"nord" | "est" | "ouest", number>>;
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

      // Deux tableaux séparés : adversaires et sud
      const cartesAdv: CarteAtlas[] = [];
      const cartesSud: CarteAtlas[] = [];
      const donneesPlatAdv: number[] = [];
      const donneesPlatSud: number[] = [];
      const delaisCartesAdv: { delai: number; duree: number }[] = [];
      const delaisCartesSud: { delai: number; duree: number }[] = [];

      let temps = 0;
      let indexCarte = 0;

      const { ecartX, ecartRotation } = distribution.eventailVol;
      const decalage = distribution.arcDistribution.decalagePerpendiculaire;
      const indexDonneur = options?.indexDonneur ?? 0;
      const cartesExistantesSud = options?.cartesExistantesSud ?? [];
      const nbCartesExistantesSud =
        options?.nbCartesExistantesSud ?? cartesExistantesSud.length;
      const nbCartesExistantesAdv = options?.nbCartesExistantesAdversaires ?? {};
      const ordreDistribution = obtenirOrdreDistribution(indexDonneur);
      const origineDistribution = obtenirOrigineDistribution(indexDonneur);
      const delaiPremierPaquetParPosition: Partial<Record<PositionJoueur, number>> = {};
      let indexCarteCachee = 0;

      let tempsSimulation = 0;
      let indexCarteSimulation = 0;

      for (let p = 0; p < taillesPaquets.length; p++) {
        const taillePaquet = taillesPaquets[p];
        if (p > 0) tempsSimulation += distribution.pauseEntreRounds;

        for (const position of ordreDistribution) {
          const cartesJoueur = mains[position];
          const cartesDuPaquet = cartesJoueur.slice(
            indexCarteSimulation,
            indexCarteSimulation + taillePaquet,
          );
          if (cartesDuPaquet.length === 0) continue;

          if (delaiPremierPaquetParPosition[position] === undefined) {
            delaiPremierPaquetParPosition[position] = tempsSimulation;
          }

          tempsSimulation += distribution.delaiEntreJoueurs;
        }

        indexCarteSimulation += taillePaquet;
      }

      for (const position of ["nord", "ouest", "est"] as const) {
        const nbExistantes = nbCartesExistantesAdv[position] ?? 0;
        if (nbExistantes === 0) continue;
        const nbCartesFinal = nbExistantes + mains[position].length;
        const delaiAnimation = delaiPremierPaquetParPosition[position] ?? 0;

        const ciblesExistantesDepart = calculerCiblesEventailAdversaire(
          position,
          0,
          nbExistantes,
          nbExistantes,
          largeurEcran,
          hauteurEcran,
        );
        const ciblesExistantesArrivee = calculerCiblesEventailAdversaire(
          position,
          0,
          nbExistantes,
          nbCartesFinal,
          largeurEcran,
          hauteurEcran,
        );

        for (let index = 0; index < nbExistantes; index += 1) {
          const cibleDepart = ciblesExistantesDepart[index];
          const cibleArrivee = ciblesExistantesArrivee[index];
          const controle = {
            x: (cibleDepart.arrivee.x + cibleArrivee.arrivee.x) / 2,
            y: (cibleDepart.arrivee.y + cibleArrivee.arrivee.y) / 2,
          };

          cartesAdv.push({
            carte: creerCarteFactice(indexCarteCachee),
            joueur: position,
            depart: cibleDepart.arrivee,
            arrivee: cibleArrivee.arrivee,
            controle,
            rotationDepart: cibleDepart.rotationArrivee,
            rotationArrivee: cibleArrivee.rotationArrivee,
            echelleDepart: ECHELLE_MAIN_ADVERSE,
            echelleArrivee: ECHELLE_MAIN_ADVERSE,
            rectSource: calculerVersoSource(largeurCellule, hauteurCellule),
          });
          donneesPlatAdv.push(
            cibleDepart.arrivee.x,
            cibleDepart.arrivee.y,
            controle.x,
            controle.y,
            cibleArrivee.arrivee.x,
            cibleArrivee.arrivee.y,
            cibleDepart.rotationArrivee,
            cibleArrivee.rotationArrivee,
            ECHELLE_MAIN_ADVERSE,
            ECHELLE_MAIN_ADVERSE,
          );
          delaisCartesAdv.push({
            delai: delaiAnimation,
            duree: distribution.dureeCarte,
          });
          indexCarteCachee += 1;
        }
      }

      if (cartesExistantesSud.length > 0) {
        const delaiAnimationSud = delaiPremierPaquetParPosition.sud ?? 0;
        const largeurCarteSud = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
        const hauteurCarteSud = Math.round(largeurCarteSud * RATIO_ASPECT_CARTE);
        const dispositionDepartSud = calculerDispositionMainJoueur({
          mode: "eventail",
          nbCartes: cartesExistantesSud.length,
          largeurEcran,
          hauteurEcran,
          largeurCarte: largeurCarteSud,
          hauteurCarte: hauteurCarteSud,
        });
        const dispositionArriveeSud = calculerDispositionMainJoueur({
          mode: "eventail",
          nbCartes: nbCartesExistantesSud + mains.sud.length,
          largeurEcran,
          hauteurEcran,
          largeurCarte: largeurCarteSud,
          hauteurCarte: hauteurCarteSud,
        });

        for (let index = 0; index < cartesExistantesSud.length; index += 1) {
          const carte = cartesExistantesSud[index];
          const carteDepart = dispositionDepartSud.cartes[index];
          const carteArrivee = dispositionArriveeSud.cartes[index];
          const depart = calculerPointAncrageCarteMainJoueurNormalisee({
            x: carteDepart.x,
            decalageY: carteDepart.decalageY,
            largeurEcran,
            hauteurEcran,
            largeurCarte: largeurCarteSud,
            hauteurCarte: hauteurCarteSud,
          });
          const arrivee = calculerPointAncrageCarteMainJoueurNormalisee({
            x: carteArrivee.x,
            decalageY: carteArrivee.decalageY,
            largeurEcran,
            hauteurEcran,
            largeurCarte: largeurCarteSud,
            hauteurCarte: hauteurCarteSud,
          });
          const controle = {
            x: (depart.x + arrivee.x) / 2,
            y: (depart.y + arrivee.y) / 2,
          };

          cartesSud.push({
            carte,
            joueur: "sud",
            depart,
            arrivee,
            controle,
            rotationDepart: carteDepart.angle,
            rotationArrivee: carteArrivee.angle,
            echelleDepart: 1,
            echelleArrivee: 1,
            rectSource: calculerRectoSource(
              largeurCellule,
              hauteurCellule,
              carte.couleur,
              carte.rang,
            ),
          });
          donneesPlatSud.push(
            depart.x,
            depart.y,
            controle.x,
            controle.y,
            arrivee.x,
            arrivee.y,
            carteDepart.angle,
            carteArrivee.angle,
            1,
            1,
          );
          delaisCartesSud.push({
            delai: delaiAnimationSud,
            duree: distribution.dureeReorganisationMain,
          });
        }
      }

      // Tracker les paquets pour les callbacks onPaquetArrive
      const paquetsCallback: {
        indexDerniereCartePool: number;
        estSud: boolean;
        position: PositionJoueur;
        cartes: Carte[];
        delaiDepartMs: number;
      }[] = [];

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
          const posAdv = position as "nord" | "est" | "ouest";
          const existAdv = nbCartesExistantesAdv[posAdv] ?? 0;
          const ciblesAdversaire =
            position !== "sud"
              ? calculerCiblesEventailAdversaire(
                  posAdv,
                  existAdv + indexCarte,
                  nbCartesPaquet,
                  existAdv + mains[position].length,
                  largeurEcran,
                  hauteurEcran,
                )
              : null;
          const posMain = cibleDistribution.arrivee;

          // Direction de vol pour éventail perpendiculaire
          const dx = posMain.x - origineDistribution.x;
          const dy = posMain.y - origineDistribution.y;
          const angle = Math.atan2(dy, dx);
          const perpX = -Math.sin(angle);
          const perpY = Math.cos(angle);

          const estSud = position === "sud";

          for (let idx = 0; idx < cartesDuPaquet.length; idx++) {
            const carte = cartesDuPaquet[idx];
            const centre = (nbCartesPaquet - 1) / 2;
            const offsetIdx = idx - centre;

            const departX = origineDistribution.x + offsetIdx * ecartX * perpX;
            const departY = origineDistribution.y + offsetIdx * ecartX * perpY;
            const depart: PointNormalise = { x: departX, y: departY };
            const dispositionCarteSud =
              estSud && dispositionSud
                ? dispositionSud.cartes[nbCartesExistantesSud + indexCarte + idx]
                : null;
            const cibleAdv = ciblesAdversaire?.[idx] ?? null;
            const arrivee: PointNormalise =
              estSud && dispositionCarteSud
                ? calculerPointAncrageCarteMainJoueurNormalisee({
                    x: dispositionCarteSud.x,
                    decalageY: dispositionCarteSud.decalageY,
                    largeurEcran,
                    hauteurEcran,
                    largeurCarte,
                    hauteurCarte,
                  })
                : cibleAdv
                  ? cibleAdv.arrivee
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
              estSud && dispositionCarteSud
                ? dispositionCarteSud.angle
                : cibleAdv
                  ? cibleAdv.rotationArrivee
                  : cibleDistribution.rotationArrivee;
            const echDepart = 0.5;
            const echArrivee = cibleDistribution.echelleArrivee;

            const carteAtlas: CarteAtlas = {
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
            };

            const donneesCarteFlat = [
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
            ];

            if (estSud) {
              cartesSud.push(carteAtlas);
              donneesPlatSud.push(...donneesCarteFlat);
              delaisCartesSud.push({
                delai: delaiPaquet,
                duree: distribution.dureeCarte,
              });
            } else {
              cartesAdv.push(carteAtlas);
              donneesPlatAdv.push(...donneesCarteFlat);
              delaisCartesAdv.push({
                delai: delaiPaquet,
                duree: distribution.dureeCarte,
              });
            }
          }

          // Tracker la dernière carte du paquet pour le callback
          paquetsCallback.push({
            indexDerniereCartePool: estSud ? cartesSud.length - 1 : cartesAdv.length - 1,
            estSud,
            position,
            cartes: [...cartesDuPaquet],
            delaiDepartMs: delaiPaquet,
          });

          temps += distribution.delaiEntreJoueurs;
        }

        indexCarte += taillePaquet;
      }

      // Mettre à jour l'état React
      setCartesAtlasAdversaires(cartesAdv);
      setCartesAtlasSud(cartesSud);
      setEnCours(true);

      // Mettre à jour les données worklet — pool adversaires
      const donneesAdvComplet = new Array(MAX_CARTES_ADV * STRIDE).fill(0);
      for (let i = 0; i < donneesPlatAdv.length; i++) {
        donneesAdvComplet[i] = donneesPlatAdv[i];
      }
      donneesWorkletAdv.value = donneesAdvComplet;
      nbCartesActivesAdv.value = cartesAdv.length;

      // Mettre à jour les données worklet — pool sud
      const donneesSudComplet = new Array(MAX_CARTES_SUD * STRIDE).fill(0);
      for (let i = 0; i < donneesPlatSud.length; i++) {
        donneesSudComplet[i] = donneesPlatSud[i];
      }
      donneesWorkletSud.value = donneesSudComplet;
      nbCartesActivesSud.value = cartesSud.length;

      // Réinitialiser les progressions :
      // -1 = en attente, [0..1] = en vol, 1 = arrivée (reste visible)
      for (let i = 0; i < MAX_CARTES_ADV; i++) {
        progressionsAdv[i].value = -1;
      }
      for (let i = 0; i < MAX_CARTES_SUD; i++) {
        progressionsSud[i].value = -1;
      }

      // Les cartes adverses deja visibles doivent rester affichees a leur
      // position de depart jusqu'au declenchement de leur glissement differe.
      for (let i = 0; i < indexCarteCachee; i++) {
        progressionsAdv[i].value = 0;
      }
      for (let i = 0; i < cartesExistantesSud.length; i++) {
        progressionsSud[i].value = 0;
      }

      // Planifier les callbacks.
      // Les cartes sud restent visibles dans l'Atlas (progression = 1) après leur arrivée,
      // jusqu'à ce que animerTriSud les masque après le tri.
      let delaiFinDistributionMs = 0;

      // Indexer les paquets sud et leurs plages dans le pool
      const paquetsSud: typeof paquetsCallback = [];
      let indexDebutPaquetSudCourant = 0;
      const indicesSudParPaquet: { debut: number; fin: number }[] = [];

      for (const paquet of paquetsCallback) {
        if (paquet.estSud) {
          indicesSudParPaquet.push({
            debut: indexDebutPaquetSudCourant,
            fin: paquet.indexDerniereCartePool,
          });
          indexDebutPaquetSudCourant = paquet.indexDerniereCartePool + 1;
          paquetsSud.push(paquet);
        }
      }

      for (const paquet of paquetsCallback) {
        const delaisPool = paquet.estSud ? delaisCartesSud : delaisCartesAdv;
        const delaiCarte = delaisPool[paquet.indexDerniereCartePool];

        if (options?.onPaquetDepart) {
          const timeout = setTimeout(() => {
            options.onPaquetDepart?.(paquet.position, paquet.cartes);
          }, paquet.delaiDepartMs);
          timeoutsCallbacksRef.current.push(timeout);
        }

        if (delaiCarte) {
          const delaiArriveeMs = delaiCarte.delai + delaiCarte.duree;
          delaiFinDistributionMs = Math.max(delaiFinDistributionMs, delaiArriveeMs);

          const timeout = setTimeout(() => {
            options?.onPaquetArrive?.(paquet.position, paquet.cartes);
          }, delaiArriveeMs);
          timeoutsCallbacksRef.current.push(timeout);
        }
      }

      // Décaler les cartes du premier paquet sud vers leur position dans le layout final
      // (5 cartes) au départ du second paquet, en réanimant leur progression dans l'Atlas.
      if (paquetsSud.length >= 2 && cartesExistantesSud.length === 0) {
        const premierPaquetIndices = indicesSudParPaquet[0];
        const delaiDecalage = paquetsSud[1].delaiDepartMs;
        const nbCartesSudTotal = cartesSud.length;
        const largeurCarteDecalage = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
        const hauteurCarteDecalage = Math.round(
          largeurCarteDecalage * RATIO_ASPECT_CARTE,
        );

        const dispositionDecalage = calculerDispositionMainJoueur({
          mode: "reception",
          nbCartes: nbCartesExistantesSud + nbCartesSudTotal,
          largeurEcran,
          hauteurEcran,
          largeurCarte: largeurCarteDecalage,
          hauteurCarte: hauteurCarteDecalage,
        });

        const shiftDonnees: number[] = [];
        for (let i = premierPaquetIndices.debut; i <= premierPaquetIndices.fin; i++) {
          const carteDisp = dispositionDecalage.cartes[nbCartesExistantesSud + i];
          const nouvelleArrivee = calculerPointAncrageCarteMainJoueurNormalisee({
            x: carteDisp.x,
            decalageY: carteDisp.decalageY,
            largeurEcran,
            hauteurEcran,
            largeurCarte: largeurCarteDecalage,
            hauteurCarte: hauteurCarteDecalage,
          });
          const offset = i * STRIDE;
          const departX = donneesPlatSud[offset + 4];
          const departY = donneesPlatSud[offset + 5];
          const rotationCourante = donneesPlatSud[offset + 7];
          const echelleCourante = donneesPlatSud[offset + 9];
          shiftDonnees.push(
            departX,
            departY,
            (departX + nouvelleArrivee.x) / 2,
            (departY + nouvelleArrivee.y) / 2,
            nouvelleArrivee.x,
            nouvelleArrivee.y,
            rotationCourante,
            carteDisp.angle,
            echelleCourante,
            echelleCourante,
          );
        }

        const timeoutDecalage = setTimeout(() => {
          const donneesCourantes = donneesWorkletSud.value;
          const nouvellesDonnees = [...donneesCourantes];
          for (let i = premierPaquetIndices.debut; i <= premierPaquetIndices.fin; i++) {
            const sdOffset = (i - premierPaquetIndices.debut) * STRIDE;
            const poolOffset = i * STRIDE;
            for (let j = 0; j < STRIDE; j++) {
              nouvellesDonnees[poolOffset + j] = shiftDonnees[sdOffset + j];
            }
          }
          const debut = premierPaquetIndices.debut;
          const fin = premierPaquetIndices.fin;
          const duree = distribution.dureeReorganisationMain;
          runOnUI(() => {
            donneesWorkletSud.value = nouvellesDonnees;
            for (let i = debut; i <= fin; i++) {
              progressionsSud[i].value = 0;
              progressionsSud[i].value = withTiming(1, {
                duration: duree,
                easing: EASING_OUT_CUBIC,
              });
            }
          })();
        }, delaiDecalage);
        timeoutsCallbacksRef.current.push(timeoutDecalage);
      }

      // Callback de fin : notifier la fin de distribution.
      // Les cartes sud ne sont PAS masquées ici — c'est animerTriSud qui s'en charge
      // après le tri, pour éviter tout trou visuel.
      // Note : setEnCours(false) n'est PAS appelé ici — c'est le contrôleur
      // qui appelle terminerDistribution() après le tri, pour éviter un
      // re-layout intermédiaire avec les cartes non triées.
      if (options?.onTerminee) {
        const DELAI_SECURITE_DEMONTAGE = 100;
        const delaiFinMs = delaiFinDistributionMs + DELAI_SECURITE_DEMONTAGE;
        const timeoutFin = setTimeout(() => {
          options?.onTerminee?.();
        }, delaiFinMs);
        timeoutsCallbacksRef.current.push(timeoutFin);
      }

      // Lancer les animations withDelay + withTiming — pool adversaires
      for (let i = 0; i < cartesAdv.length; i++) {
        const delaiCarte = delaisCartesAdv[i];
        const { delai, duree } = delaiCarte;
        progressionsAdv[i].value = withDelay(
          delai,
          withTiming(1, { duration: duree, easing: EASING_OUT_CUBIC }),
        );
      }

      // Lancer les animations withDelay + withTiming — pool sud
      for (let i = 0; i < cartesSud.length; i++) {
        const { delai, duree } = delaisCartesSud[i];
        progressionsSud[i].value = withDelay(
          delai,
          withTiming(1, { duration: duree, easing: EASING_OUT_CUBIC }),
        );
      }
    },
    [
      atlas,
      dimensionsEcran,
      progressionsAdv,
      donneesWorkletAdv,
      nbCartesActivesAdv,
      progressionsSud,
      donneesWorkletSud,
      nbCartesActivesSud,
    ],
  );

  const terminerDistribution = useCallback(() => {
    setEnCours(false);
  }, []);

  const animerTriSud = useCallback(
    ({
      mainDistribuee,
      mainTriee,
      largeurEcran,
      hauteurEcran,
      onTerminee,
    }: {
      mainDistribuee: Carte[];
      mainTriee: Carte[];
      largeurEcran: number;
      hauteurEcran: number;
      onTerminee: () => void;
    }) => {
      const nbCartes = mainDistribuee.length;
      if (nbCartes === 0 || largeurEcran === 0 || hauteurEcran === 0) {
        onTerminee();
        return;
      }

      const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
      const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

      const dispositionTriee = calculerDispositionMainJoueur({
        mode: "eventail",
        nbCartes: mainTriee.length,
        largeurEcran,
        hauteurEcran,
        largeurCarte,
        hauteurCarte,
      });

      const donneesCourantes = donneesWorkletSud.value;
      const nouvellesDonnees = [...donneesCourantes];
      const cartesSudTriees = mainTriee
        .map((carte) =>
          cartesAtlasSud.find((carteAtlas) => cartesSontEgales(carteAtlas.carte, carte)),
        )
        .filter((carteAtlas): carteAtlas is CarteAtlas => carteAtlas !== undefined);

      for (let indexTrie = 0; indexTrie < mainTriee.length; indexTrie += 1) {
        const carte = mainTriee[indexTrie];
        const indexSource = mainDistribuee.findIndex((carteDistribuee) =>
          cartesSontEgales(carteDistribuee, carte),
        );
        if (indexSource < 0) continue;

        const carteDisp = dispositionTriee.cartes[indexTrie];
        const arriveeTriee = calculerPointAncrageCarteMainJoueurNormalisee({
          x: carteDisp.x,
          decalageY: carteDisp.decalageY,
          largeurEcran,
          hauteurEcran,
          largeurCarte,
          hauteurCarte,
        });

        const offsetSource = indexSource * STRIDE;
        const offsetCible = indexTrie * STRIDE;
        const currentX = donneesCourantes[offsetSource + 4];
        const currentY = donneesCourantes[offsetSource + 5];
        const currentRot = donneesCourantes[offsetSource + 7];
        const currentEch = donneesCourantes[offsetSource + 9];

        nouvellesDonnees[offsetCible] = currentX;
        nouvellesDonnees[offsetCible + 1] = currentY;
        nouvellesDonnees[offsetCible + 2] = (currentX + arriveeTriee.x) / 2;
        nouvellesDonnees[offsetCible + 3] = (currentY + arriveeTriee.y) / 2;
        nouvellesDonnees[offsetCible + 4] = arriveeTriee.x;
        nouvellesDonnees[offsetCible + 5] = arriveeTriee.y;
        nouvellesDonnees[offsetCible + 6] = currentRot;
        nouvellesDonnees[offsetCible + 7] = carteDisp.angle;
        nouvellesDonnees[offsetCible + 8] = currentEch;
        nouvellesDonnees[offsetCible + 9] = currentEch;
      }

      const nbCartesCapture = nbCartes;
      const dureeReorg = ANIMATIONS.distribution.dureeReorganisationMain;
      runOnUI(() => {
        donneesWorkletSud.value = nouvellesDonnees;
        for (let i = 0; i < nbCartesCapture; i++) {
          progressionsSud[i].value = 0;
          progressionsSud[i].value = withTiming(1, {
            duration: dureeReorg,
            easing: EASING_OUT_CUBIC,
          });
        }
      })();

      const timeout = setTimeout(() => {
        if (cartesSudTriees.length === mainTriee.length) {
          setCartesAtlasSud(cartesSudTriees);
        }
        onTerminee();
      }, ANIMATIONS.distribution.dureeReorganisationMain);
      timeoutsCallbacksRef.current.push(timeout);
    },
    [cartesAtlasSud, progressionsSud, donneesWorkletSud],
  );

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
    animerTriSud,
    terminerDistribution,
    cartesAtlasAdversaires,
    cartesAtlasSud,
    progressionsAdv,
    donneesWorkletAdv,
    nbCartesActivesAdv,
    progressionsSud,
    donneesWorkletSud,
    nbCartesActivesSud,
    enCours,
  };
}
