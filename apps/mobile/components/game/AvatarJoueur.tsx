// Avatar d'un joueur — affiche l'identité, les bulles d'enchère et l'indicateur preneur/atout
import type { ActionEnchere, Couleur, PositionJoueur } from "@belote/shared-types";
import { memo, useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";

import { DUREE_PULSE_JOUEUR_ACTIF } from "../../constants/animations-visuelles";
import { DECALAGE_NOM, POSITIONS_AVATAR, TAILLE_AVATAR } from "../../constants/layout";

const SYMBOLES_COULEUR: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

const COULEURS_SYMBOLE: Record<Couleur, string> = {
  coeur: "#ffdad5",
  carreau: "#ffdad5",
  pique: "#f3f1eb",
  trefle: "#f3f1eb",
};

const FONDS_ATOUT: Record<Couleur, string> = {
  coeur: "rgba(123, 34, 34, 0.94)",
  carreau: "rgba(123, 34, 34, 0.94)",
  pique: "rgba(28, 33, 45, 0.94)",
  trefle: "rgba(28, 33, 45, 0.94)",
};

const NOMS_JOUEUR: Record<PositionJoueur, string> = {
  sud: "Vous",
  nord: "Nord",
  ouest: "Ouest",
  est: "Est",
};

interface ProfilAvatar {
  fondHaut: string;
  fondBas: string;
  reflet: string;
  cheveux: string;
  peau: string;
  vesteHaut: string;
  vesteBas: string;
  yeux: string;
}

const PROFILS_AVATAR: Record<PositionJoueur, ProfilAvatar> = {
  sud: {
    fondHaut: "#42699a",
    fondBas: "#1a2d44",
    reflet: "rgba(255,255,255,0.16)",
    cheveux: "#25212d",
    peau: "#f2bf98",
    vesteHaut: "#d4a017",
    vesteBas: "#89640c",
    yeux: "#38231a",
  },
  nord: {
    fondHaut: "#4e7a62",
    fondBas: "#223b2f",
    reflet: "rgba(255,255,255,0.18)",
    cheveux: "#efe0b4",
    peau: "#f2c39a",
    vesteHaut: "#7f1d1d",
    vesteBas: "#511313",
    yeux: "#4a2d1f",
  },
  ouest: {
    fondHaut: "#9a6a3a",
    fondBas: "#543113",
    reflet: "rgba(255,244,220,0.14)",
    cheveux: "#6d3d1e",
    peau: "#eab58d",
    vesteHaut: "#2d4c3f",
    vesteBas: "#18281f",
    yeux: "#4a2b1a",
  },
  est: {
    fondHaut: "#6f538a",
    fondBas: "#342541",
    reflet: "rgba(255,255,255,0.14)",
    cheveux: "#d6d1dc",
    peau: "#f0c7a6",
    vesteHaut: "#7b2222",
    vesteBas: "#471212",
    yeux: "#40261a",
  },
};

const estWeb = Platform.OS === "web";
const RAYON_AVATAR = estWeb ? 18 : 16;
const LARGEUR_NOM = estWeb ? 96 : 88;
const LARGEUR_BULLE_MIN = estWeb ? 84 : 74;
const TAILLE_QUEUE = estWeb ? 10 : 8;

interface PropsAvatarJoueur {
  position: PositionJoueur;
  largeurEcran: number;
  hauteurEcran: number;
  estActif: boolean;
  actionEnchere: ActionEnchere | null;
  afficherActionEnchere?: boolean;
  estPreneur: boolean;
  couleurAtout: Couleur | null;
  phaseUI: string;
}

interface Badge {
  texte: string;
  fond: string;
  couleurTexte: string;
}

export const AvatarJoueur = memo(function AvatarJoueur({
  position,
  largeurEcran,
  hauteurEcran,
  estActif,
  actionEnchere,
  afficherActionEnchere,
  estPreneur,
  couleurAtout,
  phaseUI,
}: PropsAvatarJoueur) {
  const opacitePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (estActif) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacitePulse, {
            toValue: 0.52,
            duration: DUREE_PULSE_JOUEUR_ACTIF,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacitePulse, {
            toValue: 1,
            duration: DUREE_PULSE_JOUEUR_ACTIF,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }

    opacitePulse.setValue(1);
  }, [estActif, opacitePulse]);

  if (phaseUI === "inactif") return null;

  const coord = POSITIONS_AVATAR[position];
  const left = coord.x * largeurEcran;
  const top = coord.y * hauteurEcran;
  const actionEnchereVisible = afficherActionEnchere ?? phaseUI === "encheres";
  const badge = determineBadge(
    phaseUI,
    actionEnchere,
    actionEnchereVisible,
    estPreneur,
    couleurAtout,
  );

  return (
    <View
      testID={`avatar-ancrage-${position}`}
      style={[styles.pointAncrage, { left, top }]}
      pointerEvents="none"
    >
      {badge ? <BulleAvatar position={position} badge={badge} /> : null}

      <AvatarPortrait
        position={position}
        estActif={estActif}
        opacitePulse={opacitePulse}
      />

      <Text style={styles.nom}>{NOMS_JOUEUR[position]}</Text>
    </View>
  );
});

