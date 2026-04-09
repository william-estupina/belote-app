import type { Carte, Couleur, PositionJoueur } from "@belote/shared-types";
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
import { SLOTS_ADVERSAIRES, STRIDE_UNIFIE } from "../constants/canvas-unifie";
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
import { construireGlissementCarteDepuisEtatCourant } from "./glissementCartes";
import type { AtlasCartes } from "./useAtlasCartes";
import type { BufferCanvasUnifie } from "./useBufferCanvasUnifie";
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

type PositionAdverse = "nord" | "est" | "ouest";

interface OptionsLancerDistribution {
  indexDonneur?: number;
  cartesExistantesSud?: Carte[];
  nbCartesExistantesSud?: number;
  nbCartesExistantesAdversaires?: Partial<Record<PositionAdverse, number>>;
  onPaquetDepart?: (position: PositionJoueur, cartes: Carte[]) => void;
  onPaquetArrive?: (position: PositionJoueur, cartes: Carte[]) => void;
  onTerminee?: () => void;
  /** Appelé après l'animation de tri par couleur (ou immédiatement si pas de tri) */
  onTriSudTermine?: () => void;
  cartesVisibles?: Carte[];
  /** Désactive l'animation de tri des cartes sud (tri reporté après retournement) */
  desactiverTri?: boolean;
}

interface DelaiAnimationCarte {
  delai: number;
  duree: number;
}

interface PaquetCallbackDistribution {
  indexPremiereCartePool: number;
  indexDerniereCartePool: number;
  estSud: boolean;
  position: PositionJoueur;
  cartes: Carte[];
  delaiDepartMs: number;
}

export interface ResultatAnimationsDistribution {
  lancerDistribution: (
    mains: Record<PositionJoueur, Carte[]>,
    options?: OptionsLancerDistribution,
  ) => void;
  /** Signale la fin de la distribution (retire le canvas). */
  terminerDistribution: () => void;
  cartesAtlasSud: CarteAtlas[];
  /** Pool sud — SharedValues pour DistributionCanvasSud */
  progressionsSud: SharedValue<number>[];
  donneesWorkletSud: SharedValue<number[]>;
  nbCartesActivesSud: SharedValue<number>;
  /** Z-indices du pool sud — mis à jour au lancement du tri pour préserver l'ordre de rendu */
  zIndexesSud: SharedValue<number>[];
  enCours: boolean;
}

const MAX_CARTES_ADV = 24; // 8 cartes × 3 adversaires
const MAX_CARTES_SUD = 8;
const EASING_OUT_CUBIC = Easing.out(Easing.cubic);

function creerBufferWorklet(taille: number, donnees: number[]): number[] {
  const buffer = new Array(taille).fill(0);
  for (let index = 0; index < donnees.length; index += 1) {
    buffer[index] = donnees[index];
  }

  return buffer;
}

/**
 * Écrit les données adversaires (STRIDE=10) dans le buffer unifié (STRIDE=14)
 * aux offsets des slots adversaires (début à SLOTS_ADVERSAIRES.debut).
 */
function ecrireAdvDansBufferUnifie(
  bufferActuel: number[],
  donneesPlatAdv: number[],
  nbCartesAdv: number,
): number[] {
  const resultat = [...bufferActuel];
  for (let i = 0; i < nbCartesAdv; i += 1) {
    const srcOffset = i * STRIDE;
    const destOffset = (SLOTS_ADVERSAIRES.debut + i) * STRIDE_UNIFIE;
    for (let j = 0; j < STRIDE; j += 1) {
      resultat[destOffset + j] = donneesPlatAdv[srcOffset + j];
    }
  }
  return resultat;
}

function reinitialiserProgressions(
  progressions: SharedValue<number>[],
  valeur: number,
): void {
  for (let index = 0; index < progressions.length; index += 1) {
    progressions[index].value = valeur;
  }
}

function extrairePaquetsSud(paquets: PaquetCallbackDistribution[]): {
  paquetsSud: PaquetCallbackDistribution[];
  indicesSudParPaquet: Array<{ debut: number; fin: number }>;
} {
  const paquetsSud: PaquetCallbackDistribution[] = [];
  const indicesSudParPaquet: Array<{ debut: number; fin: number }> = [];
  let indexDebutPaquetSudCourant = 0;

  for (const paquet of paquets) {
    if (!paquet.estSud) {
      continue;
    }

    indicesSudParPaquet.push({
      debut: indexDebutPaquetSudCourant,
      fin: paquet.indexDerniereCartePool,
    });
    indexDebutPaquetSudCourant = paquet.indexDerniereCartePool + 1;
    paquetsSud.push(paquet);
  }

  return { paquetsSud, indicesSudParPaquet };
}

