import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { ANIMATIONS_DIALOGUE_FIN_MANCHE } from "../../constants/animations-visuelles";
import { COULEURS } from "../../constants/theme";
import type { ResumeFinManche } from "../../hooks/resume-fin-manche";

interface PropsDialogueFinManche {
  resumeFinManche: ResumeFinManche;
  onContinuer: () => void;
}

const estWeb = Platform.OS === "web";

type NiveauEmotionFinManche =
  | "gain-leger"
  | "gain-fort"
  | "gain-max"
  | "perte-legere"
  | "perte-forte"
  | "perte-max";

interface ConfigurationCadranEmotionnel {
  titre: string;
  niveau: NiveauEmotionFinManche;
  couleurBordurePanneau: string;
  couleurOmbrePanneau: string;
  couleurFondCadran: string;
  couleurBordureCadran: string;
  couleurTitreCadran: string;
  couleurFlash: string;
  couleurHalo: string;
  couleurMiseEnAvant: string;
  couleurEclairScore: string;
  couleurBouton: string;
  couleurTexteBouton: string;
  afficherTraits: boolean;
  afficherCristaux: boolean;
  afficherEtoiles: boolean;
}

function estVictoireJoueur(resumeFinManche: ResumeFinManche): boolean {
  return resumeFinManche.equipeGagnanteManche === "equipe1";
}