function AvatarPortrait({
  position,
  estActif,
  opacitePulse,
}: {
  position: PositionJoueur;
  estActif: boolean;
  opacitePulse: Animated.Value;
}) {
  const profil = PROFILS_AVATAR[position];

  return (
    <Animated.View
      testID={`avatar-joueur-${position}`}
      style={[
        styles.avatar,
        {
          backgroundColor: profil.fondBas,
          borderColor: estActif ? "#f7e9b7" : "rgba(255,255,255,0.22)",
          shadowColor: estActif ? "#f0d98e" : "rgba(0,0,0,0.38)",
          opacity: opacitePulse,
        },
      ]}
    >
      <View style={[styles.reflet, { backgroundColor: profil.reflet }]} />
      <View
        style={[
          styles.fondDegrade,
          {
            backgroundColor: profil.fondHaut,
            opacity: 0.72,
          },
        ]}
      />
      <View style={[styles.cheveux, { backgroundColor: profil.cheveux }]} />
      <View style={[styles.visage, { backgroundColor: profil.peau }]} />
      <View style={[styles.yeux, { borderTopColor: profil.yeux }]} />
      <View style={[styles.veste, { backgroundColor: profil.vesteHaut }]} />
      <View style={[styles.vesteOmbre, { backgroundColor: profil.vesteBas }]} />
      <View style={styles.cadreInterieur} />
    </Animated.View>
  );
}

function BulleAvatar({ position, badge }: { position: PositionJoueur; badge: Badge }) {
  const { conteneur, queue } = obtenirStylesBulle(position);

  return (
    <View style={[styles.conteneurBulle, conteneur]}>
      <View
        style={[
          styles.queueBulle,
          queue,
          {
            backgroundColor: badge.fond,
            borderColor: "rgba(255,255,255,0.14)",
          },
        ]}
      />
      <View
        testID={`avatar-bulle-${position}`}
        style={[styles.bulle, { backgroundColor: badge.fond }]}
      >
        <Text style={[styles.texteBulle, { color: badge.couleurTexte }]}>
          {badge.texte}
        </Text>
      </View>
    </View>
  );
}

