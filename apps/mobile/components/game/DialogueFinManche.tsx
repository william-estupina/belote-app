// Dialogue anime de fin de manche : affiche les scores avec animation de comptage
import { useEffect, useRef, useState } from "react";
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

interface PropsDialogueFinManche {
  scoreMancheEquipe1: number;
  scoreMancheEquipe2: number;
  scoreEquipe1: number;
  scoreEquipe2: number;
  onContinuer: () => void;
}

const estWeb = Platform.OS === "web";

/** Hook : anime un nombre de `debut` a `fin` sur `duree` ms, demarre apres `delai` ms */
function useCompteurAnime(
  debut: number,
  fin: number,
  delai: number,
  duree: number,
): number {
  const [valeur, setValeur] = useState(debut);
  const debutRef = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      debutRef.current = Date.now();
      const interval = setInterval(() => {
        const progression = Math.min((Date.now() - debutRef.current) / duree, 1);
        // Ease-out cubique
        const eased = 1 - Math.pow(1 - progression, 3);
        setValeur(Math.round(debut + (fin - debut) * eased));
        if (progression >= 1) clearInterval(interval);
      }, 16);
      return () => clearInterval(interval);
    }, delai);
    return () => clearTimeout(timeout);
  }, [debut, fin, delai, duree]);

  return valeur;
}

