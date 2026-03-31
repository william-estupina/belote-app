import type { PositionJoueur } from "@belote/shared-types";
import { Platform } from "react-native";

import {
  accelererDureeAnimation,
  dureeAnimationMajeure,
  ralentirDureeAnimationMajeure,
} from "./animations-visuelles";

// Constantes de mise en page du plateau de jeu
// Toutes les dimensions sont en proportions relatives a la zone de jeu (sans le header)

// --- Cartes ---
export const RATIO_LARGEUR_CARTE = 0.09; // largeur carte = 9% largeur ecran (plus petit)
export const RATIO_ASPECT_CARTE = 1.45; // hauteur / largeur

// --- Zone du pli (positions des cartes jouees au centre, resserrees) ---
export const POSITIONS_PLI = {
  sud: { x: 0.5, y: 0.52 },
  nord: { x: 0.5, y: 0.41 },
  ouest: { x: 0.42, y: 0.47 },
  est: { x: 0.58, y: 0.47 },
} as const;

// --- Rotation de base par position (aspect "pose par le joueur") ---
const ROTATIONS_BASE: Record<string, number> = {
  sud: 0,
  nord: 0,
  ouest: -8,
  est: 8,
};

// --- Variation pseudo-aleatoire des cartes posees (aspect naturel) ---
function hashCarte(couleur: string, rang: string): number {
  let h = 0;
  const cle = `${couleur}-${rang}`;
  for (let i = 0; i < cle.length; i++) {
    h = (h * 31 + cle.charCodeAt(i)) | 0;
  }
  return h;
}

/** Retourne la rotation totale (base + aleatoire) et les decalages proportionnels */
export function variationCartePli(couleur: string, rang: string, position: string) {
  const h = hashCarte(couleur, rang);
  const rotationBase = ROTATIONS_BASE[position] ?? 0;
  // Rotation supplementaire entre -12 degres et +12 degres
  const rotationAleatoire = ((h % 110) / 110) * 24 - 12;
  const rotation = rotationBase + rotationAleatoire;
  // Decalage X entre -0.018 et +0.018 (fraction de largeur ecran)
  const decalageX = (((h >> 8) % 90) / 90) * 0.036 - 0.018;
  // Decalage Y entre -0.014 et +0.014 (fraction de hauteur ecran)
  const decalageY = (((h >> 16) % 70) / 70) * 0.028 - 0.014;
  return { rotation, decalageX, decalageY };
}

// --- Main du joueur (eventail) ---
export const EVENTAIL = {
  angleTotal: 40, // angle total de l'eventail en degres (+/-20 degres)
  decalageArc: 0.04, // hauteur de l'arc en % de hauteur ecran
  chevauchement: 0.55, // facteur de chevauchement entre cartes (0 = pas, 1 = complet)
} as const;

// --- Mains adversaires (eventail adapte par cote) ---
export const ADVERSAIRE = {
  ratioLargeurCarte: 0.05, // cartes adversaires legerement plus petites pour degager le plateau
  chevauchement: 0.65, // chevauchement modere
  margeNordY: -0.045, // rogne davantage la main du haut pour liberer le centre
  margeCoteX: -0.025, // rogne davantage sur les cotes pour gagner de l'espace
  angleTotal: 20, // eventail discret
  decalageArc: 0.02, // arc leger
} as const;

// --- Zone indicateurs ---
export const INDICATEURS = {
  atoutY: 0.3, // position Y de l'indicateur d'atout (en % hauteur zone de jeu)
} as const;

