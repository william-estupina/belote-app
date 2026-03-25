import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ANIMATIONS_DIALOGUE_FIN_MANCHE } from "../../constants/animations-visuelles";
import { COULEURS } from "../../constants/theme";
import type { ResumeFinManche } from "../../hooks/resume-fin-manche";

interface PropsDialogueFinManche {
  resumeFinManche: ResumeFinManche;
  onContinuer: () => void;
}

const estWeb = Platform.OS === "web";

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
  const [afficherCapot, setAfficherCapot] = useState(false);
  const [afficherTotal, setAfficherTotal] = useState(false);
  const [afficherBouton, setAfficherBouton] = useState(false);

  const animOverlay = useRef(new Animated.Value(0)).current;
  const animPanneau = useRef(new Animated.Value(0)).current;
  const animVerdict = useRef(new Animated.Value(0)).current;
  const animDetails = useRef(new Animated.Value(0)).current;
  const animCapot = useRef(new Animated.Value(0)).current;
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
        if (!resumeFinManche.estCapot) return;
        setAfficherCapot(true);
        animerEntreeBloc(animCapot, ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeAnimationCapot);
      }, ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiCapot),
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
    animCapot,
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

  return (
    <Animated.View style={[styles.overlay, { opacity: animOverlay }]}>
      <Animated.View
        style={[
          styles.panneau,
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
            style={[
              styles.blocVerdict,
              {
                opacity: animVerdict,
                transform: [
                  {
                    translateY: animVerdict.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.texteVerdict}>{resumeFinManche.messageVerdict}</Text>
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
            />
            <TextePointsManche
              testID="points-manche-eux"
              texte={`Adversaires +${resumeFinManche.scoreMancheEquipe2}`}
              estMisEnAvant={resumeFinManche.equipeGagnanteManche === "equipe2"}
            />
          </Animated.View>
        ) : null}

        {afficherCapot ? (
          <Animated.View
            testID="animation-capot"
            style={[
              styles.capot,
              resumeFinManche.equipeCapot === "equipe1"
                ? styles.capotNous
                : styles.capotEux,
              {
                opacity: animCapot,
                transform: [
                  {
                    scale: animCapot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.capotTitre}>Capot</Text>
            <Text style={styles.capotTexte}>
              {resumeFinManche.equipeCapot === "equipe1"
                ? "Vous prenez tous les plis"
                : "Les adversaires prennent tous les plis"}
            </Text>
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
              />
              <LigneScoreTotal
                label="Adversaires"
                score={compteur2}
                animationEclair={animEclair2}
              />
            </Animated.View>
          </>
        ) : null}

        {afficherBouton ? (
          <Animated.View style={{ opacity: animBouton }}>
            <Pressable style={styles.bouton} onPress={onContinuer}>
              <Text style={styles.texteBouton}>Continuer</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

function TextePointsManche({
  estMisEnAvant,
  testID,
  texte,
}: {
  estMisEnAvant: boolean;
  testID: string;
  texte: string;
}) {
  return (
    <Text
      testID={testID}
      style={[styles.textePointsManche, estMisEnAvant && styles.textePointsMisEnAvant]}
    >
      {texte}
    </Text>
  );
}

function LigneScoreTotal({
  animationEclair,
  label,
  score,
}: {
  animationEclair: Animated.Value;
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
  blocVerdict: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: estWeb ? 34 : 30,
  },
  texteVerdict: {
    color: COULEURS.accent,
    fontSize: estWeb ? 22 : 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  blocSection: {
    gap: estWeb ? 8 : 6,
  },
  textePointsManche: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 17 : 15,
    textAlign: "center",
  },
  textePointsMisEnAvant: {
    color: "#ffd700",
    fontWeight: "700",
  },
  capot: {
    borderRadius: 14,
    paddingVertical: estWeb ? 12 : 10,
    paddingHorizontal: estWeb ? 16 : 12,
    alignItems: "center",
    gap: 2,
  },
  capotNous: {
    backgroundColor: "rgba(212, 160, 23, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.35)",
  },
  capotEux: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  capotTitre: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 18 : 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  capotTexte: {
    color: COULEURS.texteSecondaire,
    fontSize: estWeb ? 14 : 12,
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
    backgroundColor: "rgba(212, 160, 23, 0.25)",
  },
  bouton: {
    backgroundColor: COULEURS.boutonPrimaire,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  texteBouton: {
    color: COULEURS.boutonPrimaireTexte,
    fontWeight: "bold",
    fontSize: estWeb ? 16 : 14,
    letterSpacing: 0.3,
  },
});
