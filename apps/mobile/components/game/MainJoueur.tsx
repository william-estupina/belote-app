import type { Carte } from "@belote/shared-types";
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { Easing, type SharedValue, withTiming } from "react-native-reanimated";

import { DUREE_FONDU_ENTREE_MAIN } from "../../constants/animations-visuelles";
import {
  ANIMATIONS,
  POSITIONS_MAINS,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";
import type { DepartAnimationJeuCarte } from "../../hooks/useAnimations";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import type { ValeursAnimationMainJoueur } from "../../hooks/useBufferCanvasUnifie";
import { estMemeCarte } from "../../hooks/utils-cartes";
import type { CarteMainJoueurAtlas } from "./CanvasMainJoueurAtlas";
import {
  calculerDispositionMainJoueur,
  type ModeDispositionMainJoueur,
} from "./mainJoueurDisposition";

interface PropsMainJoueur {
  cartes: Carte[];
  largeurEcran: number;
  hauteurEcran: number;
  cartesJouables?: Carte[];
  interactionActive?: boolean;
  animerNouvellesCartes?: boolean;
  modeDisposition?: ModeDispositionMainJoueur;
  nbCartesDisposition?: number;
  cartesMasquees?: Carte[];
  cartesEnPose?: Carte[];
  atlas: AtlasCartes;
  /** SharedValues d'animation fournies par le buffer unifié */
  valeursAnimation: ValeursAnimationMainJoueur;
  onCarteJouee?: (carte: Carte, departAnimation: DepartAnimationJeuCarte) => void;
}

const EASING_REORG = Easing.inOut(Easing.cubic);
const MAX_CARTES_MAIN = 8;
const DECALAGE_SOULEVEMENT_CARTE = 8;

/** Identifiant unique d'une carte */
function idCarte(carte: Carte): string {
  return `${carte.couleur}-${carte.rang}`;
}

/** Vérifie si une carte est dans la liste des cartes jouables */
function estJouable(carte: Carte, cartesJouables?: Carte[]): boolean {
  if (!cartesJouables) return true;
  return cartesJouables.some((c) => c.rang === carte.rang && c.couleur === carte.couleur);
}

function estMasquee(carte: Carte, cartesMasquees?: Carte[]): boolean {
  if (!cartesMasquees || cartesMasquees.length === 0) return false;
  return cartesMasquees.some((carteMasquee) => estMemeCarte(carteMasquee, carte));
}

function estEnPose(carte: Carte, cartesEnPose?: Carte[]): boolean {
  if (!cartesEnPose || cartesEnPose.length === 0) return false;
  return cartesEnPose.some((carteEnPoseCourante) =>
    estMemeCarte(carteEnPoseCourante, carte),
  );
}

function definirOuAnimer(
  valeur: SharedValue<number>,
  cible: number,
  animer: boolean,
  duree: number,
) {
  if (!animer) {
    valeur.value = cible;
    return;
  }

  valeur.value = withTiming(cible, { duration: duree, easing: EASING_REORG });
}

function calculerDepartAnimationCarteEventail(params: {
  xProp: number;
  yProp: number;
  angle: number;
  hauteurCarte: number;
  largeurEcran: number;
  hauteurEcran: number;
  decalageSoulevement: number;
}): DepartAnimationJeuCarte {
  const {
    xProp,
    yProp,
    angle,
    hauteurCarte,
    largeurEcran,
    hauteurEcran,
    decalageSoulevement,
  } = params;
  const angleRadians = (angle * Math.PI) / 180;
  const decalageX =
    ((hauteurCarte / 2 + decalageSoulevement) * Math.sin(angleRadians)) / largeurEcran;
  const decalageY =
    ((hauteurCarte / 2) * (1 - Math.cos(angleRadians)) -
      decalageSoulevement * Math.cos(angleRadians)) /
    hauteurEcran;

  return {
    x: xProp + decalageX,
    y: yProp + decalageY,
    rotation: angle,
    echelle: 1,
  };
}

interface PropsZoneCarteEventail {
  carte: Carte;
  x: number;
  decalageY: number;
  angle: number;
  largeurCarte: number;
  hauteurCarte: number;
  largeurEcran: number;
  hauteurEcran: number;
  jouable: boolean;
  estMasquee: boolean;
  estEnPose: boolean;
  interactionActive: boolean;
  xProp: number;
  yProp: number;
  zIndex: number;
  onCarteJouee?: (carte: Carte, departAnimation: DepartAnimationJeuCarte) => void;
}

function ZoneCarteEventail({
  carte,
  x,
  decalageY,
  angle,
  largeurCarte,
  hauteurCarte,
  largeurEcran,
  hauteurEcran,
  jouable,
  estMasquee,
  estEnPose,
  interactionActive,
  xProp,
  yProp,
  zIndex,
  onCarteJouee,
}: PropsZoneCarteEventail) {
  const estInteractive = interactionActive && jouable && !estMasquee && !!onCarteJouee;

  return (
    <View
      style={{
        position: "absolute",
        left: x,
        bottom: decalageY,
        width: largeurCarte,
        height: hauteurCarte,
        transformOrigin: `${largeurCarte / 2}px ${hauteurCarte}px`,
        transform: [{ rotate: `${angle}deg` }],
        zIndex,
      }}
    >
      <Pressable
        disabled={!estInteractive}
        accessibilityState={{ disabled: !estInteractive }}
        onPress={() =>
          onCarteJouee?.(
            carte,
            calculerDepartAnimationCarteEventail({
              xProp,
              yProp,
              angle,
              hauteurCarte,
              largeurEcran,
              hauteurEcran,
              decalageSoulevement: DECALAGE_SOULEVEMENT_CARTE,
            }),
          )
        }
        testID={`carte-main-${carte.couleur}-${carte.rang}`}
        style={({ pressed }) => ({
          width: largeurCarte,
          height: hauteurCarte,
          opacity: estMasquee ? 0 : 1,
          transform:
            estEnPose || (pressed && estInteractive)
              ? [{ translateY: -DECALAGE_SOULEVEMENT_CARTE }]
              : [],
        })}
      />
    </View>
  );
}

export function MainJoueur({
  cartes,
  largeurEcran,
  hauteurEcran,
  cartesJouables,
  interactionActive = false,
  animerNouvellesCartes = true,
  modeDisposition = "eventail",
  nbCartesDisposition,
  cartesMasquees,
  cartesEnPose,
  atlas,
  valeursAnimation,
  onCarteJouee,
}: PropsMainJoueur) {
  const nbCartes = cartes.length;
  const nbCartesPrecedentRef = useRef(nbCartes);
  const idsCartesPrecedentesRef = useRef<string[]>([]);
  const nbCartesPourDisposition = Math.max(nbCartes, nbCartesDisposition ?? nbCartes);

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);

  const disposition = calculerDispositionMainJoueur({
    mode: modeDisposition,
    nbCartes: nbCartesPourDisposition,
    largeurEcran,
    hauteurEcran,
    largeurCarte,
    hauteurCarte,
  });
  const resserrementApresRetrait = nbCartes < nbCartesPrecedentRef.current;
  const dureeReorganisation = resserrementApresRetrait
    ? ANIMATIONS.distribution.dureeResserrementApresJeu
    : ANIMATIONS.distribution.dureeReorganisationMain;

  useEffect(() => {
    nbCartesPrecedentRef.current = nbCartes;
  }, [nbCartes]);

  const cartesCanvas: CarteMainJoueurAtlas[] = cartes.map((carte, index) => {
    const carteDisposition = disposition.cartes[index];
    const jouable = estJouable(carte, cartesJouables);
    return {
      carte,
      x: carteDisposition.x,
      decalageY:
        carteDisposition.decalageY +
        (estEnPose(carte, cartesEnPose) ? DECALAGE_SOULEVEMENT_CARTE : 0),
      angle: carteDisposition.angle,
      grisee: interactionActive && !jouable,
      visible: !estMasquee(carte, cartesMasquees),
    };
  });

  useEffect(() => {
    const idsPrecedents = idsCartesPrecedentesRef.current;
    const estPremierRendu = idsPrecedents.length === 0;
    const centreMainX = largeurEcran * POSITIONS_MAINS.sud.x - largeurCarte / 2;

    cartesCanvas.forEach((carteCanvas, index) => {
      const nouvelleCarte = !idsPrecedents.includes(idCarte(carteCanvas.carte));
      const doitAnimer =
        (!nouvelleCarte || animerNouvellesCartes) &&
        (!estPremierRendu || animerNouvellesCartes);

      if (estPremierRendu && animerNouvellesCartes) {
        valeursAnimation.x[index].value = centreMainX;
        valeursAnimation.decalageY[index].value = 0;
        valeursAnimation.angle[index].value = 0;
        valeursAnimation.echelle[index].value = 1;
        valeursAnimation.echelle[index].value = withTiming(1, {
          duration: DUREE_FONDU_ENTREE_MAIN,
        });
      }

      definirOuAnimer(
        valeursAnimation.x[index],
        carteCanvas.x,
        doitAnimer,
        dureeReorganisation,
      );
      definirOuAnimer(
        valeursAnimation.decalageY[index],
        carteCanvas.decalageY,
        doitAnimer,
        dureeReorganisation,
      );
      definirOuAnimer(
        valeursAnimation.angle[index],
        carteCanvas.angle,
        doitAnimer,
        dureeReorganisation,
      );
    });

    for (let index = cartesCanvas.length; index < MAX_CARTES_MAIN; index += 1) {
      valeursAnimation.x[index].value = -10000;
      valeursAnimation.decalageY[index].value = 0;
      valeursAnimation.angle[index].value = 0;
      valeursAnimation.echelle[index].value = 1;
    }

    idsCartesPrecedentesRef.current = cartesCanvas.map(({ carte }) => idCarte(carte));
  }, [
    animerNouvellesCartes,
    cartesCanvas,
    dureeReorganisation,
    largeurCarte,
    largeurEcran,
    valeursAnimation,
  ]);

  if (nbCartes === 0) return null;

  return (
    <>
      {/* Le rendu visuel est délégué au canvas unifié via valeursAnimation */}
      <View
        testID="main-joueur"
        style={{
          position: "absolute",
          bottom: -hauteurCarte * 0.15,
          left: 0,
          right: 0,
          height: disposition.hauteurConteneur,
          overflow: "visible",
          zIndex: 60,
        }}
        pointerEvents="box-none"
      >
        {cartes.map((carte, index) => {
          const carteDisposition = disposition.cartes[index];
          const x = carteDisposition.x;
          const angle = carteDisposition.angle;
          const decalageY = carteDisposition.decalageY;
          const jouable = estJouable(carte, cartesJouables);
          const carteEstMasquee = estMasquee(carte, cartesMasquees);
          const carteEstEnPose = estEnPose(carte, cartesEnPose);

          // Position proportionnelle du centre de la carte sur l'écran.
          const xProp = (x + largeurCarte / 2) / largeurEcran;
          // Le conteneur a bottom: -hauteurCarte * 0.15, la carte a bottom: decalageY dans le conteneur.
          const yProp =
            1 - (decalageY + hauteurCarte / 2 - hauteurCarte * 0.15) / hauteurEcran;

          return (
            <ZoneCarteEventail
              key={`${carte.couleur}-${carte.rang}`}
              carte={carte}
              x={x}
              decalageY={decalageY}
              angle={angle}
              largeurCarte={largeurCarte}
              hauteurCarte={hauteurCarte}
              largeurEcran={largeurEcran}
              hauteurEcran={hauteurEcran}
              jouable={jouable}
              estMasquee={carteEstMasquee}
              estEnPose={carteEstEnPose}
              interactionActive={interactionActive}
              xProp={xProp}
              yProp={yProp}
              zIndex={index}
              onCarteJouee={onCarteJouee}
            />
          );
        })}
      </View>
    </>
  );
}
