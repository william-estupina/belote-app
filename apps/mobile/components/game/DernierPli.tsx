import type { Couleur, PliComplete, PositionJoueur, Rang } from "@belote/shared-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

interface PropsDernierPli {
  dernierPli: PliComplete;
}

const estWeb = Platform.OS === "web";
const LARGEUR_JETON = estWeb ? 58 : 54;
const HAUTEUR_JETON = estWeb ? 34 : 32;
const TAILLE_ZONE = estWeb ? 148 : 136;
const LARGEUR_CONTENEUR = estWeb ? 188 : 176;
const HAUTEUR_CONTENU = TAILLE_ZONE + (estWeb ? 24 : 22);
const DUREE_TRANSITION = 320;
const DECALAGE_ENTRANT = 10;
const DECALAGE_SORTANT = -6;

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

function creerSignatureDernierPli(dernierPli: PliComplete): string {
  const cartes = dernierPli.cartes
    .map(({ joueur, carte }) => `${joueur}:${carte.couleur}:${carte.rang}`)
    .join("|");
  return `${dernierPli.gagnant}-${dernierPli.points}-${cartes}`;
}

interface PropsContenuDernierPli {
  dernierPli: PliComplete;
  prefixeTestId?: string;
}

function ContenuDernierPli({ dernierPli, prefixeTestId = "" }: PropsContenuDernierPli) {
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
              style={[
                styles.jeton,
                { top: position.top, left: position.left },
                estGagnant && styles.jetonGagnant,
              ]}
            >
              {estGagnant && (
                <View
                  testID={`${prefixeTestId}anneau-gagnant-${joueur}`}
                  style={styles.anneauGagnant}
                />
              )}
              <Text
                testID={`${prefixeTestId}texte-dernier-pli-${joueur}`}
                style={[
                  styles.texteJeton,
                  { color: COULEURS_TEXTE_COULEUR[carte.couleur] },
                ]}
              >
                {formaterCarte(carte.rang, carte.couleur)}
              </Text>
              {estGagnant && (
                <View
                  testID={`${prefixeTestId}ruban-gagnant-${joueur}`}
                  style={styles.rubanGagnant}
                >
                  <Text style={styles.texteRubanGagnant}>1</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </>
  );
}

export function DernierPli({ dernierPli }: PropsDernierPli) {
  const signatureRecue = useMemo(
    () => creerSignatureDernierPli(dernierPli),
    [dernierPli],
  );
  const [pliAffiche, setPliAffiche] = useState(dernierPli);
  const [signatureAffichee, setSignatureAffichee] = useState(signatureRecue);
  const [pliSortant, setPliSortant] = useState<PliComplete | null>(null);
  const opaciteEntrante = useRef(new Animated.Value(1)).current;
  const translationEntrante = useRef(new Animated.Value(0)).current;
  const echelleEntrante = useRef(new Animated.Value(1)).current;
  const opaciteSortante = useRef(new Animated.Value(1)).current;
  const translationSortante = useRef(new Animated.Value(0)).current;
  const echelleSortante = useRef(new Animated.Value(1)).current;
  const opaciteLueur = useRef(new Animated.Value(0)).current;
  const echelleLueur = useRef(new Animated.Value(0.92)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      animationRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (signatureRecue === signatureAffichee) {
      setPliAffiche(dernierPli);
      return;
    }

    animationRef.current?.stop();
    setPliSortant(pliAffiche);
    setPliAffiche(dernierPli);
    setSignatureAffichee(signatureRecue);

    opaciteEntrante.setValue(0);
    translationEntrante.setValue(DECALAGE_ENTRANT);
    echelleEntrante.setValue(0.97);
    opaciteSortante.setValue(1);
    translationSortante.setValue(0);
    echelleSortante.setValue(1);
    opaciteLueur.setValue(0);
    echelleLueur.setValue(0.92);

    const easing = Easing.out(Easing.cubic);
    const animation = Animated.parallel([
      Animated.timing(opaciteEntrante, {
        toValue: 1,
        duration: DUREE_TRANSITION,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(translationEntrante, {
        toValue: 0,
        duration: DUREE_TRANSITION,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(echelleEntrante, {
        toValue: 1,
        duration: DUREE_TRANSITION,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(opaciteSortante, {
        toValue: 0.4,
        duration: DUREE_TRANSITION,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(translationSortante, {
        toValue: DECALAGE_SORTANT,
        duration: DUREE_TRANSITION,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(echelleSortante, {
        toValue: 0.97,
        duration: DUREE_TRANSITION,
        easing,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opaciteLueur, {
            toValue: 0.22,
            duration: 140,
            easing,
            useNativeDriver: false,
          }),
          Animated.timing(echelleLueur, {
            toValue: 1,
            duration: 140,
            easing,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opaciteLueur, {
            toValue: 0,
            duration: 180,
            easing,
            useNativeDriver: false,
          }),
          Animated.timing(echelleLueur, {
            toValue: 1.06,
            duration: 180,
            easing,
            useNativeDriver: false,
          }),
        ]),
      ]),
    ]);

    animationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) {
        setPliSortant(null);
      }
    });
  }, [
    dernierPli,
    echelleEntrante,
    echelleLueur,
    echelleSortante,
    opaciteEntrante,
    opaciteLueur,
    opaciteSortante,
    pliAffiche,
    signatureAffichee,
    signatureRecue,
    translationEntrante,
    translationSortante,
  ]);

  return (
    <View style={styles.conteneur}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.lueurTransition,
          {
            opacity: opaciteLueur,
            transform: [{ scale: echelleLueur }],
          },
        ]}
      />

      <View style={styles.zoneTransition}>
        {pliSortant && (
          <Animated.View
            testID="couche-dernier-pli-sortante"
            style={[
              styles.couchePli,
              styles.coucheSuperposee,
              {
                opacity: opaciteSortante,
                transform: [
                  { translateY: translationSortante },
                  { scale: echelleSortante },
                ],
              },
            ]}
          >
            <ContenuDernierPli dernierPli={pliSortant} prefixeTestId="sortant-" />
          </Animated.View>
        )}

        <Animated.View
          testID={
            pliSortant ? "couche-dernier-pli-entrante" : "couche-dernier-pli-principale"
          }
          style={[
            styles.couchePli,
            pliSortant && styles.coucheSuperposee,
            {
              opacity: pliSortant ? opaciteEntrante : 1,
              transform: pliSortant
                ? [{ translateY: translationEntrante }, { scale: echelleEntrante }]
                : undefined,
            },
          ]}
        >
          <ContenuDernierPli dernierPli={pliAffiche} />
        </Animated.View>
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
  lueurTransition: {
    position: "absolute",
    top: estWeb ? 34 : 30,
    left: 20,
    right: 20,
    height: estWeb ? 110 : 96,
    borderRadius: 999,
    backgroundColor: "rgba(245, 207, 99, 0.22)",
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
  jetonGagnant: {
    borderColor: "#f3d36b",
    borderWidth: 2,
    shadowColor: "#f5cf63",
    shadowOpacity: 0.38,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 2,
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
