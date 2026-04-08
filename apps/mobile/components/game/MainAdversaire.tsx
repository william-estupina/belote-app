import type { PositionJoueur } from "@belote/shared-types";
import { View } from "react-native";

import { ADVERSAIRE, RATIO_ASPECT_CARTE } from "../../constants/layout";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CanvasCartesAtlas } from "./CanvasCartesAtlas";

interface PropsMainAdversaire {
  nbCartes: number;
  position: PositionJoueur;
  largeurEcran: number;
  hauteurEcran: number;
  atlas: AtlasCartes;
}

export function MainAdversaire({
  nbCartes,
  position,
  largeurEcran,
  hauteurEcran,
  atlas,
}: PropsMainAdversaire) {
  if (nbCartes === 0) return null;

  const largeurCarte = Math.round(largeurEcran * ADVERSAIRE.ratioLargeurCarte);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  if (position === "nord") {
    return (
      <EventailHorizontal
        nbCartes={nbCartes}
        largeurCarte={largeurCarte}
        hauteurCarte={hauteurCarte}
        largeurEcran={largeurEcran}
        hauteurEcran={hauteurEcran}
        atlas={atlas}
      />
    );
  }

  return (
    <EventailVertical
      nbCartes={nbCartes}
      largeurCarte={largeurCarte}
      hauteurCarte={hauteurCarte}
      largeurEcran={largeurEcran}
      hauteurEcran={hauteurEcran}
      cote={position as "est" | "ouest"}
      atlas={atlas}
    />
  );
}

// --- Éventail horizontal pour le nord (partenaire) ---

function EventailHorizontal({
  nbCartes,
  largeurCarte,
  hauteurCarte,
  largeurEcran,
  hauteurEcran,
  atlas,
}: {
  nbCartes: number;
  largeurCarte: number;
  hauteurCarte: number;
  largeurEcran: number;
  hauteurEcran: number;
  atlas: AtlasCartes;
}) {
  const angleTotal = ADVERSAIRE.angleTotal;
  const arcMax = hauteurEcran * ADVERSAIRE.decalageArc;
  const espacement = largeurCarte * (1 - ADVERSAIRE.chevauchement);
  const largeurMain = espacement * (nbCartes - 1) + largeurCarte;
  const xDepart = (largeurEcran - largeurMain) / 2;

  const hauteurConteneur = hauteurCarte + arcMax + largeurCarte * 0.3;

  return (
    <View
      style={{
        position: "absolute",
        top: hauteurEcran * ADVERSAIRE.margeNordY,
        left: 0,
        right: 0,
        height: hauteurConteneur,
        overflow: "visible",
      }}
    >
      {Array.from({ length: nbCartes }, (_, index) => {
        const t = nbCartes > 1 ? (index / (nbCartes - 1)) * 2 - 1 : 0;
        // Éventail inversé (partenaire en face)
        const angle = (-t * angleTotal) / 2;
        const decalageY = arcMax * (1 - t * t);
        const x = xDepart + espacement * index;

        return (
          <View
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: decalageY,
              transformOrigin: `${largeurCarte / 2}px 0px`,
              transform: [{ rotate: `${angle}deg` }],
              zIndex: index,
            }}
          >
            <CanvasCartesAtlas
              atlas={atlas}
              largeur={largeurCarte}
              hauteur={hauteurCarte}
              cartes={[
                {
                  id: `dos-nord-${index}`,
                  type: "dos",
                  x: 0,
                  y: 0,
                  largeur: largeurCarte,
                  hauteur: hauteurCarte,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

// --- Éventail vertical pour est/ouest (adversaires) ---
// Les cartes sont tournées à 90° pour être en paysage

function EventailVertical({
  nbCartes,
  largeurCarte,
  hauteurCarte,
  largeurEcran,
  hauteurEcran,
  cote,
  atlas,
}: {
  nbCartes: number;
  largeurCarte: number;
  hauteurCarte: number;
  largeurEcran: number;
  hauteurEcran: number;
  cote: "est" | "ouest";
  atlas: AtlasCartes;
}) {
  const angleTotal = ADVERSAIRE.angleTotal;
  const arcMax = largeurEcran * ADVERSAIRE.decalageArc;

  // Après rotation 90°, la carte occupe hauteurCarte en largeur et largeurCarte en hauteur visuellement
  // On espace verticalement selon largeurCarte (la hauteur visuelle après rotation)
  const espacementVisuel = largeurCarte * (1 - ADVERSAIRE.chevauchement);
  const hauteurMain = espacementVisuel * (nbCartes - 1) + largeurCarte;
  const yDepart = (hauteurEcran - hauteurMain) / 2;

  const estOuest = cote === "ouest";
  // Rotation 90° pour les deux côtés (même orientation de carte)
  const rotationBase = 90;

  const largeurConteneur = hauteurCarte + arcMax;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        ...(estOuest
          ? { left: largeurEcran * ADVERSAIRE.margeCoteX }
          : { right: largeurEcran * ADVERSAIRE.margeCoteX }),
        width: largeurConteneur,
        overflow: "visible",
      }}
    >
      {Array.from({ length: nbCartes }, (_, index) => {
        const t = nbCartes > 1 ? (index / (nbCartes - 1)) * 2 - 1 : 0;

        // Angle d'éventail : direction inversée selon le côté
        const signeEventail = estOuest ? 1 : -1;
        const angleEventail = (t * angleTotal * signeEventail) / 2;
        const angleFinal = rotationBase + angleEventail;

        // Arc parabolique : cartes du centre se rapprochent du bord
        const decalageX = arcMax * (1 - t * t);

        const y = yDepart + espacementVisuel * index;

        return (
          <View
            key={index}
            style={{
              position: "absolute",
              top: y,
              ...(estOuest ? { left: decalageX } : { right: decalageX }),
              width: largeurCarte,
              height: hauteurCarte,
              transformOrigin: `${largeurCarte / 2}px ${hauteurCarte / 2}px`,
              transform: [{ rotate: `${angleFinal}deg` }],
              zIndex: index,
            }}
          >
            <CanvasCartesAtlas
              atlas={atlas}
              largeur={largeurCarte}
              hauteur={hauteurCarte}
              cartes={[
                {
                  id: `dos-${cote}-${index}`,
                  type: "dos",
                  x: 0,
                  y: 0,
                  largeur: largeurCarte,
                  hauteur: hauteurCarte,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}
