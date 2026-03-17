import type { Carte, PositionJoueur } from "@belote/shared-types";
import { View } from "react-native";

import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../../constants/layout";
import { CarteDos, CarteFace } from "./Carte";
import { CarteAnimee, type PositionCarte } from "./CarteAnimee";

export interface CarteEnVol {
  id: string;
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  duree: number;
  /** rotateY départ en degrés (0 = dos, 180 = face). Absent = pas de flip. */
  flipDe?: number;
  /** rotateY arrivée en degrés */
  flipVers?: number;
  /** Profil d'easing. Défaut: 'out-cubic' */
  easing?: "out-cubic" | "inout-cubic";
}

export interface CarteSurTapis {
  id: string;
  carte: Carte;
  position: PositionJoueur;
  x: number;
  y: number;
  rotation: number;
  faceVisible: boolean;
  paquet: 1 | 2;
}

interface PropsCoucheAnimation {
  cartesEnVol: CarteEnVol[];
  cartesSurTapis: CarteSurTapis[];
  largeurEcran: number;
  hauteurEcran: number;
  onAnimationTerminee: (id: string) => void;
}

/**
 * Couche transparente superposée au plateau pour afficher
 * les cartes en cours d'animation et les cartes posées sur le tapis.
 */
export function CoucheAnimation({
  cartesEnVol,
  cartesSurTapis,
  largeurEcran,
  hauteurEcran,
  onAnimationTerminee,
}: PropsCoucheAnimation) {
  if (cartesEnVol.length === 0 && cartesSurTapis.length === 0) return null;

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
      }}
      pointerEvents="none"
    >
      {/* Cartes posées sur le tapis (statiques, z-index inférieur) */}
      {cartesSurTapis.map((cst) => (
        <View
          key={cst.id}
          style={{
            position: "absolute",
            left: cst.x * largeurEcran - largeurCarte / 2,
            top: cst.y * hauteurEcran - hauteurCarte / 2,
            transform: [{ rotate: `${cst.rotation}deg` }],
            zIndex: 40,
          }}
        >
          {cst.faceVisible ? (
            <CarteFace carte={cst.carte} largeur={largeurCarte} hauteur={hauteurCarte} />
          ) : (
            <CarteDos largeur={largeurCarte} hauteur={hauteurCarte} />
          )}
        </View>
      ))}

      {/* Cartes en vol (animées, z-index supérieur) */}
      {cartesEnVol.map((vol) => (
        <CarteAnimee
          key={vol.id}
          carte={vol.carte}
          depart={vol.depart}
          arrivee={vol.arrivee}
          faceVisible={vol.faceVisible}
          duree={vol.duree}
          flipDe={vol.flipDe}
          flipVers={vol.flipVers}
          easing={vol.easing}
          largeurEcran={largeurEcran}
          hauteurEcran={hauteurEcran}
          onTerminee={() => onAnimationTerminee(vol.id)}
        />
      ))}
    </View>
  );
}
