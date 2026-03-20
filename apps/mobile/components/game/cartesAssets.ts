import type { Couleur, Rang } from "@belote/shared-types";
import { Asset } from "expo-asset";
import type { ImageSourcePropType } from "react-native";

export const IMAGES_CARTES: Record<Rang, Record<Couleur, ImageSourcePropType>> = {
  "7": {
    pique: require("../../assets/cartes/7_of_spades.png"),
    coeur: require("../../assets/cartes/7_of_hearts.png"),
    carreau: require("../../assets/cartes/7_of_diamonds.png"),
    trefle: require("../../assets/cartes/7_of_clubs.png"),
  },
  "8": {
    pique: require("../../assets/cartes/8_of_spades.png"),
    coeur: require("../../assets/cartes/8_of_hearts.png"),
    carreau: require("../../assets/cartes/8_of_diamonds.png"),
    trefle: require("../../assets/cartes/8_of_clubs.png"),
  },
  "9": {
    pique: require("../../assets/cartes/9_of_spades.png"),
    coeur: require("../../assets/cartes/9_of_hearts.png"),
    carreau: require("../../assets/cartes/9_of_diamonds.png"),
    trefle: require("../../assets/cartes/9_of_clubs.png"),
  },
  "10": {
    pique: require("../../assets/cartes/10_of_spades.png"),
    coeur: require("../../assets/cartes/10_of_hearts.png"),
    carreau: require("../../assets/cartes/10_of_diamonds.png"),
    trefle: require("../../assets/cartes/10_of_clubs.png"),
  },
  valet: {
    pique: require("../../assets/cartes/jack_of_spades.png"),
    coeur: require("../../assets/cartes/jack_of_hearts.png"),
    carreau: require("../../assets/cartes/jack_of_diamonds.png"),
    trefle: require("../../assets/cartes/jack_of_clubs.png"),
  },
  dame: {
    pique: require("../../assets/cartes/queen_of_spades.png"),
    coeur: require("../../assets/cartes/queen_of_hearts.png"),
    carreau: require("../../assets/cartes/queen_of_diamonds.png"),
    trefle: require("../../assets/cartes/queen_of_clubs.png"),
  },
  roi: {
    pique: require("../../assets/cartes/king_of_spades.png"),
    coeur: require("../../assets/cartes/king_of_hearts.png"),
    carreau: require("../../assets/cartes/king_of_diamonds.png"),
    trefle: require("../../assets/cartes/king_of_clubs.png"),
  },
  as: {
    pique: require("../../assets/cartes/ace_of_spades.png"),
    coeur: require("../../assets/cartes/ace_of_hearts.png"),
    carreau: require("../../assets/cartes/ace_of_diamonds.png"),
    trefle: require("../../assets/cartes/ace_of_clubs.png"),
  },
};

export function obtenirSourcesImagesCartes(): ImageSourcePropType[] {
  const sources: ImageSourcePropType[] = [];

  for (const imagesParCouleur of Object.values(IMAGES_CARTES)) {
    for (const sourceImage of Object.values(imagesParCouleur)) {
      sources.push(sourceImage);
    }
  }

  return sources;
}

export async function prechargerImagesCartes(): Promise<void> {
  const chargements = obtenirSourcesImagesCartes().map((sourceImage) =>
    Asset.fromModule(
      sourceImage as number | string | { uri: string; width: number; height: number },
    )
      .downloadAsync()
      .then(() => undefined),
  );

  await Promise.all(chargements);
}