// --- Animations ---
export const ANIMATIONS = {
  // Distribution : vol centre -> main (par paquets simultanes, 3 puis 2)
  distribution: {
    dureeCarte: dureeAnimationMajeure(800), // duree de vol par carte (ms)
    delaiEntreJoueurs: dureeAnimationMajeure(500), // delai entre les paquets de chaque joueur (ms)
    pauseEntreRounds: 0, // pas de pause entre le paquet de 3 et le paquet de 2
    easingDistribution: "out-cubic" as const, // deceleration naturelle a l'arrivee
    staggerIntraPaquet: 0, // toutes les cartes d'un meme paquet partent en meme temps
    arcDistribution: {
      decalagePerpendiculaire: 0.05, // 5% de la distance, perpendiculaire a l'axe de vol
    },
    // Eventail en vol : spread des cartes dans un meme paquet
    eventailVol: {
      ecartX: 0.03, // ecart horizontal entre cartes adjacentes (fraction ecran)
      ecartRotation: 10, // ecart de rotation entre cartes adjacentes (degres)
    },
    dureeReorganisationMain: dureeAnimationMajeure(350), // duree du placement/tri visuel dans la main du joueur (ms)
    // Tri apres distribution
    pauseAvantTri: dureeAnimationMajeure(250), // pause avant animation de tri (ms)
    // Distribution restante -> slide carte retournee
    dureeSlideRetournee: dureeAnimationMajeure(600), // duree du slide vers main preneur (ms)
    dureeRetourPaquet: ralentirDureeAnimationMajeure(1000), // duree du rappel des mains vers le paquet (ms)
    delaiEntreVaguesRetourPaquet: accelererDureeAnimation(720), // decalage entre chaque vague de 4 cartes (ms)
    pauseApresRetourPaquet: accelererDureeAnimation(600), // pause avant de relancer la nouvelle distribution (ms)
    // Origine (centre du tapis)
    originX: 0.5,
    originY: 0.45,
  },
  // Jeu de carte : main -> centre
  jeuCarte: {
    duree: ralentirDureeAnimationMajeure(200), // duree de l'animation (ms)
  },
  // Ramassage du pli : centre -> gagnant
  ramassagePli: {
    duree: ralentirDureeAnimationMajeure(300), // duree du mouvement de ramassage (ms)
    delaiAvant: accelererDureeAnimation(800), // pause avant ramassage pour voir le pli (ms)
  },
  // Redistribution : pause apres le dernier passe -> rappel des cartes -> glissement dealer
  redistribution: {
    pauseAvantRappel: accelererDureeAnimation(300),
    dureeGlissementDealer: 500,
    dureeRetourCarteRetournee: ralentirDureeAnimationMajeure(500), // duree du retour de la carte retournee vers le paquet (ms)
  },
  // Delai des bots (phase jeu)
  delaiBot: {
    min: 250, // delai minimum (ms)
    max: 500, // delai maximum (ms)
  },
  // Delai des bots (phase encheres - plus lent pour que le joueur suive)
  delaiEncheres: {
    min: 1000, // delai minimum (ms)
    max: 1500, // delai maximum (ms)
  },
  // Pause apres la distribution pour montrer la carte retournee avant les encheres
  pauseAvantEncheres: dureeAnimationMajeure(1500), // ms
} as const;

// --- Piles de plis remportes (positions des tas de cartes par equipe) ---
export const POSITIONS_PILES = {
  equipe1: { x: 0.82, y: 0.82 }, // en bas a droite, pres de sud
  equipe2: { x: 0.08, y: 0.22 }, // a gauche, bien au-dessus de ouest
} as const;

// --- Positions de depart/arrivee pour les animations ---
export const POSITIONS_MAINS = {
  sud: { x: 0.5, y: 0.92 },
  nord: { x: 0.5, y: 0.02 },
  ouest: { x: 0.02, y: 0.5 },
  est: { x: 0.98, y: 0.5 },
} as const;

const estWeb = Platform.OS === "web";

// --- Avatars ---
export const POSITIONS_AVATAR: Record<PositionJoueur, { x: number; y: number }> = {
  sud: { x: 0.28, y: 0.71 },
  nord: { x: 0.62, y: 0.17 },
  ouest: { x: 0.095, y: 0.5 },
  est: { x: 0.905, y: 0.5 },
};

export const TAILLE_AVATAR = estWeb ? 68 : 58;
export const DECALAGE_NOM = estWeb ? 8 : 6;