function creerConfigurationCadran(
  resumeFinManche: ResumeFinManche,
): ConfigurationCadranEmotionnel {
  const victoire = estVictoireJoueur(resumeFinManche);

  if (resumeFinManche.estCapot) {
    if (victoire) {
      return {
        titre: "Capot",
        niveau: "gain-max",
        couleurBordurePanneau: "rgba(230, 183, 48, 1)",
        couleurOmbrePanneau: "rgba(232, 183, 48, 0.28)",
        couleurFondCadran: "rgba(212, 160, 23, 0.22)",
        couleurBordureCadran: "rgba(255, 226, 144, 0.42)",
        couleurTitreCadran: "#fff7df",
        couleurFlash: "rgba(255, 231, 158, 0.98)",
        couleurHalo: "rgba(255, 206, 92, 0.2)",
        couleurMiseEnAvant: "#ffe28d",
        couleurEclairScore: "rgba(232, 183, 48, 0.26)",
        couleurBouton: COULEURS.boutonPrimaire,
        couleurTexteBouton: COULEURS.boutonPrimaireTexte,
        afficherTraits: true,
        afficherCristaux: false,
        afficherEtoiles: true,
      };
    }

    return {
      titre: "Capot",
      niveau: "perte-max",
      couleurBordurePanneau: "rgba(182, 220, 255, 0.9)",
      couleurOmbrePanneau: "rgba(176, 216, 255, 0.24)",
      couleurFondCadran: "rgba(180, 216, 255, 0.11)",
      couleurBordureCadran: "rgba(215, 240, 255, 0.34)",
      couleurTitreCadran: "#f6fbff",
      couleurFlash: "rgba(228, 246, 255, 0.98)",
      couleurHalo: "rgba(198, 234, 255, 0.16)",
      couleurMiseEnAvant: "#f2fbff",
      couleurEclairScore: "rgba(176, 216, 255, 0.24)",
      couleurBouton: "#d6e7f4",
      couleurTexteBouton: "#143040",
      afficherTraits: true,
      afficherCristaux: true,
      afficherEtoiles: false,
    };
  }

  if (resumeFinManche.estChute) {
    if (victoire) {
      return {
        titre: "Ils sont dedans",
        niveau: "gain-fort",
        couleurBordurePanneau: "rgba(230, 183, 48, 0.96)",
        couleurOmbrePanneau: "rgba(232, 183, 48, 0.22)",
        couleurFondCadran: "rgba(232, 183, 48, 0.15)",
        couleurBordureCadran: "rgba(255, 226, 144, 0.3)",
        couleurTitreCadran: "#fff4d2",
        couleurFlash: "rgba(255, 225, 140, 0.96)",
        couleurHalo: "rgba(255, 195, 74, 0.18)",
        couleurMiseEnAvant: "#ffdf84",
        couleurEclairScore: "rgba(232, 183, 48, 0.22)",
        couleurBouton: COULEURS.boutonPrimaire,
        couleurTexteBouton: COULEURS.boutonPrimaireTexte,
        afficherTraits: true,
        afficherCristaux: false,
        afficherEtoiles: false,
      };
    }

    return {
      titre: "Vous êtes dedans",
      niveau: "perte-forte",
      couleurBordurePanneau: "rgba(170, 210, 255, 0.78)",
      couleurOmbrePanneau: "rgba(170, 210, 255, 0.2)",
      couleurFondCadran: "rgba(170, 210, 255, 0.1)",
      couleurBordureCadran: "rgba(200, 232, 255, 0.28)",
      couleurTitreCadran: "#f2f9ff",
      couleurFlash: "rgba(220, 242, 255, 0.94)",
      couleurHalo: "rgba(190, 228, 255, 0.13)",
      couleurMiseEnAvant: "#e5f5ff",
      couleurEclairScore: "rgba(170, 210, 255, 0.2)",
      couleurBouton: "#cad9e6",
      couleurTexteBouton: "#173241",
      afficherTraits: false,
      afficherCristaux: true,
      afficherEtoiles: false,
    };
  }

  if (victoire) {
    return {
      titre: resumeFinManche.messageVerdict,
      niveau: "gain-leger",
      couleurBordurePanneau: "rgba(230, 183, 48, 0.9)",
      couleurOmbrePanneau: "rgba(232, 183, 48, 0.18)",
      couleurFondCadran: "rgba(232, 183, 48, 0.1)",
      couleurBordureCadran: "rgba(255, 215, 107, 0.22)",
      couleurTitreCadran: "#fff0c1",
      couleurFlash: "rgba(255, 225, 140, 0.92)",
      couleurHalo: "rgba(255, 196, 74, 0.12)",
      couleurMiseEnAvant: "#ffd76c",
      couleurEclairScore: "rgba(232, 183, 48, 0.18)",
      couleurBouton: COULEURS.boutonPrimaire,
      couleurTexteBouton: COULEURS.boutonPrimaireTexte,
      afficherTraits: false,
      afficherCristaux: false,
      afficherEtoiles: false,
    };
  }

  return {
    titre: "Défaite",
    niveau: "perte-legere",
    couleurBordurePanneau: "rgba(170, 210, 255, 0.62)",
    couleurOmbrePanneau: "rgba(170, 210, 255, 0.16)",
    couleurFondCadran: "rgba(170, 210, 255, 0.08)",
    couleurBordureCadran: "rgba(190, 226, 255, 0.2)",
    couleurTitreCadran: "#eef7ff",
    couleurFlash: "rgba(215, 240, 255, 0.88)",
    couleurHalo: "rgba(190, 228, 255, 0.09)",
    couleurMiseEnAvant: "#d8efff",
    couleurEclairScore: "rgba(170, 210, 255, 0.16)",
    couleurBouton: "#cad9e6",
    couleurTexteBouton: "#173241",
    afficherTraits: false,
    afficherCristaux: false,
    afficherEtoiles: false,
  };
}

