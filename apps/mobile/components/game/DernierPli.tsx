import type { Couleur, PliComplete, PositionJoueur, Rang } from "@belote/shared-types";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

interface PropsDernierPli {
  dernierPli: PliComplete;
  precedentDernierPli?: PliComplete | null;
  transitionDernierPliActive?: boolean;
  dureeTransitionDernierPliMs?: number;
  cleTransitionDernierPli?: number;
}

const estWeb = Platform.OS === "web";
const LARGEUR_JETON = estWeb ? 58 : 54;
const HAUTEUR_JETON = estWeb ? 34 : 32;
const TAILLE_ZONE = estWeb ? 148 : 136;
const LARGEUR_CONTENEUR = estWeb ? 188 : 176;
const HAUTEUR_CONTENU = TAILLE_ZONE + (estWeb ? 24 : 22);
const DECALAGE_ENTRANT = 4;
const DECALAGE_SORTANT = -2;

interface EtatInitialTransitionDernierPli {
  opaciteEntrante: number;
  translationEntrante: number;
  opaciteSortante: number;
  translationSortante: number;
}

interface CiblesTransitionDernierPli {
  opaciteEntrante: number;
  translationEntrante: number;
  opaciteSortante: number;
  translationSortante: number;
}

interface TrajectoireMarqueurGagnant {
  depart: { top: number; left: number };
  arrivee: { top: number; left: number };
}

const LIBELLES_RANG: Record<Rang, string> = {
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  valet: "V",
  dame: "D",
  roi: "R",
  as: "A",
};

const SYMBOLES_COULEUR: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

const COULEURS_TEXTE_COULEUR: Record<Couleur, string> = {
  coeur: "#b63a3a",
  carreau: "#b63a3a",
  pique: "#1f2b33",
  trefle: "#1f2b33",
};

function positionsCroix(): Record<PositionJoueur, { top: number; left: number }> {
  return {
    nord: {
      top: 0,
      left: (TAILLE_ZONE - LARGEUR_JETON) / 2,
    },
    sud: {
      top: TAILLE_ZONE - HAUTEUR_JETON,
      left: (TAILLE_ZONE - LARGEUR_JETON) / 2,
    },
    ouest: {
      top: (TAILLE_ZONE - HAUTEUR_JETON) / 2,
      left: 0,
    },
    est: {
      top: (TAILLE_ZONE - HAUTEUR_JETON) / 2,
      left: TAILLE_ZONE - LARGEUR_JETON,
    },
  };
}

const POSITIONS = positionsCroix();

function formaterCarte(rang: Rang, couleur: Couleur): string {
  return `${LIBELLES_RANG[rang]} ${SYMBOLES_COULEUR[couleur]}`;
}

function calculerPositionJeton(joueur: PositionJoueur): { top: number; left: number } {
  return POSITIONS[joueur];
}

export function calculerEtatInitialTransitionDernierPli({
  precedentDernierPli,
  transitionDernierPliActive,
}: {
  precedentDernierPli?: PliComplete | null;
  transitionDernierPliActive?: boolean;
}): EtatInitialTransitionDernierPli {
  if (!transitionDernierPliActive || !precedentDernierPli) {
    return {
      opaciteEntrante: 1,
      translationEntrante: 0,
      opaciteSortante: 1,
      translationSortante: 0,
    };
  }

  return {
    opaciteEntrante: 0,
    translationEntrante: DECALAGE_ENTRANT,
    opaciteSortante: 1,
    translationSortante: 0,
  };
}

export function calculerCiblesTransitionDernierPli(): CiblesTransitionDernierPli {
  return {
    opaciteEntrante: 1,
    translationEntrante: 0,
    opaciteSortante: 0,
    translationSortante: DECALAGE_SORTANT,
  };
}

export function calculerTrajectoireMarqueurGagnant({
  dernierPli,
  precedentDernierPli,
  transitionDernierPliActive,
}: {
  dernierPli: PliComplete;
  precedentDernierPli?: PliComplete | null;
  transitionDernierPliActive?: boolean;
}): TrajectoireMarqueurGagnant | null {
  if (!transitionDernierPliActive || !precedentDernierPli) {
    return null;
  }

  return {
    depart: calculerPositionJeton(precedentDernierPli.gagnant),
    arrivee: calculerPositionJeton(dernierPli.gagnant),
  };
}

interface PropsContenuDernierPli {
  dernierPli: PliComplete;
  prefixeTestId?: string;
  afficherMarqueurGagnant?: boolean;
}

interface PropsOrnementGagnant {
  prefixeTestId?: string;
  joueur?: PositionJoueur;
}

