import type { Carte, Couleur } from "@belote/shared-types";
import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { StyleSheet, View } from "react-native";

import { IndicateurAtout } from "./IndicateurAtout";
import { LabelJoueur } from "./LabelJoueur";
import { MainAdversaire } from "./MainAdversaire";
import { MainJoueur } from "./MainJoueur";
import { TableauScores } from "./TableauScores";
import { ZonePli } from "./ZonePli";

// --- Données de démonstration (seront remplacées par l'état XState) ---
const MAIN_DEMO: Carte[] = [
  { rang: "as", couleur: "coeur" },
  { rang: "roi", couleur: "coeur" },
  { rang: "valet", couleur: "pique" },
  { rang: "10", couleur: "carreau" },
  { rang: "dame", couleur: "trefle" },
  { rang: "9", couleur: "coeur" },
  { rang: "8", couleur: "pique" },
  { rang: "7", couleur: "carreau" },
];

const PLI_DEMO: { joueur: "sud" | "nord" | "est" | "ouest"; carte: Carte }[] = [
  { joueur: "ouest", carte: { rang: "roi", couleur: "pique" } },
  { joueur: "nord", carte: { rang: "10", couleur: "pique" } },
];

const ATOUT_DEMO: Couleur = "coeur";
const NB_CARTES_ADVERSAIRES = { nord: 8, est: 8, ouest: 6 };
// --- Fin données de démonstration ---

export default function PlateauJeu() {
  const [dimensions, setDimensions] = useState({ largeur: 0, hauteur: 0 });

  const surLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDimensions({ largeur: width, hauteur: height });
  }, []);

  const { largeur, hauteur } = dimensions;

  return (
    <View style={styles.plateau} onLayout={surLayout}>
      {largeur > 0 && hauteur > 0 && (
        <>
          {/* Bordure décorative */}
          <View style={styles.bordure} />

          {/* Mains des adversaires (dos des cartes) */}
          <MainAdversaire
            nbCartes={NB_CARTES_ADVERSAIRES.nord}
            position="nord"
            largeurEcran={largeur}
            hauteurEcran={hauteur}
          />
          <MainAdversaire
            nbCartes={NB_CARTES_ADVERSAIRES.ouest}
            position="ouest"
            largeurEcran={largeur}
            hauteurEcran={hauteur}
          />
          <MainAdversaire
            nbCartes={NB_CARTES_ADVERSAIRES.est}
            position="est"
            largeurEcran={largeur}
            hauteurEcran={hauteur}
          />

          {/* Zone du pli au centre */}
          <ZonePli cartes={PLI_DEMO} largeurEcran={largeur} hauteurEcran={hauteur} />

          {/* Indicateur d'atout + scores (coin haut-gauche, sous les cartes nord) */}
          <View style={[styles.indicateurs, { top: hauteur * 0.18 }]}>
            <IndicateurAtout couleurAtout={ATOUT_DEMO} />
            <TableauScores scoreEquipe1={82} scoreEquipe2={54} />
          </View>

          {/* Labels des joueurs */}
          <LabelJoueur position="sud" largeurEcran={largeur} hauteurEcran={hauteur} />
          <LabelJoueur position="nord" largeurEcran={largeur} hauteurEcran={hauteur} />
          <LabelJoueur position="ouest" largeurEcran={largeur} hauteurEcran={hauteur} />
          <LabelJoueur position="est" largeurEcran={largeur} hauteurEcran={hauteur} />

          {/* Main du joueur (sud) en éventail */}
          <MainJoueur cartes={MAIN_DEMO} largeurEcran={largeur} hauteurEcran={hauteur} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  plateau: {
    flex: 1,
    backgroundColor: "#1a5c2a",
  },
  bordure: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#145222",
  },
  indicateurs: {
    position: "absolute",
    left: 8,
    gap: 8,
    zIndex: 10,
  },
});