function useCompteurAnime(
  debut: number,
  fin: number,
  demarrer: boolean,
  delai: number,
  duree: number,
): number {
  const [valeur, setValeur] = useState(debut);

  useEffect(() => {
    setValeur(debut);

    if (!demarrer) return undefined;

    let interval: ReturnType<typeof setInterval> | null = null;
    const debutAnimation = { courant: 0 };
    const timeout = setTimeout(() => {
      debutAnimation.courant = Date.now();
      interval = setInterval(() => {
        const progression = Math.min((Date.now() - debutAnimation.courant) / duree, 1);
        const eased = 1 - Math.pow(1 - progression, 3);
        setValeur(Math.round(debut + (fin - debut) * eased));
        if (progression >= 1 && interval) {
          clearInterval(interval);
          interval = null;
        }
      }, 16);
    }, delai);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [debut, fin, demarrer, delai, duree]);

  return valeur;
}

function animerEntreeBloc(animation: Animated.Value, duree: number) {
  animation.setValue(0);
  Animated.timing(animation, {
    toValue: 1,
    duration: duree,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start();
}

export function DialogueFinManche({
  resumeFinManche,
  onContinuer,
}: PropsDialogueFinManche) {
  const [afficherVerdict, setAfficherVerdict] = useState(false);
  const [afficherDetails, setAfficherDetails] = useState(false);
  const [afficherTotal, setAfficherTotal] = useState(false);
  const [afficherBouton, setAfficherBouton] = useState(false);

  const configurationCadran = useMemo(
    () => creerConfigurationCadran(resumeFinManche),
    [resumeFinManche],
  );

  const animOverlay = useRef(new Animated.Value(0)).current;
  const animPanneau = useRef(new Animated.Value(0)).current;
  const animVerdict = useRef(new Animated.Value(0)).current;
  const animOrnementVerdict = useRef(new Animated.Value(0)).current;
  const animDetails = useRef(new Animated.Value(0)).current;
  const animTotal = useRef(new Animated.Value(0)).current;
  const animBouton = useRef(new Animated.Value(0)).current;
  const animEclair1 = useRef(new Animated.Value(0)).current;
  const animEclair2 = useRef(new Animated.Value(0)).current;

  const delaiAffichageTotal = useMemo(
    () =>
      resumeFinManche.estCapot
        ? ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiCapot +
          ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeAnimationCapot
        : ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiSectionTotal,
    [resumeFinManche.estCapot],
  );

  const delaiAffichageBouton = useMemo(
    () =>
      delaiAffichageTotal +
      ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiComptage +
      ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeComptage +
      ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiBoutonApresComptage,
    [delaiAffichageTotal],
  );

  const compteur1 = useCompteurAnime(
    resumeFinManche.scoreAvantEquipe1,
    resumeFinManche.scoreApresEquipe1,
    afficherTotal,
    ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiComptage,
    ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeComptage,
  );
  const compteur2 = useCompteurAnime(
    resumeFinManche.scoreAvantEquipe2,
    resumeFinManche.scoreApresEquipe2,
    afficherTotal,
    ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiComptage,
    ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeComptage,
  );

  useEffect(() => {
    Animated.timing(animOverlay, {
      toValue: 1,
      duration: ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeFonduOverlay,
      useNativeDriver: true,
    }).start();

    Animated.spring(animPanneau, {
      toValue: 1,
      delay: ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiEntreePanneau,
      tension: ANIMATIONS_DIALOGUE_FIN_MANCHE.tensionEntreePanneau,
      friction: 8,
      useNativeDriver: true,
    }).start();

    const timeouts = [
      setTimeout(() => {
        setAfficherVerdict(true);
        animerEntreeBloc(
          animVerdict,
          ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeApparitionVerdict,
        );
      }, ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiVerdict),
      setTimeout(() => {
        setAfficherDetails(true);
        animerEntreeBloc(
          animDetails,
          ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeApparitionDetails,
        );
      }, ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiDetails),
      setTimeout(() => {
        setAfficherTotal(true);
        animerEntreeBloc(animTotal, ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeApparitionTotal);
      }, delaiAffichageTotal),
      setTimeout(() => {
        setAfficherBouton(true);
        animerEntreeBloc(
          animBouton,
          ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeApparitionBouton,
        );
      }, delaiAffichageBouton),
    ];

    return () => {
      for (const timeout of timeouts) clearTimeout(timeout);
    };
  }, [
    animBouton,
    animDetails,
    animOverlay,
    animPanneau,
    animTotal,
    animVerdict,
    delaiAffichageBouton,
    delaiAffichageTotal,
    resumeFinManche.estCapot,
  ]);

  useEffect(() => {
    if (!afficherTotal) return undefined;

    const demarrerEclair = (animation: Animated.Value) =>
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: ANIMATIONS_DIALOGUE_FIN_MANCHE.dureePicEclair,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 0.3,
          duration:
            ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeComptage -
            ANIMATIONS_DIALOGUE_FIN_MANCHE.dureePicEclair,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeSortieEclair,
          useNativeDriver: true,
        }),
      ]);

    const timeout = setTimeout(() => {
      if (resumeFinManche.scoreMancheEquipe1 > 0) demarrerEclair(animEclair1).start();
      if (resumeFinManche.scoreMancheEquipe2 > 0) demarrerEclair(animEclair2).start();
    }, ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiComptage);

    return () => clearTimeout(timeout);
  }, [
    afficherTotal,
    animEclair1,
    animEclair2,
    resumeFinManche.scoreMancheEquipe1,
    resumeFinManche.scoreMancheEquipe2,
  ]);

  useEffect(() => {
    if (!afficherVerdict) return undefined;

    animOrnementVerdict.setValue(0);

    const animationBoucle = Animated.loop(
      Animated.sequence([
        Animated.timing(animOrnementVerdict, {
          toValue: 1,
          duration: ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeBoucleVerdict,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(animOrnementVerdict, {
          toValue: 0,
          duration: ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeRetourBoucleVerdict,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );

    animationBoucle.start();

    return () => {
      animationBoucle.stop();
    };
  }, [afficherVerdict, animOrnementVerdict]);

  return (
    <Animated.View style={[styles.overlay, { opacity: animOverlay }]}>
      <Animated.View
        testID="dialogue-fin-manche-panneau"
        style={[
          styles.panneau,
          {
            borderColor: configurationCadran.couleurBordurePanneau,
            shadowColor: configurationCadran.couleurOmbrePanneau,
          },
          {
            opacity: animPanneau,
            transform: [
              {
                scale: animPanneau.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.82, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.titre}>Fin de manche</Text>

        {afficherVerdict ? (
          <Animated.View
            testID="cadran-fin-manche"
            style={[
              styles.cadran,
              {
                backgroundColor: configurationCadran.couleurFondCadran,
                borderColor: configurationCadran.couleurBordureCadran,
              },
              {
                opacity: animVerdict,
                transform: [
                  {
                    translateY: animVerdict.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                  {
                    scale: animVerdict.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.haloCadran,
                {
                  backgroundColor: configurationCadran.couleurHalo,
                  opacity: animOrnementVerdict.interpolate({
                    inputRange: [0, 0.55, 0.7, 1],
                    outputRange: [0, 0, 0.9, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.flashCadran,
                {
                  backgroundColor: configurationCadran.couleurFlash,
                  opacity: animOrnementVerdict.interpolate({
                    inputRange: [0, 0.52, 0.62, 1],
                    outputRange: [0, 0, 1, 0],
                  }),
                  transform: [
                    {
                      scaleX: animOrnementVerdict.interpolate({
                        inputRange: [0, 0.52, 0.62, 1],
                        outputRange: [0.1, 0.1, 1.12, 1.12],
                      }),
                    },
                  ],
                },
              ]}
            />

            {configurationCadran.afficherTraits ? (
              <>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.traitCadran,
                    styles.trait1,
                    {
                      backgroundColor: configurationCadran.couleurFlash,
                      opacity: animOrnementVerdict.interpolate({
                        inputRange: [0, 0.58, 0.64, 1],
                        outputRange: [0, 0, 1, 0],
                      }),
                      transform: [
                        { rotate: "18deg" },
                        {
                          translateX: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.58, 0.64, 1],
                            outputRange: [0, 0, -6, -8],
                          }),
                        },
                        {
                          translateY: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.58, 0.64, 1],
                            outputRange: [0, 0, -10, -14],
                          }),
                        },
                        {
                          scaleY: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.58, 0.64, 1],
                            outputRange: [0.2, 0.2, 1, 1.2],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.traitCadran,
                    styles.trait2,
                    {
                      backgroundColor: configurationCadran.couleurFlash,
                      opacity: animOrnementVerdict.interpolate({
                        inputRange: [0, 0.6, 0.66, 1],
                        outputRange: [0, 0, 1, 0],
                      }),
                      transform: [
                        { rotate: "-24deg" },
                        {
                          translateX: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.6, 0.66, 1],
                            outputRange: [0, 0, 6, 10],
                          }),
                        },
                        {
                          translateY: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.6, 0.66, 1],
                            outputRange: [0, 0, -10, -14],
                          }),
                        },
                        {
                          scaleY: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.6, 0.66, 1],
                            outputRange: [0.2, 0.2, 1, 1.2],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.traitCadran,
                    styles.trait3,
                    {
                      backgroundColor: configurationCadran.couleurFlash,
                      opacity: animOrnementVerdict.interpolate({
                        inputRange: [0, 0.62, 0.68, 1],
                        outputRange: [0, 0, 1, 0],
                      }),
                      transform: [
                        { rotate: "-56deg" },
                        {
                          translateX: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.62, 0.68, 1],
                            outputRange: [0, 0, -6, -9],
                          }),
                        },
                        {
                          translateY: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.62, 0.68, 1],
                            outputRange: [0, 0, 8, 14],
                          }),
                        },
                        {
                          scaleY: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.62, 0.68, 1],
                            outputRange: [0.2, 0.2, 1, 1.2],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.traitCadran,
                    styles.trait4,
                    {
                      backgroundColor: configurationCadran.couleurFlash,
                      opacity: animOrnementVerdict.interpolate({
                        inputRange: [0, 0.64, 0.7, 1],
                        outputRange: [0, 0, 1, 0],
                      }),
                      transform: [
                        { rotate: "58deg" },
                        {
                          translateX: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.64, 0.7, 1],
                            outputRange: [0, 0, 6, 9],
                          }),
                        },
                        {
                          translateY: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.64, 0.7, 1],
                            outputRange: [0, 0, 8, 14],
                          }),
                        },
                        {
                          scaleY: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.64, 0.7, 1],
                            outputRange: [0.2, 0.2, 1, 1.2],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </>
            ) : null}

            {configurationCadran.afficherCristaux ? (
              <>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.cristalCadran,
                    styles.cristal1,
                    {
                      borderColor: configurationCadran.couleurFlash,
                      opacity: animOrnementVerdict.interpolate({
                        inputRange: [0, 0.6, 0.67, 1],
                        outputRange: [0, 0, 1, 0],
                      }),
                      transform: [
                        { rotate: "45deg" },
                        {
                          scale: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.6, 0.67, 1],
                            outputRange: [0.2, 0.2, 1, 1.24],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.cristalCadran,
                    styles.cristal2,
                    {
                      borderColor: configurationCadran.couleurFlash,
                      opacity: animOrnementVerdict.interpolate({
                        inputRange: [0, 0.63, 0.7, 1],
                        outputRange: [0, 0, 1, 0],
                      }),
                      transform: [
                        { rotate: "45deg" },
                        {
                          scale: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.63, 0.7, 1],
                            outputRange: [0.2, 0.2, 1, 1.24],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.cristalCadran,
                    styles.cristal3,
                    {
                      borderColor: configurationCadran.couleurFlash,
                      opacity: animOrnementVerdict.interpolate({
                        inputRange: [0, 0.66, 0.73, 1],
                        outputRange: [0, 0, 1, 0],
                      }),
                      transform: [
                        { rotate: "45deg" },
                        {
                          scale: animOrnementVerdict.interpolate({
                            inputRange: [0, 0.66, 0.73, 1],
                            outputRange: [0.2, 0.2, 1, 1.24],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </>
            ) : null}

            {configurationCadran.afficherEtoiles ? (
              <>
                <OrnementEtoile
                  animation={animOrnementVerdict}
                  couleur={configurationCadran.couleurFlash}
                  style={styles.etoile1}
                  palierDebut={0.6}
                  palierPic={0.67}
                />
                <OrnementEtoile
                  animation={animOrnementVerdict}
                  couleur={configurationCadran.couleurFlash}
                  style={styles.etoile2}
                  palierDebut={0.63}
                  palierPic={0.7}
                />
                <OrnementEtoile
                  animation={animOrnementVerdict}
                  couleur={configurationCadran.couleurFlash}
                  style={styles.etoile3}
                  palierDebut={0.66}
                  palierPic={0.73}
                />
              </>
            ) : null}

            <Text
              style={[
                styles.texteVerdict,
                { color: configurationCadran.couleurTitreCadran },
              ]}
            >
              {configurationCadran.titre}
            </Text>
          </Animated.View>
        ) : null}

        {afficherDetails ? (
          <Animated.View
            style={[
              styles.blocSection,
              {
                opacity: animDetails,
                transform: [
                  {
                    translateY: animDetails.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TextePointsManche
              testID="points-manche-nous"
              texte={`Vous +${resumeFinManche.scoreMancheEquipe1}`}
              estMisEnAvant={resumeFinManche.equipeGagnanteManche === "equipe1"}
              couleurMiseEnAvant={configurationCadran.couleurMiseEnAvant}
            />
            <TextePointsManche
              testID="points-manche-eux"
              texte={`Adversaires +${resumeFinManche.scoreMancheEquipe2}`}
              estMisEnAvant={resumeFinManche.equipeGagnanteManche === "equipe2"}
              couleurMiseEnAvant={configurationCadran.couleurMiseEnAvant}
            />
          </Animated.View>
        ) : null}

        {afficherTotal ? (
          <>
            <View style={styles.separateur} />
            <Animated.View
              style={[
                styles.blocSection,
                {
                  opacity: animTotal,
                  transform: [
                    {
                      translateY: animTotal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.sousTitre}>Score total</Text>

              <LigneScoreTotal
                label="Vous"
                score={compteur1}
                animationEclair={animEclair1}
                couleurEclair={configurationCadran.couleurEclairScore}
              />
              <LigneScoreTotal
                label="Adversaires"
                score={compteur2}
                animationEclair={animEclair2}
                couleurEclair={configurationCadran.couleurEclairScore}
              />
            </Animated.View>
          </>
        ) : null}

        {afficherBouton ? (
          <Animated.View style={{ opacity: animBouton }}>
            <Pressable
              style={[
                styles.bouton,
                { backgroundColor: configurationCadran.couleurBouton },
              ]}
              onPress={onContinuer}
            >
              <Text
                style={[
                  styles.texteBouton,
                  { color: configurationCadran.couleurTexteBouton },
                ]}
              >
                Continuer
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

function TextePointsManche({
  couleurMiseEnAvant,
  estMisEnAvant,
  testID,
  texte,
}: {
  couleurMiseEnAvant: string;
  estMisEnAvant: boolean;
  testID: string;
  texte: string;
}) {
  return (
    <Text
      testID={testID}
      style={[
        styles.textePointsManche,
        estMisEnAvant && { color: couleurMiseEnAvant, fontWeight: "700" },
      ]}
    >
      {texte}
    </Text>
  );
}

function OrnementEtoile({
  animation,
  couleur,
  palierDebut,
  palierPic,
  style,
}: {
  animation: Animated.Value;
  couleur: string;
  palierDebut: number;
  palierPic: number;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.etoileCadran,
        style,
        {
          opacity: animation.interpolate({
            inputRange: [0, palierDebut, palierPic, 1],
            outputRange: [0, 0, 1, 0],
          }),
          transform: [
            {
              scale: animation.interpolate({
                inputRange: [0, palierDebut, palierPic, 1],
                outputRange: [0.2, 0.2, 1.08, 1.25],
              }),
            },
            {
              rotate: animation.interpolate({
                inputRange: [0, palierDebut, palierPic, 1],
                outputRange: ["0deg", "0deg", "45deg", "90deg"],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.brancheEtoileVerticale, { backgroundColor: couleur }]} />
      <View style={[styles.brancheEtoileHorizontale, { backgroundColor: couleur }]} />
    </Animated.View>
  );
}

function LigneScoreTotal({
  animationEclair,
  couleurEclair,
  label,
  score,
}: {
  animationEclair: Animated.Value;
  couleurEclair: string;
  label: string;
  score: number;
}) {
  return (
    <View style={styles.ligneTotal}>
      <Text style={styles.equipe}>{label}</Text>
      <View style={styles.scoreConteneur}>
        <Animated.View
          style={[
            styles.eclairScore,
            {
              backgroundColor: couleurEclair,
              opacity: animationEclair,
              transform: [
                {
                  scaleX: animationEclair.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.3],
                  }),
                },
              ],
            },
          ]}
        />
        <Text style={styles.score}>{score}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  panneau: {
    backgroundColor: "#1a3a2a",
    borderRadius: 20,
    paddingHorizontal: estWeb ? 36 : 26,
    paddingVertical: estWeb ? 28 : 22,
    minWidth: estWeb ? 340 : 286,
    minHeight: estWeb ? 360 : 320,
    gap: estWeb ? 10 : 8,
    borderWidth: 2,
    borderColor: COULEURS.accent,
    shadowColor: COULEURS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  titre: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 24 : 20,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  cadran: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: estWeb ? 82 : 76,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: estWeb ? 12 : 10,
    paddingHorizontal: estWeb ? 16 : 12,
    overflow: "hidden",
  },
  texteVerdict: {
    fontSize: estWeb ? 18 : 16,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  haloCadran: {
    position: "absolute",
    top: -16,
    left: -16,
    right: -16,
    bottom: -16,
    borderRadius: 999,
  },
  flashCadran: {
    position: "absolute",
    left: "-10%",
    right: "-10%",
    top: "50%",
    height: 2,
    marginTop: -1,
  },
  traitCadran: {
    position: "absolute",
    width: 2,
    height: 16,
    borderRadius: 999,
  },
  trait1: {
    top: 10,
    left: 18,
  },
  trait2: {
    top: 12,
    right: 22,
  },
  trait3: {
    bottom: 14,
    left: 44,
  },
  trait4: {
    bottom: 18,
    right: 46,
  },
  cristalCadran: {
    position: "absolute",
    width: 12,
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
  },
  cristal1: {
    top: 10,
    left: 22,
  },
  cristal2: {
    top: 14,
    right: 28,
  },
  cristal3: {
    bottom: 14,
    right: 54,
  },
  etoileCadran: {
    position: "absolute",
    width: 10,
    height: 10,
  },
  etoile1: {
    top: 8,
    left: 26,
  },
  etoile2: {
    top: 14,
    right: 30,
  },
  etoile3: {
    bottom: 16,
    right: 56,
  },
  brancheEtoileVerticale: {
    position: "absolute",
    left: 4,
    top: 0,
    width: 2,
    height: 10,
    borderRadius: 999,
  },
  brancheEtoileHorizontale: {
    position: "absolute",
    left: 0,
    top: 4,
    width: 10,
    height: 2,
    borderRadius: 999,
  },
  blocSection: {
    gap: estWeb ? 8 : 6,
  },
  textePointsManche: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 17 : 15,
    textAlign: "center",
  },
  separateur: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginVertical: estWeb ? 6 : 4,
  },
  sousTitre: {
    color: COULEURS.texteSecondaire,
    fontSize: estWeb ? 12 : 10,
    textTransform: "uppercase",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 4,
  },
  ligneTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 2,
  },
  equipe: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 16 : 14,
  },
  scoreConteneur: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
  },
  score: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 20 : 17,
    fontWeight: "bold",
  },
  eclairScore: {
    position: "absolute",
    width: "120%",
    height: "140%",
    borderRadius: 8,
  },
  bouton: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  texteBouton: {
    fontWeight: "bold",
    fontSize: estWeb ? 16 : 14,
    letterSpacing: 0.3,
  },
});
