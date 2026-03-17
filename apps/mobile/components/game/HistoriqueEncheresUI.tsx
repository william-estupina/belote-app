// Affiche l'historique des enchères autour du plateau (bulle par joueur)
import type { ActionEnchere, Couleur, PositionJoueur } from "@belote/shared-types";
import { Platform, StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";

const SYMBOLES_COULEUR: Record<Couleur, string> = {
  coeur: "\u2665",
  carreau: "\u2666",
  pique: "\u2660",
  trefle: "\u2663",
};

interface PropsHistoriqueEncheresUI {
  historiqueEncheres: ActionEnchere[];
  largeurEcran: number;
  hauteurEcran: number;
}

// Bulles positionnées à droite de chaque main de joueur
const POSITIONS_BULLES: Record<
  PositionJoueur,
  { x: number; y: number; fleche: "gauche" | "bas" }
> = {
  // Sud : à droite de la main, légèrement au-dessus
  sud: { x: 0.78, y: 0.82, fleche: "bas" },
  // Nord : à droite de la main adverse du haut
  nord: { x: 0.78, y: 0.06, fleche: "gauche" },
  // Ouest : au-dessus de la main gauche, décalé à droite
  ouest: { x: 0.12, y: 0.3, fleche: "gauche" },
  // Est : au-dessus de la main droite, décalé à droite
  est: { x: 0.92, y: 0.3, fleche: "gauche" },
};

function formaterAction(action: ActionEnchere): string {
  switch (action.type) {
    case "PRENDRE":
      return "Prend !";
    case "ANNONCER":
      return `${SYMBOLES_COULEUR[action.couleur]} !`;
    case "PASSER":
      return "Passe";
  }
}

function couleurAction(action: ActionEnchere): string {
  if (action.type === "PASSER") return "#ffffff";
  return COULEURS.accent;
}

function fondAction(action: ActionEnchere): string {
  if (action.type === "PASSER") return "rgba(0, 0, 0, 0.7)";
  return "rgba(30, 20, 0, 0.85)";
}

/** Petit triangle pointant vers le joueur */
function FlecheBulle({
  direction,
  couleurFond,
}: {
  direction: "gauche" | "bas";
  couleurFond: string;
}) {
  const taille = 7;

  if (direction === "bas") {
    return (
      <View
        style={{
          alignSelf: "center",
          width: 0,
          height: 0,
          borderLeftWidth: taille,
          borderRightWidth: taille,
          borderTopWidth: taille,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: couleurFond,
        }}
      />
    );
  }

  // gauche
  return (
    <View
      style={{
        alignSelf: "center",
        width: 0,
        height: 0,
        borderTopWidth: taille,
        borderBottomWidth: taille,
        borderRightWidth: taille,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderRightColor: couleurFond,
      }}
    />
  );
}

export function HistoriqueEncheresUI({
  historiqueEncheres,
  largeurEcran,
  hauteurEcran,
}: PropsHistoriqueEncheresUI) {
  // Regrouper les dernières actions par joueur
  const derniereActionParJoueur = new Map<PositionJoueur, ActionEnchere>();
  for (const action of historiqueEncheres) {
    derniereActionParJoueur.set(action.joueur, action);
  }

  return (
    <View style={styles.conteneur} pointerEvents="none">
      {(["sud", "ouest", "nord", "est"] as PositionJoueur[]).map((position) => {
        const action = derniereActionParJoueur.get(position);
        if (!action) return null;

        const config = POSITIONS_BULLES[position];
        const fond = fondAction(action);
        const estVertical = config.fleche === "bas";

        return (
          <View
            key={position}
            style={[
              styles.conteneurBulle,
              estVertical ? styles.conteneurVertical : styles.conteneurHorizontal,
              {
                left: config.x * largeurEcran - 44,
                top: config.y * hauteurEcran - 14,
              },
            ]}
          >
            {config.fleche === "gauche" && (
              <FlecheBulle direction="gauche" couleurFond={fond} />
            )}
            <View style={[styles.bulle, { backgroundColor: fond }]}>
              <Text
                style={[
                  styles.texteAction,
                  { color: couleurAction(action) },
                  action.type === "PASSER" && styles.textePasse,
                ]}
              >
                {formaterAction(action)}
              </Text>
            </View>
            {config.fleche === "bas" && (
              <FlecheBulle direction="bas" couleurFond={fond} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const estWeb = Platform.OS === "web";

const styles = StyleSheet.create({
  conteneur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 12,
  },
  conteneurBulle: {
    position: "absolute",
  },
  conteneurVertical: {
    flexDirection: "column",
    alignItems: "center",
  },
  conteneurHorizontal: {
    flexDirection: "row",
    alignItems: "center",
  },
  bulle: {
    paddingHorizontal: estWeb ? 16 : 12,
    paddingVertical: estWeb ? 7 : 5,
    borderRadius: 14,
    minWidth: 80,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  texteAction: {
    fontSize: estWeb ? 15 : 13,
    fontWeight: "bold",
  },
  textePasse: {
    fontStyle: "italic",
  },
});
