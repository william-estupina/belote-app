import type { Carte, Couleur, PositionJoueur } from "@belote/shared-types";
import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAnimations } from "../../hooks/useAnimations";
import { CoucheAnimation } from "./CoucheAnimation";
import { IndicateurAtout } from "./IndicateurAtout";
import { MainAdversaire } from "./MainAdversaire";
import { MainJoueur } from "./MainJoueur";
import { TableauScores } from "./TableauScores";
import { ZonePli } from "./ZonePli";

// --- Données de démonstration (seront remplacées par l'état XState à l'étape 8) ---
const MAINS_DEMO: Record<PositionJoueur, Carte[]> = {
  sud: [
    { rang: "as", couleur: "coeur" },
    { rang: "roi", couleur: "coeur" },
    { rang: "valet", couleur: "pique" },
    { rang: "10", couleur: "carreau" },
    { rang: "dame", couleur: "trefle" },
    { rang: "9", couleur: "coeur" },
    { rang: "8", couleur: "pique" },
    { rang: "7", couleur: "carreau" },
  ],
  nord: [
    { rang: "as", couleur: "pique" },
    { rang: "roi", couleur: "carreau" },
    { rang: "dame", couleur: "coeur" },
    { rang: "10", couleur: "trefle" },
    { rang: "9", couleur: "pique" },
    { rang: "8", couleur: "carreau" },
    { rang: "7", couleur: "trefle" },
    { rang: "valet", couleur: "carreau" },
  ],
  ouest: [
    { rang: "as", couleur: "carreau" },
    { rang: "roi", couleur: "trefle" },
    { rang: "dame", couleur: "pique" },
    { rang: "10", couleur: "coeur" },
    { rang: "9", couleur: "carreau" },
    { rang: "8", couleur: "trefle" },
    { rang: "7", couleur: "pique" },
    { rang: "valet", couleur: "trefle" },
  ],
  est: [
    { rang: "as", couleur: "trefle" },
    { rang: "roi", couleur: "pique" },
    { rang: "dame", couleur: "carreau" },
    { rang: "10", couleur: "pique" },
    { rang: "9", couleur: "trefle" },
    { rang: "8", couleur: "coeur" },
    { rang: "7", couleur: "coeur" },
    { rang: "valet", couleur: "coeur" },
  ],
};

// Cartes jouables de démo (seules les cartes de coeur sont jouables)
const CARTES_JOUABLES_DEMO: Carte[] = [
  { rang: "as", couleur: "coeur" },
  { rang: "roi", couleur: "coeur" },
  { rang: "9", couleur: "coeur" },
];

const ATOUT_DEMO: Couleur = "coeur";

type PhaseDemo = "vide" | "distribution" | "jeu";
// --- Fin données de démonstration ---

const estWeb = Platform.OS === "web";

