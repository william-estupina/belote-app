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
  coeur: "#cc0000",
  carreau: "#cc0000",
  pique: "#1a1a1a",
  trefle: "#1a1a1a",
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

// Positions des avatars — à gauche des cartes de chaque joueur
const POSITIONS_AVATAR: Record<PositionJoueur, { x: number; y: number }> = {
  sud: { x: 0.18, y: 0.86 }, // à gauche du fan horizontal en bas
  nord: { x: 0.28, y: 0.03 }, // à gauche du fan horizontal en haut
  ouest: { x: 0.01, y: 0.2 }, // à gauche du fan vertical, au-dessus
  est: { x: 0.82, y: 0.48 }, // à gauche du fan vertical à droite
};

const estWeb = Platform.OS === "web";
const TAILLE_AVATAR = estWeb ? 38 : 30;

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
      texte: `${SYMBOLES_COULEUR[couleurAtout]}`,
      fond: "rgba(0,0,0,0.7)",
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
    width: TAILLE_AVATAR + 20,
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
    fontSize: estWeb ? 16 : 13,
    fontWeight: "bold",
  },
  nom: {
    color: "#ffffff",
    fontSize: estWeb ? 10 : 8,
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badge: {
    marginTop: 2,
    paddingHorizontal: estWeb ? 8 : 6,
    paddingVertical: estWeb ? 3 : 2,
    borderRadius: 8,
    alignItems: "center",
  },
  texteBadge: {
    fontSize: estWeb ? 12 : 10,
    fontWeight: "bold",
  },
});
