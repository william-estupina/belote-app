// Pile visuelle des plis remportés par une équipe
// Le rendu des cartes est délégué au canvas Skia unifié.
// Ce composant ne gère plus que l'emplacement vide (dashed border).
import type { IdEquipe } from "@belote/shared-types";
import { memo } from "react";
import { View } from "react-native";

import { calculerGeometriePilePlis } from "./pile-plis-geometrie";

interface PropsPilePlis {
  equipe: IdEquipe;
  nbPlis: number;
  largeurEcran: number;
  hauteurEcran: number;
}

export const PilePlis = memo(function PilePlis({
  equipe,
  nbPlis,
  largeurEcran,
  hauteurEcran,
}: PropsPilePlis) {
  const { largeurVisuelle, hauteurVisuelle, cadrePile } = calculerGeometriePilePlis({
    equipe,
    nbPlis: 0, // Pour obtenir les dimensions de base
    largeurEcran,
    hauteurEcran,
  });

  if (nbPlis > 0) {
    // Le rendu visuel est géré par le canvas unifié
    return null;
  }

  // Emplacement vide
  return (
    <View
      style={{
        position: "absolute",
        left: cadrePile.left,
        top: cadrePile.top,
        width: largeurVisuelle,
        height: hauteurVisuelle,
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.12)",
        borderStyle: "dashed",
        backgroundColor: "rgba(0, 0, 0, 0.08)",
        borderRadius: 4,
        zIndex: 5,
      }}
      pointerEvents="none"
    />
  );
});
