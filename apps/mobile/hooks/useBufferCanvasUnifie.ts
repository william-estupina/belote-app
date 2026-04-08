// Hook central du canvas Skia unifié — gère le buffer, sprites, colors et SharedValues

import type { Carte } from "@belote/shared-types";
import { rect, Skia, type SkRect } from "@shopify/react-native-skia";
import { useCallback, useRef } from "react";
import { makeMutable, type SharedValue } from "react-native-reanimated";

import { calculerGeometriePilePlis } from "../components/game/pile-plis-geometrie";
import { calculerDispositionReserveCentrale } from "../components/game/reserve-centrale-disposition";
import {
  MAX_CARTES_MAIN,
  MAX_SLOTS_ANIMATION,
  MAX_SLOTS_ATLAS,
  OFFSET,
  SLOTS_ADVERSAIRES,
  SLOTS_ANIMATIONS,
  SLOTS_MAIN,
  SLOTS_PILES,
  SLOTS_RESERVE,
  STRIDE_UNIFIE,
} from "../constants/canvas-unifie";
import { POSITIONS_PILES, RATIO_LARGEUR_CARTE } from "../constants/layout";
import {
  calculerRectoSource,
  calculerVersoSource,
  type RectSource,
} from "./distributionAtlas";
import {
  calculerCiblesEventailAdversaire,
  ECHELLE_MAIN_ADVERSE,
} from "./distributionLayoutAtlas";
import type { AtlasCartes } from "./useAtlasCartes";

// --- Types ---

export interface ValeursAnimationMainJoueur {
  x: SharedValue<number>[];
  decalageY: SharedValue<number>[];
  angle: SharedValue<number>[];
  echelle: SharedValue<number>[];
}

