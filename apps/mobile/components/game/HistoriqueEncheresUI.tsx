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

// Positions des bulles pour chaque joueur
const POSITIONS_BULLES: Record<PositionJoueur, { x: number; y: number }> = {
  sud: { x: 0.5, y: 0.72 },
  nord: { x: 0.5, y: 0.18 },
  ouest: { x: 0.15, y: 0.47 },
  est: { x: 0.85, y: 0.47 },
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
  if (action.type === "PASSER") return COULEURS.texteSecondaire;
  return COULEURS.accent;
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
        const pos = POSITIONS_BULLES[position];

        if (!action) return null;

        return (
          <View
            key={position}
            style={[
              styles.bulle,
              {
                left: pos.x * largeurEcran - 40,
                top: pos.y * hauteurEcran - 12,
              },
            ]}
          >
            <Text style={[styles.texteAction, { color: couleurAction(action) }]}>
              {formaterAction(action)}
            </Text>
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
  bulle: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: estWeb ? 12 : 8,
    paddingVertical: estWeb ? 5 : 3,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  texteAction: {
    fontSize: estWeb ? 14 : 12,
    fontWeight: "bold",
  },
});