/**
 * Hook d'orchestration de la distribution via Skia Atlas.
 * Utilise withDelay natif Reanimated pour orchestrer sur le UI thread.
 * Les adversaires écrivent directement dans le buffer unifié (slots 4-27).
 * Le pool sud reste local (sera migré dans une étape ultérieure).
 */
export function useAnimationsDistribution(
  atlas: AtlasCartes,
  dimensionsEcran: { largeur: number; hauteur: number },
  bufferUnifie: BufferCanvasUnifie,
): ResultatAnimationsDistribution {
  const [cartesAtlasSud, setCartesAtlasSud] = useState<CarteAtlas[]>([]);
  const [enCours, setEnCours] = useState(false);

  // Les adversaires utilisent le buffer unifié directement.
  // On crée un slice des progressions pour garder des indices locaux (0-23).
  const progressionsAdvRef = useRef<SharedValue<number>[]>([]);
  if (progressionsAdvRef.current.length === 0 && bufferUnifie.progressions.length > 0) {
    progressionsAdvRef.current = bufferUnifie.progressions.slice(
      SLOTS_ADVERSAIRES.debut,
      SLOTS_ADVERSAIRES.debut + MAX_CARTES_ADV,
    );
  }
  const progressionsAdv = progressionsAdvRef.current;

  // Pool sud
  const progressionsSudRef = useRef<SharedValue<number>[]>(
    Array.from({ length: MAX_CARTES_SUD }, () => makeMutable(0)),
  );
  const progressionsSud = progressionsSudRef.current;
  const zIndexesSudRef = useRef<SharedValue<number>[]>(
    Array.from({ length: MAX_CARTES_SUD }, (_, i) => makeMutable(i)),
  );
  const zIndexesSud = zIndexesSudRef.current;
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
    options?: OptionsLancerDistribution;
  } | null>(null);

  const viderTimeouts = useCallback(() => {
    for (const timeout of timeoutsCallbacksRef.current) {
      clearTimeout(timeout);
    }
    timeoutsCallbacksRef.current = [];
  }, []);

  const lancerDistribution = useCallback(
    (mains: Record<PositionJoueur, Carte[]>, options?: OptionsLancerDistribution) => {
      viderTimeouts();

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
      const delaisCartesAdv: DelaiAnimationCarte[] = [];
      const delaisCartesSud: DelaiAnimationCarte[] = [];

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
          const glissement = construireGlissementCarteDepuisEtatCourant({
            depart: {
              x: cibleDepart.arrivee.x,
              y: cibleDepart.arrivee.y,
              rotation: cibleDepart.rotationArrivee,
              echelle: ECHELLE_MAIN_ADVERSE,
            },
            arrivee: {
              x: cibleArrivee.arrivee.x,
              y: cibleArrivee.arrivee.y,
              rotation: cibleArrivee.rotationArrivee,
              echelle: ECHELLE_MAIN_ADVERSE,
            },
          });

          cartesAdv.push({
            carte: creerCarteFactice(indexCarteCachee),
            joueur: position,
            depart: { x: glissement.depart.x, y: glissement.depart.y },
            arrivee: { x: glissement.arrivee.x, y: glissement.arrivee.y },
            controle: glissement.controle,
            rotationDepart: glissement.depart.rotation,
            rotationArrivee: glissement.arrivee.rotation,
            echelleDepart: ECHELLE_MAIN_ADVERSE,
            echelleArrivee: ECHELLE_MAIN_ADVERSE,
            rectSource: calculerVersoSource(largeurCellule, hauteurCellule),
          });
          donneesPlatAdv.push(
            glissement.depart.x,
            glissement.depart.y,
            glissement.controle.x,
            glissement.controle.y,
            glissement.arrivee.x,
            glissement.arrivee.y,
            glissement.depart.rotation,
            glissement.arrivee.rotation,
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
          const glissement = construireGlissementCarteDepuisEtatCourant({
            depart: {
              x: depart.x,
              y: depart.y,
              rotation: carteDepart.angle,
              echelle: 1,
            },
            arrivee: {
              x: arrivee.x,
              y: arrivee.y,
              rotation: carteArrivee.angle,
              echelle: 1,
            },
          });

          cartesSud.push({
            carte,
            joueur: "sud",
            depart: { x: glissement.depart.x, y: glissement.depart.y },
            arrivee: { x: glissement.arrivee.x, y: glissement.arrivee.y },
            controle: glissement.controle,
            rotationDepart: glissement.depart.rotation,
            rotationArrivee: glissement.arrivee.rotation,
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
            glissement.depart.x,
            glissement.depart.y,
            glissement.controle.x,
            glissement.controle.y,
            glissement.arrivee.x,
            glissement.arrivee.y,
            glissement.depart.rotation,
            glissement.arrivee.rotation,
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
      const paquetsCallback: PaquetCallbackDistribution[] = [];

      for (let p = 0; p < taillesPaquets.length; p++) {
        const taillePaquet = taillesPaquets[p];
        const dureeCartePaquet =
          p === 0 ? distribution.dureeCarte : distribution.dureeCarteSecondTour;
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
          const indexPremiereCartePool =
            position === "sud" ? cartesSud.length : cartesAdv.length;
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
                  existAdv + indexCarte + nbCartesPaquet,
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
                duree: dureeCartePaquet,
              });
            } else {
              cartesAdv.push(carteAtlas);
              donneesPlatAdv.push(...donneesCarteFlat);
              delaisCartesAdv.push({
                delai: delaiPaquet,
                duree: dureeCartePaquet,
              });
            }
          }

          // Tracker la dernière carte du paquet pour le callback
          paquetsCallback.push({
            indexPremiereCartePool,
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
      setCartesAtlasSud(cartesSud);
      setEnCours(true);

      // Mettre à jour les sprites adversaires dans le buffer unifié
      for (let i = 0; i < cartesAdv.length; i += 1) {
        bufferUnifie.mettreAJourSprite(
          SLOTS_ADVERSAIRES.debut + i,
          cartesAdv[i].rectSource,
        );
      }

      // Mettre à jour les données worklet — adversaires dans le buffer unifié
      bufferUnifie.donneesWorklet.value = ecrireAdvDansBufferUnifie(
        bufferUnifie.donneesWorklet.value,
        donneesPlatAdv,
        cartesAdv.length,
      );

      // Mettre à jour les données worklet — pool sud
      donneesWorkletSud.value = creerBufferWorklet(
        MAX_CARTES_SUD * STRIDE,
        donneesPlatSud,
      );
      nbCartesActivesSud.value = cartesSud.length;

      // Réinitialiser les progressions :
      // -1 = en attente, [0..1] = en vol, 1 = arrivée (reste visible)
      reinitialiserProgressions(progressionsAdv, -1);
      reinitialiserProgressions(progressionsSud, -1);

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
      // jusqu'au handoff final piloté par le contrôleur.
      let delaiFinDistributionMs = 0;

      // Indexer les paquets sud et leurs plages dans le pool
      const { paquetsSud, indicesSudParPaquet } = extrairePaquetsSud(paquetsCallback);

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
          const glissement = construireGlissementCarteDepuisEtatCourant({
            depart: {
              x: departX,
              y: departY,
              rotation: rotationCourante,
              echelle: echelleCourante,
            },
            arrivee: {
              x: nouvelleArrivee.x,
              y: nouvelleArrivee.y,
              rotation: carteDisp.angle,
              echelle: echelleCourante,
            },
          });
          shiftDonnees.push(
            glissement.depart.x,
            glissement.depart.y,
            glissement.controle.x,
            glissement.controle.y,
            glissement.arrivee.x,
            glissement.arrivee.y,
            glissement.depart.rotation,
            glissement.arrivee.rotation,
            glissement.depart.echelle,
            glissement.arrivee.echelle,
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

      for (const position of ["nord", "ouest", "est"] as const) {
        const nbCartesExistantesPosition = nbCartesExistantesAdv[position] ?? 0;
        if (nbCartesExistantesPosition !== 0) {
          continue;
        }

        const paquetsPosition = paquetsCallback.filter(
          (paquet) => !paquet.estSud && paquet.position === position,
        );
        if (paquetsPosition.length < 2) {
          continue;
        }

        const premierPaquet = paquetsPosition[0];
        const secondPaquet = paquetsPosition[1];
        const nbCartesPremierPaquet = premierPaquet.cartes.length;
        const nbCartesTotal = mains[position].length;
        const ciblesPremierPaquet = calculerCiblesEventailAdversaire(
          position,
          0,
          nbCartesPremierPaquet,
          nbCartesTotal,
          largeurEcran,
          hauteurEcran,
        );

        const shiftDonnees: number[] = [];
        for (
          let i = premierPaquet.indexPremiereCartePool;
          i <= premierPaquet.indexDerniereCartePool;
          i++
        ) {
          const indexCartePaquet = i - premierPaquet.indexPremiereCartePool;
          const cible = ciblesPremierPaquet[indexCartePaquet];
          const offset = i * STRIDE;
          const departX = donneesPlatAdv[offset + 4];
          const departY = donneesPlatAdv[offset + 5];
          const rotationCourante = donneesPlatAdv[offset + 7];
          const echelleCourante = donneesPlatAdv[offset + 9];
          const glissement = construireGlissementCarteDepuisEtatCourant({
            depart: {
              x: departX,
              y: departY,
              rotation: rotationCourante,
              echelle: echelleCourante,
            },
            arrivee: {
              x: cible.arrivee.x,
              y: cible.arrivee.y,
              rotation: cible.rotationArrivee,
              echelle: echelleCourante,
            },
          });
          shiftDonnees.push(
            glissement.depart.x,
            glissement.depart.y,
            glissement.controle.x,
            glissement.controle.y,
            glissement.arrivee.x,
            glissement.arrivee.y,
            glissement.depart.rotation,
            glissement.arrivee.rotation,
            glissement.depart.echelle,
            glissement.arrivee.echelle,
          );
        }

        const timeoutDecalage = setTimeout(() => {
          const donneesCourantes = bufferUnifie.donneesWorklet.value;
          const nouvellesDonnees = [...donneesCourantes];
          for (
            let i = premierPaquet.indexPremiereCartePool;
            i <= premierPaquet.indexDerniereCartePool;
            i++
          ) {
            const sdOffset = (i - premierPaquet.indexPremiereCartePool) * STRIDE;
            const poolOffset = (SLOTS_ADVERSAIRES.debut + i) * STRIDE_UNIFIE;
            for (let j = 0; j < STRIDE; j++) {
              nouvellesDonnees[poolOffset + j] = shiftDonnees[sdOffset + j];
            }
          }
          const debut = premierPaquet.indexPremiereCartePool;
          const fin = premierPaquet.indexDerniereCartePool;
          const duree = distribution.dureeCarte;
          runOnUI(() => {
            bufferUnifie.donneesWorklet.value = nouvellesDonnees;
            for (let i = debut; i <= fin; i++) {
              progressionsAdv[i].value = 0;
              progressionsAdv[i].value = withTiming(1, {
                duration: duree,
                easing: EASING_OUT_CUBIC,
              });
            }
          })();
        }, secondPaquet.delaiDepartMs);
        timeoutsCallbacksRef.current.push(timeoutDecalage);
      }

      // Callback de fin : notifier la fin de distribution.
      // Les cartes sud ne sont PAS masquées ici pour éviter tout trou visuel.
      // Note : setEnCours(false) n'est PAS appelé ici — c'est le contrôleur
      // qui appelle terminerDistribution() au moment du handoff final.
      if (options?.onTerminee) {
        const DELAI_SECURITE_DEMONTAGE = 100;
        const delaiFinMs = delaiFinDistributionMs + DELAI_SECURITE_DEMONTAGE;
        const timeoutFin = setTimeout(() => {
          options?.onTerminee?.();
        }, delaiFinMs);
        timeoutsCallbacksRef.current.push(timeoutFin);
      }

      // Animation de tri par couleur : après les 5 premières cartes, et après les 8 cartes
      const ORDRE_COULEURS_TRI: Couleur[] = ["pique", "coeur", "carreau", "trefle"];
      const doitTrier =
        !options?.desactiverTri &&
        ((cartesExistantesSud.length === 0 && cartesSud.length === 5) ||
          cartesSud.length === 8);
      let dureeTri = 0;

      if (doitTrier) {
        const nbCartesTri = cartesSud.length;

        // Déterminer le slot trié pour chaque pool index.
        // Après distribution, pool index i est au slot i dans le layout N cartes.
        const sortedBySlot = cartesSud
          .map((ca, poolIndex) => ({ poolIndex, couleur: ca.carte.couleur }))
          .sort(
            (a, b) =>
              ORDRE_COULEURS_TRI.indexOf(a.couleur) -
              ORDRE_COULEURS_TRI.indexOf(b.couleur),
          );

        const newSlotForPoolIndex: number[] = new Array(nbCartesTri);
        for (let newSlot = 0; newSlot < nbCartesTri; newSlot++) {
          newSlotForPoolIndex[sortedBySlot[newSlot].poolIndex] = newSlot;
        }

        const dejaTriee = newSlotForPoolIndex.every(
          (slot, poolIndex) => slot === poolIndex,
        );

        if (!dejaTriee) {
          dureeTri = distribution.dureeTri;
          const largeurCarteTri = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
          const hauteurCarteTri = Math.round(largeurCarteTri * RATIO_ASPECT_CARTE);
          const dispositionTri = calculerDispositionMainJoueur({
            mode: "eventail",
            nbCartes: nbCartesTri,
            largeurEcran,
            hauteurEcran,
            largeurCarte: largeurCarteTri,
            hauteurCarte: hauteurCarteTri,
          });

          // Géométrie pour chaque pool index : depart = slot courant, arrivee = slot trié
          const triDonnees: number[][] = new Array(nbCartesTri);
          for (let i = 0; i < nbCartesTri; i++) {
            const newSlot = newSlotForPoolIndex[i];
            const carteDispDepart = dispositionTri.cartes[i];
            const posDepart = calculerPointAncrageCarteMainJoueurNormalisee({
              x: carteDispDepart.x,
              decalageY: carteDispDepart.decalageY,
              largeurEcran,
              hauteurEcran,
              largeurCarte: largeurCarteTri,
              hauteurCarte: hauteurCarteTri,
            });
            const carteDispArrivee = dispositionTri.cartes[newSlot];
            const posArrivee = calculerPointAncrageCarteMainJoueurNormalisee({
              x: carteDispArrivee.x,
              decalageY: carteDispArrivee.decalageY,
              largeurEcran,
              hauteurEcran,
              largeurCarte: largeurCarteTri,
              hauteurCarte: hauteurCarteTri,
            });
            triDonnees[i] = [
              posDepart.x,
              posDepart.y,
              (posDepart.x + posArrivee.x) / 2,
              (posDepart.y + posArrivee.y) / 2,
              posArrivee.x,
              posArrivee.y,
              carteDispDepart.angle,
              carteDispArrivee.angle,
              1,
              1,
            ];
          }

          const timeoutTri = setTimeout(() => {
            // Mettre à jour les z-indices avant l'animation : la carte qui va au slot j
            // doit être rendue au-dessus de celle qui va au slot j-1.
            for (let i = 0; i < nbCartesTri; i++) {
              zIndexesSud[i].value = newSlotForPoolIndex[i];
            }

            const nouvellesDonnees = new Array(MAX_CARTES_SUD * STRIDE).fill(0);
            for (let i = 0; i < nbCartesTri; i++) {
              const poolOffset = i * STRIDE;
              const td = triDonnees[i];
              for (let j = 0; j < STRIDE; j++) {
                nouvellesDonnees[poolOffset + j] = td[j];
              }
            }
            const duree = dureeTri;
            runOnUI(() => {
              donneesWorkletSud.value = nouvellesDonnees;
              for (let i = 0; i < nbCartesTri; i++) {
                progressionsSud[i].value = 0;
                progressionsSud[i].value = withTiming(1, {
                  duration: duree,
                  easing: EASING_OUT_CUBIC,
                });
              }
            })();
          }, delaiFinDistributionMs);
          timeoutsCallbacksRef.current.push(timeoutTri);
        }
      }

      if (options?.onTriSudTermine) {
        const DELAI_SECURITE_TRI = 50;
        const delaiTriTermine = delaiFinDistributionMs + dureeTri + DELAI_SECURITE_TRI;
        const timeoutTriTermine = setTimeout(() => {
          options?.onTriSudTermine?.();
        }, delaiTriTermine);
        timeoutsCallbacksRef.current.push(timeoutTriTermine);
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
      viderTimeouts,
      progressionsAdv,
      bufferUnifie,
      progressionsSud,
      donneesWorkletSud,
      nbCartesActivesSud,
    ],
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
      viderTimeouts();
    };
  }, [viderTimeouts]);

  return {
    lancerDistribution,
    terminerDistribution,
    cartesAtlasSud,
    progressionsSud,
    donneesWorkletSud,
    nbCartesActivesSud,
    zIndexesSud,
    enCours,
  };
}