export interface EtatFlip {
  actif: boolean;
  progres: SharedValue<number>;
  /** Sprite source courant (dos ou face) */
  spriteSource: SkRect;
  /** Position et dimensions en pixels */
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

export interface BufferCanvasUnifie {
  donneesWorklet: SharedValue<number[]>;
  progressions: SharedValue<number>[];
  sprites: SkRect[];
  colors: Float32Array[];
  valeursMain: ValeursAnimationMainJoueur;
  flip: EtatFlip | null;
  // Fonctions de mise à jour
  mettreAJourPiles: (
    nbPlis1: number,
    nbPlis2: number,
    largeurEcran: number,
    hauteurEcran: number,
  ) => void;
  mettreAJourReserve: (
    afficherPaquet: boolean,
    carteRetournee: Carte | null,
    largeurEcran: number,
    hauteurEcran: number,
  ) => void;
  mettreAJourAdversaires: (
    nbParPosition: { nord: number; est: number; ouest: number },
    largeurEcran: number,
    hauteurEcran: number,
  ) => void;
  mettreAJourMainJoueurSprites: (cartes: Carte[], cartesJouables?: Carte[]) => void;
  parquerSlot: (index: number) => void;
  ecrireSlotStatique: (
    index: number,
    x: number,
    y: number,
    rotation: number,
    echelle: number,
  ) => void;
  mettreAJourSprite: (index: number, rectSrc: RectSource) => void;
  allouerSlotAnimation: () => number | null;
  libererSlotAnimation: (index: number) => void;
  ecrireSlotAnime: (index: number, donnees: DonneesSlotAnime) => void;
}

export interface DonneesSlotAnime {
  departX: number;
  departY: number;
  controleX: number;
  controleY: number;
  arriveeX: number;
  arriveeY: number;
  rotDepart: number;
  rotArrivee: number;
  echDepart: number;
  echArrivee: number;
}

// --- Couleurs pour le grisé ---

const COULEUR_NORMALE = Skia.Color("white");
const COULEUR_GRISEE = Skia.Color("rgba(140, 140, 140, 1)");

// --- Helpers ---

function convertirRectSource(source: RectSource): SkRect {
  return rect(source.x, source.y, source.width, source.height);
}

function creerValeursMain(): ValeursAnimationMainJoueur {
  return {
    x: Array.from({ length: MAX_CARTES_MAIN }, () => makeMutable(-10000)),
    decalageY: Array.from({ length: MAX_CARTES_MAIN }, () => makeMutable(0)),
    angle: Array.from({ length: MAX_CARTES_MAIN }, () => makeMutable(0)),
    echelle: Array.from({ length: MAX_CARTES_MAIN }, () => makeMutable(1)),
  };
}

// --- Hook ---

export function useBufferCanvasUnifie(atlas: AtlasCartes): BufferCanvasUnifie {
  const { largeurCellule, hauteurCellule } = atlas;

  // Buffer worklet (44 × 14 = 616 valeurs)
  const donneesWorkletRef = useRef<SharedValue<number[]>>(
    makeMutable(new Array(MAX_SLOTS_ATLAS * STRIDE_UNIFIE).fill(0)),
  );
  const donneesWorklet = donneesWorkletRef.current;

  // Progressions (44 SharedValues, initialisées à -1 = inactif)
  const progressionsRef = useRef<SharedValue<number>[]>(
    Array.from({ length: MAX_SLOTS_ATLAS }, () => makeMutable(-1)),
  );
  const progressions = progressionsRef.current;

  // Sprites (44 SkRect, initialisés au dos)
  const spritesRef = useRef<SkRect[]>([]);
  if (spritesRef.current.length === 0 && largeurCellule > 0) {
    const dos = convertirRectSource(calculerVersoSource(largeurCellule, hauteurCellule));
    spritesRef.current = Array.from({ length: MAX_SLOTS_ATLAS }, () => dos);
  }
  const sprites = spritesRef.current;

  // Colors (44 couleurs, initialisées à blanc)
  const colorsRef = useRef<Float32Array[]>([]);
  if (colorsRef.current.length === 0) {
    colorsRef.current = Array.from({ length: MAX_SLOTS_ATLAS }, () => COULEUR_NORMALE);
  }
  const colors = colorsRef.current;

  // SharedValues main joueur (8 x, 8 y, 8 angle, 8 échelle)
  const valeursMainRef = useRef<ValeursAnimationMainJoueur | null>(null);
  valeursMainRef.current ??= creerValeursMain();
  const valeursMain = valeursMainRef.current;

  // Pool d'animation slots [36-43]
  const slotsAnimationLibresRef = useRef<Set<number>>(
    new Set(
      Array.from({ length: MAX_SLOTS_ANIMATION }, (_, i) => SLOTS_ANIMATIONS.debut + i),
    ),
  );

  // --- Fonctions utilitaires ---

  const parquerSlot = useCallback(
    (index: number) => {
      progressions[index].value = -1;
    },
    [progressions],
  );

  const ecrireSlotStatique = useCallback(
    (index: number, x: number, y: number, rotation: number, echelle: number) => {
      const donnees = [...donneesWorklet.value];
      const base = index * STRIDE_UNIFIE;
      // Depart = controle = arrivee = position cible
      donnees[base + OFFSET.departX] = x;
      donnees[base + OFFSET.departY] = y;
      donnees[base + OFFSET.controleX] = x;
      donnees[base + OFFSET.controleY] = y;
      donnees[base + OFFSET.arriveeX] = x;
      donnees[base + OFFSET.arriveeY] = y;
      donnees[base + OFFSET.rotDepart] = rotation;
      donnees[base + OFFSET.rotArrivee] = rotation;
      donnees[base + OFFSET.echDepart] = echelle;
      donnees[base + OFFSET.echArrivee] = echelle;
      donneesWorklet.value = donnees;
      progressions[index].value = 1;
    },
    [donneesWorklet, progressions],
  );

  const mettreAJourSprite = useCallback(
    (index: number, rectSrc: RectSource) => {
      sprites[index] = convertirRectSource(rectSrc);
    },
    [sprites],
  );

  // --- Mise à jour des piles ---

  const mettreAJourPiles = useCallback(
    (nbPlis1: number, nbPlis2: number, largeurEcran: number, hauteurEcran: number) => {
      if (largeurCellule === 0 || largeurEcran === 0) return;

      const dos = calculerVersoSource(largeurCellule, hauteurCellule);

      // Equipe 1 (slot 0)
      if (nbPlis1 > 0) {
        const geom1 = calculerGeometriePilePlis({
          equipe: "equipe1",
          nbPlis: nbPlis1,
          largeurEcran,
          hauteurEcran,
        });
        const pos1 = POSITIONS_PILES.equipe1;
        sprites[SLOTS_PILES.debut] = convertirRectSource(dos);
        ecrireSlotStatique(
          SLOTS_PILES.debut,
          pos1.x,
          pos1.y,
          geom1.estTourne ? 90 : 0,
          geom1.largeurCarte / (largeurEcran * RATIO_LARGEUR_CARTE),
        );
      } else {
        parquerSlot(SLOTS_PILES.debut);
      }

      // Equipe 2 (slot 1)
      if (nbPlis2 > 0) {
        const geom2 = calculerGeometriePilePlis({
          equipe: "equipe2",
          nbPlis: nbPlis2,
          largeurEcran,
          hauteurEcran,
        });
        const pos2 = POSITIONS_PILES.equipe2;
        sprites[SLOTS_PILES.debut + 1] = convertirRectSource(dos);
        ecrireSlotStatique(
          SLOTS_PILES.debut + 1,
          pos2.x,
          pos2.y,
          geom2.estTourne ? 90 : 0,
          geom2.largeurCarte / (largeurEcran * RATIO_LARGEUR_CARTE),
        );
      } else {
        parquerSlot(SLOTS_PILES.debut + 1);
      }
    },
    [largeurCellule, hauteurCellule, sprites, ecrireSlotStatique, parquerSlot],
  );

  // --- Mise à jour de la réserve ---

  const mettreAJourReserve = useCallback(
    (
      afficherPaquet: boolean,
      carteRetournee: Carte | null,
      largeurEcran: number,
      hauteurEcran: number,
    ) => {
      if (largeurCellule === 0 || largeurEcran === 0) return;

      const disposition = calculerDispositionReserveCentrale({
        largeurEcran,
        hauteurEcran,
      });
      const echelleReserve =
        disposition.largeurCarte / (largeurEcran * RATIO_LARGEUR_CARTE);

      // Slot 2 : dos paquet
      if (afficherPaquet) {
        const dos = calculerVersoSource(largeurCellule, hauteurCellule);
        sprites[SLOTS_RESERVE.debut] = convertirRectSource(dos);
        ecrireSlotStatique(
          SLOTS_RESERVE.debut,
          disposition.centrePaquet.x / largeurEcran,
          disposition.centrePaquet.y / hauteurEcran,
          0,
          echelleReserve,
        );
      } else {
        parquerSlot(SLOTS_RESERVE.debut);
      }

      // Slot 3 : carte retournée
      if (carteRetournee) {
        const face = calculerRectoSource(
          largeurCellule,
          hauteurCellule,
          carteRetournee.couleur,
          carteRetournee.rang,
        );
        sprites[SLOTS_RESERVE.debut + 1] = convertirRectSource(face);
        ecrireSlotStatique(
          SLOTS_RESERVE.debut + 1,
          disposition.centreCarteRetournee.x / largeurEcran,
          disposition.centreCarteRetournee.y / hauteurEcran,
          0,
          echelleReserve,
        );
      } else {
        parquerSlot(SLOTS_RESERVE.debut + 1);
      }
    },
    [largeurCellule, hauteurCellule, sprites, ecrireSlotStatique, parquerSlot],
  );

  // --- Mise à jour des adversaires ---

  const mettreAJourAdversaires = useCallback(
    (
      nbParPosition: { nord: number; est: number; ouest: number },
      largeurEcran: number,
      hauteurEcran: number,
    ) => {
      if (largeurCellule === 0 || largeurEcran === 0) return;

      const dos = calculerVersoSource(largeurCellule, hauteurCellule);
      const dosRect = convertirRectSource(dos);
      let index = SLOTS_ADVERSAIRES.debut;

      for (const position of ["nord", "ouest", "est"] as const) {
        const nb = nbParPosition[position];
        if (nb > 0) {
          const cibles = calculerCiblesEventailAdversaire(
            position,
            0,
            nb,
            nb,
            largeurEcran,
            hauteurEcran,
          );

          for (const cible of cibles) {
            sprites[index] = dosRect;
            ecrireSlotStatique(
              index,
              cible.arrivee.x,
              cible.arrivee.y,
              cible.rotationArrivee,
              ECHELLE_MAIN_ADVERSE,
            );
            index += 1;
          }
        }
      }

      // Parquer les slots inutilisés
      for (let i = index; i <= SLOTS_ADVERSAIRES.fin; i += 1) {
        parquerSlot(i);
      }
    },
    [largeurCellule, hauteurCellule, sprites, ecrireSlotStatique, parquerSlot],
  );

  // --- Mise à jour des sprites/colors de la main joueur ---

  const mettreAJourMainJoueurSprites = useCallback(
    (cartes: Carte[], cartesJouables?: Carte[]) => {
      if (largeurCellule === 0) return;

      for (let i = 0; i < MAX_CARTES_MAIN; i += 1) {
        const carte = cartes[i];
        if (carte) {
          const face = calculerRectoSource(
            largeurCellule,
            hauteurCellule,
            carte.couleur,
            carte.rang,
          );
          sprites[SLOTS_MAIN.debut + i] = convertirRectSource(face);

          // Grisé : si cartesJouables défini et la carte n'est pas dedans
          if (cartesJouables) {
            const estJouable = cartesJouables.some(
              (cj) => cj.couleur === carte.couleur && cj.rang === carte.rang,
            );
            colors[SLOTS_MAIN.debut + i] = estJouable ? COULEUR_NORMALE : COULEUR_GRISEE;
          } else {
            colors[SLOTS_MAIN.debut + i] = COULEUR_NORMALE;
          }
        } else {
          // Slot sans carte : le parquer ne suffit pas, il faut aussi un sprite valide
          const dos = calculerVersoSource(largeurCellule, hauteurCellule);
          sprites[SLOTS_MAIN.debut + i] = convertirRectSource(dos);
          colors[SLOTS_MAIN.debut + i] = COULEUR_NORMALE;
        }
      }
    },
    [largeurCellule, hauteurCellule, sprites, colors],
  );

  // --- Pool de slots animation ---

  const allouerSlotAnimation = useCallback((): number | null => {
    const libres = slotsAnimationLibresRef.current;
    if (libres.size === 0) return null;
    const premier = libres.values().next().value as number;
    libres.delete(premier);
    return premier;
  }, []);

  const libererSlotAnimation = useCallback(
    (index: number) => {
      parquerSlot(index);
      slotsAnimationLibresRef.current.add(index);
    },
    [parquerSlot],
  );

  const ecrireSlotAnime = useCallback(
    (index: number, donnees: DonneesSlotAnime) => {
      const buffer = [...donneesWorklet.value];
      const base = index * STRIDE_UNIFIE;
      buffer[base + OFFSET.departX] = donnees.departX;
      buffer[base + OFFSET.departY] = donnees.departY;
      buffer[base + OFFSET.controleX] = donnees.controleX;
      buffer[base + OFFSET.controleY] = donnees.controleY;
      buffer[base + OFFSET.arriveeX] = donnees.arriveeX;
      buffer[base + OFFSET.arriveeY] = donnees.arriveeY;
      buffer[base + OFFSET.rotDepart] = donnees.rotDepart;
      buffer[base + OFFSET.rotArrivee] = donnees.rotArrivee;
      buffer[base + OFFSET.echDepart] = donnees.echDepart;
      buffer[base + OFFSET.echArrivee] = donnees.echArrivee;
      donneesWorklet.value = buffer;
    },
    [donneesWorklet],
  );

  return {
    donneesWorklet,
    progressions,
    sprites,
    colors,
    valeursMain,
    flip: null, // Sera implémenté à l'étape 9
    mettreAJourPiles,
    mettreAJourReserve,
    mettreAJourAdversaires,
    mettreAJourMainJoueurSprites,
    parquerSlot,
    ecrireSlotStatique,
    mettreAJourSprite,
    allouerSlotAnimation,
    libererSlotAnimation,
    ecrireSlotAnime,
  };
}