export function DialogueFinManche({
  scoreMancheEquipe1,
  scoreMancheEquipe2,
  scoreEquipe1,
  scoreEquipe2,
  onContinuer,
}: PropsDialogueFinManche) {
  // Scores avant cette manche
  const ancienScore1 = scoreEquipe1 - scoreMancheEquipe1;
  const ancienScore2 = scoreEquipe2 - scoreMancheEquipe2;

  // Compteurs animes
  const compteur1 = useCompteurAnime(
    ancienScore1,
    scoreEquipe1,
    ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiComptage,
    ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeComptage,
  );
  const compteur2 = useCompteurAnime(
    ancienScore2,
    scoreEquipe2,
    ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiComptage,
    ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeComptage,
  );

  // --- Animations Animated ---
  const animPanneau = useRef(new Animated.Value(0)).current;
  const animScoresManche = useRef(new Animated.Value(0)).current;
  const animSectionTotal = useRef(new Animated.Value(0)).current;
  const animBouton = useRef(new Animated.Value(0)).current;
  const animOverlay = useRef(new Animated.Value(0)).current;

  // Animations d'eclair dore pendant le comptage
  const animEclair1 = useRef(new Animated.Value(0)).current;
  const animEclair2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Overlay fondu
    Animated.timing(animOverlay, {
      toValue: 1,
      duration: ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeFonduOverlay,
      useNativeDriver: true,
    }).start();

    // Panneau : scale + fade
    Animated.spring(animPanneau, {
      toValue: 1,
      delay: ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiEntreePanneau,
      tension: ANIMATIONS_DIALOGUE_FIN_MANCHE.tensionEntreePanneau,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Scores de la manche : slide up + fade
    Animated.timing(animScoresManche, {
      toValue: 1,
      delay: ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiScoresManche,
      duration: ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeApparitionManche,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();

    // Section total : fade
    Animated.timing(animSectionTotal, {
      toValue: 1,
      delay: ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiSectionTotal,
      duration: ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeApparitionTotal,
      useNativeDriver: true,
    }).start();

    // Eclairs dores pendant le comptage
    const demarrerEclair = (anim: Animated.Value) =>
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: ANIMATIONS_DIALOGUE_FIN_MANCHE.dureePicEclair,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration:
            ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeComptage -
            ANIMATIONS_DIALOGUE_FIN_MANCHE.dureePicEclair,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeSortieEclair,
          useNativeDriver: true,
        }),
      ]);

    Animated.parallel([
      Animated.delay(ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiComptage).start === undefined
        ? Animated.timing(new Animated.Value(0), {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        : Animated.timing(new Animated.Value(0), {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
    ]);

    // Lancer les eclairs avec delai
    setTimeout(() => {
      if (scoreMancheEquipe1 > 0) demarrerEclair(animEclair1).start();
      if (scoreMancheEquipe2 > 0) demarrerEclair(animEclair2).start();
    }, ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiComptage);

    // Bouton : fade in
    Animated.timing(animBouton, {
      toValue: 1,
      delay: ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiBouton,
      duration: ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeApparitionBouton,
      useNativeDriver: true,
    }).start();
  }, []);

  // Equipe gagnante de la manche (pour le style dore)
  const equipe1Gagne = scoreMancheEquipe1 > scoreMancheEquipe2;
  const equipe2Gagne = scoreMancheEquipe2 > scoreMancheEquipe1;

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
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        {/* Titre */}
        <Text style={styles.titre}>Fin de manche</Text>

        {/* Points de la manche : slide in */}
        <Animated.View
          style={{
            opacity: animScoresManche,
            transform: [
              {
                translateY: animScoresManche.interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, 0],
                }),
              },
            ],
          }}
        >
          <View style={styles.blocManche}>
            <LigneScoreManche
              label="Vous"
              points={scoreMancheEquipe1}
              estGagnant={equipe1Gagne}
            />
            <LigneScoreManche
              label="Adversaires"
              points={scoreMancheEquipe2}
              estGagnant={equipe2Gagne}
            />
          </View>
        </Animated.View>

        <View style={styles.separateur} />

        {/* Score total : fade in puis comptage */}
        <Animated.View style={{ opacity: animSectionTotal }}>
          <Text style={styles.sousTitre}>Score total</Text>

          {/* Equipe 1 */}
          <View style={styles.ligneTotal}>
            <Text style={styles.equipe}>Vous</Text>
            <View style={styles.scoreConteneur}>
              <Animated.View
                style={[
                  styles.eclairScore,
                  {
                    opacity: animEclair1,
                    transform: [
                      {
                        scaleX: animEclair1.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1.3],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Text style={styles.score}>{compteur1}</Text>
            </View>
          </View>

          {/* Equipe 2 */}
          <View style={styles.ligneTotal}>
            <Text style={styles.equipe}>Adversaires</Text>
            <View style={styles.scoreConteneur}>
              <Animated.View
                style={[
                  styles.eclairScore,
                  {
                    opacity: animEclair2,
                    transform: [
                      {
                        scaleX: animEclair2.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1.3],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Text style={styles.score}>{compteur2}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Bouton Continuer : fade in a la fin */}
        <Animated.View style={{ opacity: animBouton }}>
          <Pressable style={styles.bouton} onPress={onContinuer}>
            <Text style={styles.texteBouton}>Continuer</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

// --- Sous-composant : ligne de score de manche ---

function LigneScoreManche({
  label,
  points,
  estGagnant,
}: {
  label: string;
  points: number;
  estGagnant: boolean;
}) {
  return (
    <View style={styles.ligneManche}>
      <Text style={[styles.equipe, estGagnant && styles.equipeGagnante]}>{label}</Text>
      <View style={styles.pointsConteneur}>
        <Text style={[styles.pointsValeur, estGagnant && styles.pointsGagnant]}>
          +{points}
        </Text>
        <Text style={[styles.pointsUnite, estGagnant && styles.pointsGagnant]}>pts</Text>
      </View>
    </View>
  );
}

// --- Styles ---

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
    minWidth: estWeb ? 320 : 270,
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
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  blocManche: {
    gap: estWeb ? 8 : 6,
  },
  ligneManche: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pointsConteneur: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  pointsValeur: {
    color: COULEURS.accent,
    fontSize: estWeb ? 22 : 18,
    fontWeight: "bold",
  },
  pointsUnite: {
    color: COULEURS.accent,
    fontSize: estWeb ? 13 : 11,
    fontWeight: "600",
    opacity: 0.8,
  },
  pointsGagnant: {
    color: "#ffd700",
  },
  equipe: {
    color: COULEURS.textePrincipal,
    fontSize: estWeb ? 16 : 14,
  },
  equipeGagnante: {
    fontWeight: "bold",
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