export default function PlateauJeu() {
  const [dimensions, setDimensions] = useState({ largeur: 0, hauteur: 0 });
  const [phaseDemo, setPhaseDemo] = useState<PhaseDemo>("vide");
  const [mainJoueur, setMainJoueur] = useState<Carte[]>([]);
  const [nbCartesAdversaires, setNbCartesAdversaires] = useState({
    nord: 0,
    est: 0,
    ouest: 0,
  });
  const [pliEnCours, setPliEnCours] = useState<
    { joueur: PositionJoueur; carte: Carte }[]
  >([]);

  const {
    cartesEnVol,
    surAnimationTerminee,
    lancerDistribution,
    lancerAnimationJeuCarte,
    lancerAnimationRamassagePli,
  } = useAnimations();

  const surLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDimensions({ largeur: width, hauteur: height });
  }, []);

  // Lancer la démo de distribution
  const surDistribuer = useCallback(() => {
    // Réinitialiser
    setMainJoueur([]);
    setNbCartesAdversaires({ nord: 0, est: 0, ouest: 0 });
    setPliEnCours([]);
    setPhaseDemo("distribution");

    lancerDistribution(MAINS_DEMO, {
      onCarteArrivee: (joueur, carte) => {
        // Empiler chaque carte dans la main au fur et à mesure
        if (joueur === "sud") {
          setMainJoueur((prev) => [...prev, carte]);
        } else {
          setNbCartesAdversaires((prev) => ({
            ...prev,
            [joueur]: prev[joueur as "nord" | "est" | "ouest"] + 1,
          }));
        }
      },
      onTerminee: () => {
        setPhaseDemo("jeu");
      },
    });
  }, [lancerDistribution]);

  // Lancer la démo de ramassage du pli
  const surRamasserPli = useCallback(() => {
    if (pliEnCours.length === 0) return;
    lancerAnimationRamassagePli(pliEnCours, "nord", () => {
      setPliEnCours([]);
    });
  }, [pliEnCours, lancerAnimationRamassagePli]);

  // Callback quand le joueur tape sur une carte jouable
  const surCarteJouee = useCallback(
    (carte: Carte) => {
      // Retirer la carte de la main
      setMainJoueur((prev) =>
        prev.filter((c) => c.rang !== carte.rang || c.couleur !== carte.couleur),
      );

      // Lancer l'animation de la carte vers le centre
      lancerAnimationJeuCarte(carte, "sud", () => {
        // Quand l'animation est terminée, ajouter la carte au pli
        setPliEnCours((prev) => [...prev, { joueur: "sud" as PositionJoueur, carte }]);
      });
    },
    [lancerAnimationJeuCarte],
  );

  const { largeur, hauteur } = dimensions;

  return (
    <View style={styles.plateau} onLayout={surLayout}>
      {largeur > 0 && hauteur > 0 && (
        <>
          {/* Bordure décorative */}
          <View style={styles.bordure} />

          {/* Mains des adversaires (dos des cartes) */}
          <MainAdversaire
            nbCartes={nbCartesAdversaires.nord}
            position="nord"
            largeurEcran={largeur}
            hauteurEcran={hauteur}
          />
          <MainAdversaire
            nbCartes={nbCartesAdversaires.ouest}
            position="ouest"
            largeurEcran={largeur}
            hauteurEcran={hauteur}
          />
          <MainAdversaire
            nbCartes={nbCartesAdversaires.est}
            position="est"
            largeurEcran={largeur}
            hauteurEcran={hauteur}
          />

          {/* Zone du pli au centre */}
          <ZonePli cartes={pliEnCours} largeurEcran={largeur} hauteurEcran={hauteur} />

          {/* Indicateur d'atout + scores (coin haut-gauche) */}
          <View
            style={[
              styles.indicateurs,
              estWeb ? styles.indicateursWeb : styles.indicateursMobile,
            ]}
          >
            <IndicateurAtout couleurAtout={ATOUT_DEMO} />
            <TableauScores scoreEquipe1={82} scoreEquipe2={54} />
          </View>

          {/* Main du joueur (sud) en éventail — interactive */}
          <MainJoueur
            cartes={mainJoueur}
            largeurEcran={largeur}
            hauteurEcran={hauteur}
            cartesJouables={phaseDemo === "jeu" ? CARTES_JOUABLES_DEMO : undefined}
            interactionActive={phaseDemo === "jeu"}
            onCarteJouee={surCarteJouee}
          />

          {/* Couche d'animation (cartes en vol) */}
          <CoucheAnimation
            cartesEnVol={cartesEnVol}
            largeurEcran={largeur}
            hauteurEcran={hauteur}
            onAnimationTerminee={surAnimationTerminee}
          />

          {/* Boutons de démo (temporaires — seront retirés à l'étape 8) */}
          <View
            style={[
              styles.boutonsDemo,
              estWeb ? styles.boutonsDemoWeb : styles.boutonsDemoMobile,
            ]}
          >
            {phaseDemo === "vide" && (
              <Pressable style={styles.boutonDemo} onPress={surDistribuer}>
                <Text style={styles.texteBoutonDemo}>Distribuer</Text>
              </Pressable>
            )}
            {phaseDemo === "jeu" && pliEnCours.length > 0 && (
              <Pressable style={styles.boutonDemo} onPress={surRamasserPli}>
                <Text style={styles.texteBoutonDemo}>Ramasser pli</Text>
              </Pressable>
            )}
            {phaseDemo === "jeu" && (
              <Pressable
                style={styles.boutonDemo}
                onPress={() => {
                  setPhaseDemo("vide");
                  setMainJoueur([]);
                  setNbCartesAdversaires({ nord: 0, est: 0, ouest: 0 });
                  setPliEnCours([]);
                }}
              >
                <Text style={styles.texteBoutonDemo}>Reset</Text>
              </Pressable>
            )}
          </View>
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
    gap: 3,
    zIndex: 10,
  },
  indicateursWeb: {
    left: 8,
    top: 8,
  },
  indicateursMobile: {
    left: 40,
    top: 4,
  },
  boutonsDemo: {
    position: "absolute",
    flexDirection: "row",
    gap: 8,
    zIndex: 20,
  },
  boutonsDemoWeb: {
    right: 8,
    top: 8,
  },
  boutonsDemoMobile: {
    right: 12,
    top: 44,
  },
  boutonDemo: {
    backgroundColor: "#d4a017",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  texteBoutonDemo: {
    color: "#1a1a1a",
    fontWeight: "bold",
    fontSize: 13,
  },
});
