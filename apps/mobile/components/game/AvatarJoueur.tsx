// Avatar d'un joueur — affiche l'identité, le statut d'enchère et l'indicateur preneur/atout
import type { ActionEnchere, Couleur, PositionJoueur } from "@belote/shared-types";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";

// --- Constantes visuelles ---

const SYMBOLES_COULEUR: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

const COULEURS_SYMBOLE: Record<Couleur, string> = {
  coeur: "#ff4444",
  carreau: "#ff4444",
  pique: "#ffffff",
  trefle: "#ffffff",
};

const FONDS_ATOUT: Record<Couleur, string> = {
  coeur: "rgba(180, 30, 30, 0.85)",
  carreau: "rgba(180, 30, 30, 0.85)",
  pique: "rgba(40, 40, 60, 0.85)",
  trefle: "rgba(40, 40, 60, 0.85)",
};

const NOMS_JOUEUR: Record<PositionJoueur, string> = {
  sud: "Vous",
  nord: "Nord",
  ouest: "Ouest",
  est: "Est",
};

const COULEURS_AVATAR: Record<PositionJoueur, string> = {
  sud: "#4A90D9",
  nord: "#D94A4A",
  ouest: "#D9964A",
  est: "#8B4AD9",
};

const INITIALES: Record<PositionJoueur, string> = {
  sud: "V",
  nord: "N",
  ouest: "O",
  est: "E",
};

// Positions des avatars — sud : près des cartes ; ouest/est : devant le fan
const POSITIONS_AVATAR: Record<PositionJoueur, { x: number; y: number }> = {
  sud: { x: 0.24, y: 0.78 }, // collé au bord gauche du fan en bas
  nord: { x: 0.65, y: 0.12 }, // à droite du fan horizontal en haut
  ouest: { x: 0.11, y: 0.5 }, // devant le fan vertical (entre cartes et centre)
  est: { x: 0.87, y: 0.5 }, // devant le fan vertical (entre cartes et centre)
};

const estWeb = Platform.OS === "web";
const TAILLE_AVATAR = estWeb ? 52 : 44;

// --- Props ---

interface PropsAvatarJoueur {
  position: PositionJoueur;
  largeurEcran: number;
  hauteurEcran: number;
  estActif: boolean;
  actionEnchere: ActionEnchere | null;
  estPreneur: boolean;
  couleurAtout: Couleur | null;
  phaseUI: string;
}

// --- Composant ---

export function AvatarJoueur({
  position,
  largeurEcran,
  hauteurEcran,
  estActif,
  actionEnchere,
  estPreneur,
  couleurAtout,
  phaseUI,
}: PropsAvatarJoueur) {
  const opacitePulse = useRef(new Animated.Value(1)).current;

  // Animation de pulsation quand c'est le tour du joueur
  useEffect(() => {
    if (estActif) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacitePulse, {
            toValue: 0.4,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacitePulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      opacitePulse.setValue(1);
    }
  }, [estActif, opacitePulse]);

  // Ne pas afficher en phase inactif
  if (phaseUI === "inactif") return null;

  const coord = POSITIONS_AVATAR[position];
  const left = coord.x * largeurEcran - TAILLE_AVATAR / 2;
  const top = coord.y * hauteurEcran - TAILLE_AVATAR / 2;

  // Déterminer le badge à afficher
  const badge = determineBadge(phaseUI, actionEnchere, estPreneur, couleurAtout);

  return (
    <View style={[styles.conteneur, { left, top }]} pointerEvents="none">
      {/* Avatar circulaire avec pulsation si actif */}
      <Animated.View
        style={[
          styles.avatar,
          {
            backgroundColor: COULEURS_AVATAR[position],
            borderColor: estActif ? "#ffffff" : "rgba(255,255,255,0.3)",
            borderWidth: estActif ? 2 : 1,
          },
          estActif && { opacity: opacitePulse },
        ]}
      >
        <Text style={styles.initiale}>{INITIALES[position]}</Text>
      </Animated.View>

      {/* Nom du joueur */}
      <Text style={styles.nom}>{NOMS_JOUEUR[position]}</Text>

      {/* Badge contextuel (enchère ou preneur) */}
      {badge && (
        <View style={[styles.badge, { backgroundColor: badge.fond }]}>
          <Text style={[styles.texteBadge, { color: badge.couleurTexte }]}>
            {badge.texte}
          </Text>
        </View>
      )}
    </View>
  );
}

// --- Logique du badge ---

interface Badge {
  texte: string;
  fond: string;
  couleurTexte: string;
}

function determineBadge(
  phaseUI: string,
  actionEnchere: ActionEnchere | null,
  estPreneur: boolean,
  couleurAtout: Couleur | null,
): Badge | null {
  // Pendant les enchères : afficher la dernière action du joueur
  if (phaseUI === "encheres" && actionEnchere) {
    switch (actionEnchere.type) {
      case "PASSER":
        return {
          texte: "Passe",
          fond: "rgba(0,0,0,0.6)",
          couleurTexte: "#aaaaaa",
        };
      case "PRENDRE":
        return {
          texte: "Prend !",
          fond: "rgba(212,160,23,0.9)",
          couleurTexte: "#1a1a1a",
        };
      case "ANNONCER":
        return {
          texte: `${SYMBOLES_COULEUR[actionEnchere.couleur]} !`,
          fond: "rgba(212,160,23,0.9)",
          couleurTexte: "#1a1a1a",
        };
    }
  }

  // Pendant le jeu : afficher l'indicateur preneur + atout
  if (
    (phaseUI === "jeu" || phaseUI === "finPli" || phaseUI === "distribution") &&
    estPreneur &&
    couleurAtout
  ) {
    return {
      texte: `${SYMBOLES_COULEUR[couleurAtout]} Prend`,
      fond: FONDS_ATOUT[couleurAtout],
      couleurTexte: COULEURS_SYMBOLE[couleurAtout],
    };
  }

  return null;
}

// --- Styles ---

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    alignItems: "center",
    zIndex: 12,
    width: TAILLE_AVATAR + 24,
  },
  avatar: {
    width: TAILLE_AVATAR,
    height: TAILLE_AVATAR,
    borderRadius: TAILLE_AVATAR / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  initiale: {
    color: "#ffffff",
    fontSize: estWeb ? 22 : 18,
    fontWeight: "bold",
  },
  nom: {
    color: "#ffffff",
    fontSize: estWeb ? 12 : 10,
    marginTop: 3,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badge: {
    marginTop: 3,
    paddingHorizontal: estWeb ? 10 : 8,
    paddingVertical: estWeb ? 4 : 3,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  texteBadge: {
    fontSize: estWeb ? 13 : 11,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
});