function determineBadge(
  phaseUI: string,
  actionEnchere: ActionEnchere | null,
  afficherActionEnchere: boolean,
  estPreneur: boolean,
  couleurAtout: Couleur | null,
): Badge | null {
  if (afficherActionEnchere && actionEnchere) {
    switch (actionEnchere.type) {
      case "PASSER":
        return {
          texte: "Passe",
          fond: "rgba(0, 0, 0, 0.82)",
          couleurTexte: "#efefef",
        };
      case "PRENDRE":
        return {
          texte: "Prend !",
          fond: "rgba(42, 28, 8, 0.94)",
          couleurTexte: "#f0d06b",
        };
      case "ANNONCER":
        return {
          texte: `${SYMBOLES_COULEUR[actionEnchere.couleur]} !`,
          fond: "rgba(42, 28, 8, 0.94)",
          couleurTexte: "#f0d06b",
        };
    }
  }

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

function obtenirStylesBulle(position: PositionJoueur): {
  conteneur: Record<string, number | string>;
  queue: Record<string, number | string | { rotate: string }[]>;
} {
  const hautBase = estWeb ? -18 : -16;
  const droiteBase = estWeb ? 22 : 18;
  const coteBase = estWeb ? -18 : -16;

  switch (position) {
    case "nord":
      return {
        conteneur: {
          top: hautBase,
          left: TAILLE_AVATAR / 2 - 4,
        },
        queue: {
          left: -TAILLE_QUEUE / 2,
          top: estWeb ? 16 : 14,
          transform: [{ rotate: "135deg" }],
        },
      };
    case "sud":
      return {
        conteneur: {
          top: -TAILLE_AVATAR / 2 + 2,
          left: TAILLE_AVATAR / 2 - 4,
        },
        queue: {
          left: -TAILLE_QUEUE / 2,
          top: estWeb ? 16 : 14,
          transform: [{ rotate: "135deg" }],
        },
      };
    case "ouest":
      return {
        conteneur: {
          top: coteBase,
          left: droiteBase,
        },
        queue: {
          left: -TAILLE_QUEUE / 2,
          top: estWeb ? 18 : 16,
          transform: [{ rotate: "135deg" }],
        },
      };
    case "est":
      return {
        conteneur: {
          top: coteBase,
          right: droiteBase,
        },
        queue: {
          right: -TAILLE_QUEUE / 2,
          top: estWeb ? 18 : 16,
          transform: [{ rotate: "-45deg" }],
        },
      };
  }
}

const styles = StyleSheet.create({
  pointAncrage: {
    position: "absolute",
    width: 0,
    height: 0,
    zIndex: 12,
  },
  avatar: {
    position: "absolute",
    left: -TAILLE_AVATAR / 2,
    top: -TAILLE_AVATAR / 2,
    width: TAILLE_AVATAR,
    height: TAILLE_AVATAR,
    borderRadius: RAYON_AVATAR,
    borderWidth: 2,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  reflet: {
    position: "absolute",
    top: 6,
    left: 8,
    width: TAILLE_AVATAR * 0.42,
    height: TAILLE_AVATAR * 0.22,
    borderRadius: 999,
    transform: [{ rotate: "-18deg" }],
  },
  fondDegrade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TAILLE_AVATAR * 0.56,
  },
  cheveux: {
    position: "absolute",
    left: TAILLE_AVATAR * 0.16,
    top: TAILLE_AVATAR * 0.12,
    width: TAILLE_AVATAR * 0.68,
    height: TAILLE_AVATAR * 0.38,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  visage: {
    position: "absolute",
    left: TAILLE_AVATAR * 0.27,
    top: TAILLE_AVATAR * 0.3,
    width: TAILLE_AVATAR * 0.46,
    height: TAILLE_AVATAR * 0.36,
    borderRadius: 14,
  },
  yeux: {
    position: "absolute",
    left: TAILLE_AVATAR * 0.36,
    top: TAILLE_AVATAR * 0.47,
    width: TAILLE_AVATAR * 0.2,
    borderTopWidth: 2,
  },
  veste: {
    position: "absolute",
    left: TAILLE_AVATAR * 0.16,
    right: TAILLE_AVATAR * 0.16,
    bottom: -2,
    height: TAILLE_AVATAR * 0.34,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  vesteOmbre: {
    position: "absolute",
    left: TAILLE_AVATAR * 0.28,
    right: TAILLE_AVATAR * 0.28,
    bottom: 0,
    height: TAILLE_AVATAR * 0.18,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cadreInterieur: {
    position: "absolute",
    inset: 5,
    borderRadius: RAYON_AVATAR - 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  nom: {
    position: "absolute",
    top: TAILLE_AVATAR / 2 + DECALAGE_NOM,
    left: -LARGEUR_NOM / 2,
    width: LARGEUR_NOM,
    textAlign: "center",
    color: "#ffffff",
    fontSize: estWeb ? 12 : 10,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  conteneurBulle: {
    position: "absolute",
    zIndex: 1,
  },
  bulle: {
    minWidth: LARGEUR_BULLE_MIN,
    paddingHorizontal: estWeb ? 14 : 11,
    paddingVertical: estWeb ? 8 : 6,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "rgba(0,0,0,0.34)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  texteBulle: {
    fontSize: estWeb ? 14 : 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  queueBulle: {
    position: "absolute",
    width: TAILLE_QUEUE,
    height: TAILLE_QUEUE,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
});
