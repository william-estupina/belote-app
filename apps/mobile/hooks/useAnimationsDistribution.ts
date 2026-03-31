import type { Carte, PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  Easing,
  makeMutable,
  type SharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import {
  calculerDispositionMainJoueur,
  calculerPositionCarteMainJoueurNormalisee,
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

const STRIDE = 10;
const MAX_CARTES = 32;
const MAX_CARTES_SUD = 8;
const OFFSET_ADVERSAIRES = 8;
const EASING_OUT_CUBIC = Easing.out(Easing.cubic);

interface OptionsDistribution {
  indexDonneur?: number;
  nbCartesExistantesSud?: number;
  nbCartesExistantesAdversaires?: Partial<Record<"nord" | "est" | "ouest", number>>;
  onPaquetDepart?: (position: PositionJoueur, cartes: Carte[]) => void;
  onPaquetArrive?: (position: PositionJoueur, cartes: Carte[]) => void;
  onTerminee?: () => void;
  cartesVisibles?: Carte[];
}

export interface ResultatAnimationsDistribution {
  lancerDistribution: (
    mains: Record<PositionJoueur, Carte[]>,
    options?: OptionsDistribution,
  ) => void;
  masquerCartesSud: () => void;
  terminerDistribution: () => void;
  cartesAtlas: CarteAtlas[];
  progressions: SharedValue<number>[];
  donneesWorklet: SharedValue<number[]>;
  nbCartesActives: SharedValue<number>;
  enCours: boolean;
}

function creerCarteAtlasInactive(
  index: number,
  largeurCellule: number,
  hauteurCellule: number,
): CarteAtlas {
  const rectSource = calculerVersoSource(largeurCellule, hauteurCellule);
  const joueur: PositionJoueur = index < OFFSET_ADVERSAIRES ? "sud" : "nord";

  return {
    carte: creerCarteFactice(index),
    joueur,
    depart: { x: 0.5, y: 0.5 },
    arrivee: { x: 0.5, y: 0.5 },
    controle: { x: 0.5, y: 0.5 },
    rotationDepart: 0,
    rotationArrivee: 0,
    echelleDepart: 1,
    echelleArrivee: 1,
    rectSource,
  };
}

function creerPoolCartesAtlas(
  largeurCellule: number,
  hauteurCellule: number,
): CarteAtlas[] {
  return Array.from({ length: MAX_CARTES }, (_, index) =>
    creerCarteAtlasInactive(index, largeurCellule, hauteurCellule),
  );
}

function ecrireDonneesCarte(
  donneesPlat: number[],
  slot: number,
  carteAtlas: CarteAtlas,
): void {
  const offset = slot * STRIDE;

  donneesPlat[offset] = carteAtlas.depart.x;
  donneesPlat[offset + 1] = carteAtlas.depart.y;
  donneesPlat[offset + 2] = carteAtlas.controle.x;
  donneesPlat[offset + 3] = carteAtlas.controle.y;
  donneesPlat[offset + 4] = carteAtlas.arrivee.x;
  donneesPlat[offset + 5] = carteAtlas.arrivee.y;
  donneesPlat[offset + 6] = carteAtlas.rotationDepart;
  donneesPlat[offset + 7] = carteAtlas.rotationArrivee;
  donneesPlat[offset + 8] = carteAtlas.echelleDepart;
  donneesPlat[offset + 9] = carteAtlas.echelleArrivee;
}

export function useAnimationsDistribution(
  atlas: AtlasCartes,
  dimensionsEcran: { largeur: number; hauteur: number },
): ResultatAnimationsDistribution {
  const [cartesAtlas, setCartesAtlas] = useState<CarteAtlas[]>(() =>
    creerPoolCartesAtlas(0, 0),
  );
  const [enCours, setEnCours] = useState(false);

  const progressionsRef = useRef<SharedValue<number>[]>(
    Array.from({ length: MAX_CARTES }, () => makeMutable(-1)),
  );
  const progressions = progressionsRef.current;
  const donneesWorkletRef = useRef<SharedValue<number[]>>(
    makeMutable(new Array(MAX_CARTES * STRIDE).fill(0)),
  );
  const donneesWorklet = donneesWorkletRef.current;
  const nbCartesActivesRef = useRef<SharedValue<number>>(makeMutable(0));
  const nbCartesActives = nbCartesActivesRef.current;

  const timeoutsCallbacksRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const appelEnAttenteRef = useRef<{
    mains: Record<PositionJoueur, Carte[]>;
    options?: OptionsDistribution;
  } | null>(null);

  const masquerCartesSud = useCallback(() => {
    for (let index = 0; index < MAX_CARTES_SUD; index += 1) {
      progressions[index].value = -1;
    }
  }, [progressions]);

  const lancerDistribution = useCallback(
    (mains: Record<PositionJoueur, Carte[]>, options?: OptionsDistribution) => {
      for (const timeout of timeoutsCallbacksRef.current) {
        clearTimeout(timeout);
      }
      timeoutsCallbacksRef.current = [];

      const { distribution } = ANIMATIONS;
      const { largeurCellule, hauteurCellule } = atlas;
      const { largeur: largeurEcran, hauteur: hauteurEcran } = dimensionsEcran;
      const doitAttendreImage = Platform.OS !== "web";

      if (
        (doitAttendreImage && !atlas.image) ||
        largeurCellule === 0 ||
        largeurEcran === 0 ||
        hauteurEcran === 0
      ) {
        appelEnAttenteRef.current = { mains, options };
        return;
      }
      appelEnAttenteRef.current = null;

      const nbCartesParJoueur = Math.max(
        ...POSITIONS_JOUEUR.map((position) => mains[position].length),
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

      const cartesParSlot = creerPoolCartesAtlas(largeurCellule, hauteurCellule);
      const donneesPlat = new Array(MAX_CARTES * STRIDE).fill(0);
      const delaisParSlot: Array<{ delai: number; duree: number } | null> = Array.from(
        { length: MAX_CARTES },
        () => null,
      );
      const slotsUtilises: number[] = [];
      const slotsAdversairesDejaVisibles: number[] = [];

      const { ecartX, ecartRotation } = distribution.eventailVol;
      const decalage = distribution.arcDistribution.decalagePerpendiculaire;
      const indexDonneur = options?.indexDonneur ?? 0;
      const nbCartesExistantesSud = options?.nbCartesExistantesSud ?? 0;
      const nbCartesExistantesAdv = options?.nbCartesExistantesAdversaires ?? {};
      const ordreDistribution = obtenirOrdreDistribution(indexDonneur);
      const origineDistribution = obtenirOrigineDistribution(indexDonneur);
      const delaiPremierPaquetParPosition: Partial<Record<PositionJoueur, number>> = {};

      let tempsSimulation = 0;
      let indexCarteSimulation = 0;

      for (let p = 0; p < taillesPaquets.length; p += 1) {
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

      let prochainSlotAdversaire = OFFSET_ADVERSAIRES;
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
          const slot = prochainSlotAdversaire;
          prochainSlotAdversaire += 1;

          const cibleDepart = ciblesExistantesDepart[index];
          const cibleArrivee = ciblesExistantesArrivee[index];
          const carteAtlas = {
            carte: creerCarteFactice(slot),
            joueur: position,
            depart: cibleDepart.arrivee,
            arrivee: cibleArrivee.arrivee,
            controle: {
              x: (cibleDepart.arrivee.x + cibleArrivee.arrivee.x) / 2,
              y: (cibleDepart.arrivee.y + cibleArrivee.arrivee.y) / 2,
            },
            rotationDepart: cibleDepart.rotationArrivee,
            rotationArrivee: cibleArrivee.rotationArrivee,
            echelleDepart: ECHELLE_MAIN_ADVERSE,
            echelleArrivee: ECHELLE_MAIN_ADVERSE,
            rectSource: calculerVersoSource(largeurCellule, hauteurCellule),
          } satisfies CarteAtlas;

          cartesParSlot[slot] = carteAtlas;
          ecrireDonneesCarte(donneesPlat, slot, carteAtlas);
          delaisParSlot[slot] = { delai: delaiAnimation, duree: distribution.dureeCarte };
          slotsUtilises.push(slot);
          slotsAdversairesDejaVisibles.push(slot);
        }
      }

      let temps = 0;
      let indexCarte = 0;
      let prochainSlotSud = 0;
      const paquetsCallback: Array<{
        slots: number[];
        estSud: boolean;
        position: PositionJoueur;
        cartes: Carte[];
        delaiDepartMs: number;
      }> = [];

      for (let p = 0; p < taillesPaquets.length; p += 1) {
        const taillePaquet = taillesPaquets[p];
        if (p > 0) temps += distribution.pauseEntreRounds;

        for (const position of ordreDistribution) {
          const cartesJoueur = mains[position];
          const cartesDuPaquet: Carte[] = [];
          for (
            let c = 0;
            c < taillePaquet && indexCarte + c < cartesJoueur.length;
            c += 1
          ) {
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
          const positionAdversaire = position as "nord" | "est" | "ouest";
          const nbExistantesPosition = nbCartesExistantesAdv[positionAdversaire] ?? 0;
          const ciblesAdversaire =
            position !== "sud"
              ? calculerCiblesEventailAdversaire(
                  positionAdversaire,
                  nbExistantesPosition + indexCarte,
                  nbCartesPaquet,
                  nbExistantesPosition + mains[position].length,
                  largeurEcran,
                  hauteurEcran,
                )
              : null;
          const cibleDistribution = obtenirCibleDistributionAtlas(position);
          const dx = cibleDistribution.arrivee.x - origineDistribution.x;
          const dy = cibleDistribution.arrivee.y - origineDistribution.y;
          const angle = Math.atan2(dy, dx);
          const perpX = -Math.sin(angle);
          const perpY = Math.cos(angle);
          const estSud = position === "sud";
          const slotsPaquet: number[] = [];

          for (let idx = 0; idx < cartesDuPaquet.length; idx += 1) {
            const slot = estSud ? prochainSlotSud++ : prochainSlotAdversaire++;
            const carte = cartesDuPaquet[idx];
            const centre = (nbCartesPaquet - 1) / 2;
            const offsetIdx = idx - centre;
            const depart: PointNormalise = {
              x: origineDistribution.x + offsetIdx * ecartX * perpX,
              y: origineDistribution.y + offsetIdx * ecartX * perpY,
            };
            const dispositionCarteSud =
              estSud && dispositionSud
                ? dispositionSud.cartes[nbCartesExistantesSud + indexCarte + idx]
                : null;
            const cibleAdversaire = ciblesAdversaire?.[idx] ?? null;
            const arrivee: PointNormalise =
              estSud && dispositionCarteSud
                ? calculerPositionCarteMainJoueurNormalisee({
                    x: dispositionCarteSud.x,
                    decalageY: dispositionCarteSud.decalageY,
                    largeurEcran,
                    hauteurEcran,
                    largeurCarte,
                    hauteurCarte,
                  })
                : cibleAdversaire
                  ? cibleAdversaire.arrivee
                  : cibleDistribution.arrivee;
            const rectSource =
              (options?.cartesVisibles?.some(
                (carteVisible) =>
                  carteVisible.couleur === carte.couleur &&
                  carteVisible.rang === carte.rang,
              ) ?? false)
                ? calculerRectoSource(
                    largeurCellule,
                    hauteurCellule,
                    carte.couleur,
                    carte.rang,
                  )
                : calculerVersoSource(largeurCellule, hauteurCellule);

            const carteAtlas = {
              carte,
              joueur: position,
              depart,
              arrivee,
              controle: calculerPointArc(depart, arrivee, decalage),
              rotationDepart: offsetIdx * ecartRotation,
              rotationArrivee:
                estSud && dispositionCarteSud
                  ? dispositionCarteSud.angle
                  : cibleAdversaire
                    ? cibleAdversaire.rotationArrivee
                    : cibleDistribution.rotationArrivee,
              echelleDepart: 0.5,
              echelleArrivee:
                estSud && dispositionCarteSud ? 1 : cibleDistribution.echelleArrivee,
              rectSource,
            } satisfies CarteAtlas;

            cartesParSlot[slot] = carteAtlas;
            ecrireDonneesCarte(donneesPlat, slot, carteAtlas);
            delaisParSlot[slot] = { delai: delaiPaquet, duree: distribution.dureeCarte };
            slotsUtilises.push(slot);
            slotsPaquet.push(slot);
          }

          paquetsCallback.push({
            slots: slotsPaquet,
            estSud,
            position,
            cartes: [...cartesDuPaquet],
            delaiDepartMs: delaiPaquet,
          });
          temps += distribution.delaiEntreJoueurs;
        }

        indexCarte += taillePaquet;
      }

      setCartesAtlas(cartesParSlot);
      setEnCours(true);
      donneesWorklet.value = donneesPlat;

      for (let slot = 0; slot < MAX_CARTES; slot += 1) {
        progressions[slot].value = -1;
      }
      for (const slot of slotsAdversairesDejaVisibles) {
        progressions[slot].value = 0;
      }

      nbCartesActives.value =
        slotsUtilises.length > 0 ? Math.max(...slotsUtilises) + 1 : 0;

      let delaiFinDistributionMs = 0;
      const paquetsSud = paquetsCallback.filter((paquet) => paquet.estSud);

      for (const paquet of paquetsCallback) {
        if (options?.onPaquetDepart) {
          const timeoutDepart = setTimeout(() => {
            options.onPaquetDepart?.(paquet.position, paquet.cartes);
          }, paquet.delaiDepartMs);
          timeoutsCallbacksRef.current.push(timeoutDepart);
        }

        const dernierSlot = paquet.slots[paquet.slots.length - 1];
        const delaiCarte = dernierSlot === undefined ? null : delaisParSlot[dernierSlot];
        if (!delaiCarte) continue;

        const delaiArriveeMs = delaiCarte.delai + delaiCarte.duree;
        delaiFinDistributionMs = Math.max(delaiFinDistributionMs, delaiArriveeMs);

        const timeoutArrivee = setTimeout(() => {
          options?.onPaquetArrive?.(paquet.position, paquet.cartes);
        }, delaiArriveeMs);
        timeoutsCallbacksRef.current.push(timeoutArrivee);
      }

      for (let indexPaquet = 0; indexPaquet < paquetsSud.length - 1; indexPaquet += 1) {
        const paquetSud = paquetsSud[indexPaquet];
        const paquetSudSuivant = paquetsSud[indexPaquet + 1];
        const timeoutMasquage = setTimeout(() => {
          for (const slot of paquetSud.slots) {
            progressions[slot].value = -1;
          }
        }, paquetSudSuivant.delaiDepartMs);
        timeoutsCallbacksRef.current.push(timeoutMasquage);
      }

      const dernierPaquetSud = paquetsSud[paquetsSud.length - 1] ?? null;
      const timeoutFin = setTimeout(() => {
        if (dernierPaquetSud) {
          for (const slot of dernierPaquetSud.slots) {
            progressions[slot].value = -1;
          }
        }
        options?.onTerminee?.();
      }, delaiFinDistributionMs + 100);
      timeoutsCallbacksRef.current.push(timeoutFin);

      for (const slot of slotsUtilises) {
        const delaiCarte = delaisParSlot[slot];
        if (!delaiCarte) continue;
        progressions[slot].value = withDelay(
          delaiCarte.delai,
          withTiming(1, {
            duration: delaiCarte.duree,
            easing: EASING_OUT_CUBIC,
          }),
        );
      }
    },
    [atlas, dimensionsEcran, donneesWorklet, nbCartesActives, progressions],
  );

  const terminerDistribution = useCallback(() => {
    setEnCours(false);
  }, []);

  useEffect(() => {
    const appelEnAttente = appelEnAttenteRef.current;
    if ((Platform.OS === "web" || atlas.image) && appelEnAttente) {
      appelEnAttenteRef.current = null;
      lancerDistribution(appelEnAttente.mains, appelEnAttente.options);
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
    masquerCartesSud,
    terminerDistribution,
    cartesAtlas,
    progressions,
    donneesWorklet,
    nbCartesActives,
    enCours,
  };
}
