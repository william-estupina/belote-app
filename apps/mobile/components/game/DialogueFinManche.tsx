// Dialogue animé de fin de manche — affiche les scores avec animation de comptage
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

import { COULEURS } from "../../constants/theme";

interface PropsDialogueFinManche {
  scoreMancheEquipe1: number;
  scoreMancheEquipe2: number;
  scoreEquipe1: number;
  scoreEquipe2: number;
  onContinuer: () => void;
}

const estWeb = Platform.OS === "web";

// Durées des phases d'animation (ms)
const _DUREE_ENTREE_PANNEAU = 300;
const DELAI_SCORES_MANCHE = 200;
const DUREE_APPARITION_MANCHE = 400;
const DELAI_SECTION_TOTAL = 800;
const DUREE_APPARITION_TOTAL = 300;
const DELAI_COMPTAGE = 1200;
const DUREE_COMPTAGE = 800;
const DELAI_BOUTON = 2200;
const DUREE_APPARITION_BOUTON = 300;

/** Hook : anime un nombre de `debut` à `fin` sur `duree` ms, démarré après `delai` ms */
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

  // Compteurs animés
  const compteur1 = useCompteurAnime(
    ancienScore1,
    scoreEquipe1,
    DELAI_COMPTAGE,
    DUREE_COMPTAGE,
  );
  const compteur2 = useCompteurAnime(
    ancienScore2,
    scoreEquipe2,
    DELAI_COMPTAGE,
    DUREE_COMPTAGE,
  );

  // --- Animations Animated ---
  const animPanneau = useRef(new Animated.Value(0)).current;
  const animScoresManche = useRef(new Animated.Value(0)).current;
  const animSectionTotal = useRef(new Animated.Value(0)).current;
  const animBouton = useRef(new Animated.Value(0)).current;
  const animOverlay = useRef(new Animated.Value(0)).current;

  // Animations d'éclair doré pendant le comptage
  const animEclair1 = useRef(new Animated.Value(0)).current;
  const animEclair2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Overlay fondu
    Animated.timing(animOverlay, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Panneau : scale + fade
    Animated.spring(animPanneau, {
      toValue: 1,
      delay: 100,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Scores de la manche : slide up + fade
    Animated.timing(animScoresManche, {
      toValue: 1,
      delay: DELAI_SCORES_MANCHE,
      duration: DUREE_APPARITION_MANCHE,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();

    // Section total : fade
    Animated.timing(animSectionTotal, {
      toValue: 1,
      delay: DELAI_SECTION_TOTAL,
      duration: DUREE_APPARITION_TOTAL,
      useNativeDriver: true,
    }).start();

    // Éclairs dorés pendant le comptage
    const demarrerEclair = (anim: Animated.Value) =>
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: DUREE_COMPTAGE - 200,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]);

    Animated.parallel([
      Animated.delay(DELAI_COMPTAGE).start === undefined
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

    // Lancer les éclairs avec délai
    setTimeout(() => {
      if (scoreMancheEquipe1 > 0) demarrerEclair(animEclair1).start();
      if (scoreMancheEquipe2 > 0) demarrerEclair(animEclair2).start();
    }, DELAI_COMPTAGE);

    // Bouton : fade in
    Animated.timing(animBouton, {
      toValue: 1,
      delay: DELAI_BOUTON,
      duration: DUREE_APPARITION_BOUTON,
      useNativeDriver: true,
    }).start();
  }, []);

  // Equipe gagnante de la manche (pour le style doré)
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

        {/* Points de la manche — slide in */}
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

        {/* Score total — fade in puis comptage */}
        <Animated.View style={{ opacity: animSectionTotal }}>
          <Text style={styles.sousTitre}>Score total</Text>

          {/* Équipe 1 */}
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

          {/* Équipe 2 */}
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

        {/* Bouton Continuer — fade in à la fin */}
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
