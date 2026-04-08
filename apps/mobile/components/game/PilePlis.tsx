// Pile visuelle des plis remportés par une équipe
import type { IdEquipe } from "@belote/shared-types";
import { memo } from "react";
import { View } from "react-native";

import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CanvasCartesAtlas } from "./CanvasCartesAtlas";
import { calculerGeometriePilePlis } from "./pile-plis-geometrie";

interface PropsPilePlis {
  equipe: IdEquipe;
  nbPlis: number;
  largeurEcran: number;
  hauteurEcran: number;
  atlas: AtlasCartes;
}

export const PilePlis = memo(function PilePlis({
  equipe,
  nbPlis,
  largeurEcran,
  hauteurEcran,
  atlas,
}: PropsPilePlis) {
  const {
    estTourne,
    nbVisibles,
    largeurCarte,
    hauteurCarte,
    largeurVisuelle,
    hauteurVisuelle,
    decalageParPli,
    cadrePile,
  } = calculerGeometriePilePlis({
    equipe,
    nbPlis,
    largeurEcran,
    hauteurEcran,
  });

  if (nbPlis === 0) {
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
  }

  return (
    <View
      style={{
        position: "absolute",
        left: cadrePile.left,
        top: cadrePile.top,
        width: cadrePile.width,
        height: cadrePile.height,
        zIndex: 5,
      }}
      pointerEvents="none"
    >
      {Array.from({ length: nbVisibles }).map((_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            bottom: i * decalageParPli,
            left: (largeurVisuelle - largeurCarte) / 2,
            width: largeurCarte,
            height: hauteurCarte,
            transform: estTourne ? [{ rotate: "90deg" }] : [],
          }}
        >
          <CanvasCartesAtlas
            atlas={atlas}
            largeur={largeurCarte}
            hauteur={hauteurCarte}
            cartes={[
              {
                id: `dos-pli-${equipe}-${i}`,
                type: "dos",
                x: 0,
                y: 0,
                largeur: largeurCarte,
                hauteur: hauteurCarte,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
});