function OrnementGagnant({ prefixeTestId = "", joueur }: PropsOrnementGagnant) {
  const suffixe = joueur ? `-${joueur}` : "";

  return (
    <>
      <View
        testID={`${prefixeTestId}surbrillance-gagnant${suffixe}`}
        style={styles.surbrillanceGagnant}
      />
      <View
        testID={`${prefixeTestId}anneau-gagnant${suffixe}`}
        style={styles.anneauGagnant}
      />
      <View
        testID={`${prefixeTestId}ruban-gagnant${suffixe}`}
        style={styles.rubanGagnant}
      >
        <Text style={styles.texteRubanGagnant}>1</Text>
      </View>
    </>
  );
}

function ContenuDernierPli({
  dernierPli,
  prefixeTestId = "",
  afficherMarqueurGagnant = true,
}: PropsContenuDernierPli) {
  return (
    <>
      <View style={styles.enTete}>
        <Text style={styles.titre}>Dernier pli</Text>
        <Text style={styles.pointsBadge}>{dernierPli.points} pts</Text>
      </View>

      <View style={[styles.plateauCompact, { width: TAILLE_ZONE, height: TAILLE_ZONE }]}>
        {dernierPli.cartes.map(({ joueur, carte }) => {
          const estGagnant = joueur === dernierPli.gagnant;
          const position = POSITIONS[joueur];

          return (
            <View
              key={`dernier-pli-${prefixeTestId}${joueur}`}
              testID={`${prefixeTestId}jeton-dernier-pli-${joueur}`}
              style={[styles.jeton, { top: position.top, left: position.left }]}
            >
              {estGagnant && afficherMarqueurGagnant ? (
                <OrnementGagnant prefixeTestId={prefixeTestId} joueur={joueur} />
              ) : null}
              <Text
                testID={`${prefixeTestId}texte-dernier-pli-${joueur}`}
                style={[
                  styles.texteJeton,
                  { color: COULEURS_TEXTE_COULEUR[carte.couleur] },
                ]}
              >
                {formaterCarte(carte.rang, carte.couleur)}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

export function DernierPli({
  dernierPli,
  precedentDernierPli = null,
  transitionDernierPliActive = false,
  dureeTransitionDernierPliMs = 0,
  cleTransitionDernierPli = 0,
}: PropsDernierPli) {
  const trajectoireMarqueurGagnant = calculerTrajectoireMarqueurGagnant({
    dernierPli,
    precedentDernierPli,
    transitionDernierPliActive,
  });
  const etatInitialTransition = calculerEtatInitialTransitionDernierPli({
    precedentDernierPli,
    transitionDernierPliActive,
  });
  const opaciteEntrante = useRef(
    new Animated.Value(etatInitialTransition.opaciteEntrante),
  ).current;
  const translationEntrante = useRef(
    new Animated.Value(etatInitialTransition.translationEntrante),
  ).current;
  const opaciteSortante = useRef(
    new Animated.Value(etatInitialTransition.opaciteSortante),
  ).current;
  const translationSortante = useRef(
    new Animated.Value(etatInitialTransition.translationSortante),
  ).current;
  const topMarqueurGagnant = useRef(
    new Animated.Value(trajectoireMarqueurGagnant?.depart.top ?? 0),
  ).current;
  const leftMarqueurGagnant = useRef(
    new Animated.Value(trajectoireMarqueurGagnant?.depart.left ?? 0),
  ).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      animationRef.current?.stop();
    };
  }, []);

  useLayoutEffect(() => {
    animationRef.current?.stop();

    const etatInitial = calculerEtatInitialTransitionDernierPli({
      precedentDernierPli,
      transitionDernierPliActive,
    });
    opaciteEntrante.setValue(etatInitial.opaciteEntrante);
    translationEntrante.setValue(etatInitial.translationEntrante);
    opaciteSortante.setValue(etatInitial.opaciteSortante);
    translationSortante.setValue(etatInitial.translationSortante);

    if (trajectoireMarqueurGagnant) {
      topMarqueurGagnant.setValue(trajectoireMarqueurGagnant.depart.top);
      leftMarqueurGagnant.setValue(trajectoireMarqueurGagnant.depart.left);
    }

    if (!transitionDernierPliActive || !precedentDernierPli) {
      return;
    }

    const ciblesTransition = calculerCiblesTransitionDernierPli();
    const easing = Easing.inOut(Easing.quad);
    const animation = Animated.parallel([
      Animated.timing(opaciteEntrante, {
        toValue: ciblesTransition.opaciteEntrante,
        duration: dureeTransitionDernierPliMs,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(translationEntrante, {
        toValue: ciblesTransition.translationEntrante,
        duration: dureeTransitionDernierPliMs,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(opaciteSortante, {
        toValue: ciblesTransition.opaciteSortante,
        duration: dureeTransitionDernierPliMs,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(translationSortante, {
        toValue: ciblesTransition.translationSortante,
        duration: dureeTransitionDernierPliMs,
        easing,
        useNativeDriver: false,
      }),
      ...(trajectoireMarqueurGagnant
        ? [
            Animated.timing(topMarqueurGagnant, {
              toValue: trajectoireMarqueurGagnant.arrivee.top,
              duration: dureeTransitionDernierPliMs,
              easing,
              useNativeDriver: false,
            }),
            Animated.timing(leftMarqueurGagnant, {
              toValue: trajectoireMarqueurGagnant.arrivee.left,
              duration: dureeTransitionDernierPliMs,
              easing,
              useNativeDriver: false,
            }),
          ]
        : []),
    ]);

    animationRef.current = animation;
    animation.start();
  }, [
    cleTransitionDernierPli,
    dureeTransitionDernierPliMs,
    opaciteEntrante,
    opaciteSortante,
    precedentDernierPli,
    topMarqueurGagnant,
    transitionDernierPliActive,
    trajectoireMarqueurGagnant,
    translationEntrante,
    translationSortante,
    leftMarqueurGagnant,
  ]);

  return (
    <View style={styles.conteneur}>
      <View style={styles.zoneTransition}>
        {transitionDernierPliActive && precedentDernierPli ? (
          <>
            <Animated.View
              testID="couche-dernier-pli-sortante"
              style={[
                styles.couchePli,
                {
                  opacity: opaciteSortante,
                  transform: [{ translateY: translationSortante }],
                },
              ]}
            >
              <ContenuDernierPli
                dernierPli={precedentDernierPli}
                afficherMarqueurGagnant={false}
              />
            </Animated.View>

            <Animated.View
              testID="couche-dernier-pli-entrante"
              style={[
                styles.couchePli,
                styles.coucheSuperposee,
                {
                  opacity: opaciteEntrante,
                  transform: [{ translateY: translationEntrante }],
                },
              ]}
            >
              <ContenuDernierPli
                dernierPli={dernierPli}
                prefixeTestId="entrant-"
                afficherMarqueurGagnant={false}
              />
            </Animated.View>

            {trajectoireMarqueurGagnant ? (
              <Animated.View
                testID="marqueur-gagnant-transition"
                pointerEvents="none"
                style={[
                  styles.marqueurGagnantTransition,
                  {
                    top: topMarqueurGagnant,
                    left: leftMarqueurGagnant,
                  },
                ]}
              >
                <OrnementGagnant prefixeTestId="transition-" />
              </Animated.View>
            ) : null}
          </>
        ) : (
          <Animated.View testID="couche-dernier-pli-principale" style={styles.couchePli}>
            <ContenuDernierPli dernierPli={dernierPli} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    top: estWeb ? 8 : 4,
    right: estWeb ? 8 : 40,
    width: LARGEUR_CONTENEUR,
    backgroundColor: "rgba(0, 0, 0, 0.56)",
    borderRadius: estWeb ? 28 : 24,
    paddingHorizontal: estWeb ? 12 : 10,
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: "center",
    zIndex: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    overflow: "hidden",
  },
  zoneTransition: {
    width: "100%",
    minHeight: HAUTEUR_CONTENU,
    position: "relative",
  },
  couchePli: {
    width: "100%",
  },
  coucheSuperposee: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  enTete: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  titre: {
    color: "#ffffffcc",
    fontSize: estWeb ? 12 : 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pointsBadge: {
    color: COULEURS.accent,
    fontSize: estWeb ? 12 : 11,
    fontWeight: "700",
  },
  plateauCompact: {
    position: "relative",
  },
  jeton: {
    position: "absolute",
    width: LARGEUR_JETON,
    height: HAUTEUR_JETON,
    borderRadius: 999,
    backgroundColor: "#fbf4e6",
    borderWidth: 1,
    borderColor: "rgba(44, 30, 18, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COULEURS.ombre,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    overflow: "visible",
  },
  surbrillanceGagnant: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderColor: "#f3d36b",
    borderWidth: 2,
    shadowColor: "#f5cf63",
    shadowOpacity: 0.38,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 2,
  },
  marqueurGagnantTransition: {
    position: "absolute",
    width: LARGEUR_JETON,
    height: HAUTEUR_JETON,
    zIndex: 4,
    overflow: "visible",
  },
  anneauGagnant: {
    position: "absolute",
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(245, 207, 99, 0.95)",
    shadowColor: "#f5cf63",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 6,
  },
  texteJeton: {
    fontSize: estWeb ? 15 : 14,
    fontWeight: "800",
    letterSpacing: 0.3,
    paddingHorizontal: estWeb ? 6 : 5,
  },
  rubanGagnant: {
    position: "absolute",
    top: -7,
    right: -2,
    minWidth: 18,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: "#e7b93b",
    borderWidth: 1,
    borderColor: "#fff1b0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#e7b93b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 5,
    transform: [{ rotate: "8deg" }],
    zIndex: 3,
  },
  texteRubanGagnant: {
    color: "#4a3200",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 11,
  },
});
