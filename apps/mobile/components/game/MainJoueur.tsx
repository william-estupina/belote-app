import type { Carte } from "@belote/shared-types";
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { DUREE_FONDU_ENTREE_MAIN } from "../../constants/animations-visuelles";
import {
  ANIMATIONS,
  POSITIONS_MAINS,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";
import { construireGlissementCarteDepuisEtatCourant } from "../../hooks/glissementCartes";
import type { DepartAnimationJeuCarte } from "../../hooks/useAnimations";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { estMemeCarte } from "../../hooks/utils-cartes";
import { CarteFaceAtlas } from "./Carte";
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
  onCarteJouee?: (carte: Carte, departAnimation: DepartAnimationJeuCarte) => void;
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

const EASING_REORG = Easing.inOut(Easing.cubic);

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

// --- Sous-composant animé pour une carte dans l'éventail ---

interface PropsCarteEventail {
  carte: Carte;
  x: number;
  decalageY: number;
  angle: number;
  largeurCarte: number;
  hauteurCarte: number;
  largeurEcran: number;
  hauteurEcran: number;
  hauteurConteneur: number;
  jouable: boolean;
  grisee: boolean;
  estMasquee: boolean;
  estEnPose: boolean;
  interactionActive: boolean;
  animerEntree: boolean;
  atlas: AtlasCartes;
  xProp: number;
  yProp: number;
  echelle: number;
  zIndex: number;
  dureeReorganisation: number;
  onCarteJouee?: (carte: Carte, departAnimation: DepartAnimationJeuCarte) => void;
}

function CarteEventailAnimee({
  carte,
  x,
  decalageY,
  angle,
  largeurCarte,
  hauteurCarte,
  largeurEcran,
  hauteurEcran,
  hauteurConteneur,
  jouable,
  grisee,
  estMasquee,
  estEnPose,
  interactionActive,
  animerEntree,
  atlas,
  xProp,
  yProp,
  echelle,
  zIndex,
  dureeReorganisation,
  onCarteJouee,
}: PropsCarteEventail) {
  const DECALAGE_SOULEVEMENT_CARTE = 8;
  const estPremierRendu = useRef(true);
  const estInteractive = interactionActive && jouable && !estMasquee && !!onCarteJouee;

  // Position d'entrée : centre de la main (là où les cartes animées atterrissent)
  const centreMainX = largeurEcran * POSITIONS_MAINS.sud.x - largeurCarte / 2;
  const centreMainBottom = 0;

  const animX = useSharedValue(x);
  const animBottom = useSharedValue(decalageY);
  const animAngle = useSharedValue(angle);
  const animOpacite = useSharedValue(1);

  useEffect(() => {
    if (estPremierRendu.current) {
      estPremierRendu.current = false;
      if (!animerEntree) {
        animX.value = x;
        animBottom.value = decalageY;
        animAngle.value = angle;
        animOpacite.value = 1;
        return;
      }

      // Animer l'entrée depuis le centre de la main vers la position en éventail
      animX.value = centreMainX;
      animBottom.value = centreMainBottom;
      animAngle.value = 0;
      animOpacite.value = 0;
      const glissementEntree = construireGlissementCarteDepuisEtatCourant({
        depart: {
          x: centreMainX,
          y: centreMainBottom,
          rotation: 0,
          echelle: 1,
        },
        arrivee: {
          x,
          y: decalageY,
          rotation: angle,
          echelle: 1,
        },
      });

      const config = {
        duration: dureeReorganisation,
        easing: EASING_REORG,
      };
      animX.value = withTiming(glissementEntree.arrivee.x, config);
      animBottom.value = withTiming(glissementEntree.arrivee.y, config);
      animAngle.value = withTiming(glissementEntree.arrivee.rotation, config);
      animOpacite.value = withTiming(1, { duration: DUREE_FONDU_ENTREE_MAIN });
      return;
    }
    const glissementReorganisation = construireGlissementCarteDepuisEtatCourant({
      depart: {
        x: animX.value,
        y: animBottom.value,
        rotation: animAngle.value,
        echelle: 1,
      },
      arrivee: {
        x,
        y: decalageY,
        rotation: angle,
        echelle: 1,
      },
    });
    const config = {
      duration: dureeReorganisation,
      easing: EASING_REORG,
    };
    animX.value = glissementReorganisation.depart.x;
    animBottom.value = glissementReorganisation.depart.y;
    animAngle.value = glissementReorganisation.depart.rotation;
    animX.value = withTiming(glissementReorganisation.arrivee.x, config);
    animBottom.value = withTiming(glissementReorganisation.arrivee.y, config);
    animAngle.value = withTiming(glissementReorganisation.arrivee.rotation, config);
  }, [
    x,
    decalageY,
    angle,
    animerEntree,
    animX,
    animBottom,
    animAngle,
    animOpacite,
    centreMainX,
    dureeReorganisation,
  ]);

  const styleAnime = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: animX.value,
    bottom: animBottom.value,
    opacity: animOpacite.value,
    transformOrigin: `${largeurCarte / 2}px ${hauteurCarte}px`,
    transform: [{ rotate: `${animAngle.value}deg` }],
    zIndex,
  }));

  return (
    <Animated.View style={styleAnime}>
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
          opacity: estMasquee ? 0 : 1,
          transform:
            estEnPose || (pressed && estInteractive)
              ? [{ translateY: -DECALAGE_SOULEVEMENT_CARTE }]
              : [],
        })}
      >
        <CarteFaceAtlas
          atlas={atlas}
          carte={carte}
          largeur={largeurCarte}
          hauteur={hauteurCarte}
          grisee={grisee}
        />
      </Pressable>
    </Animated.View>
  );
}

// --- Composant principal ---

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
  onCarteJouee,
}: PropsMainJoueur) {
  const nbCartes = cartes.length;
  const nbCartesPrecedentRef = useRef(nbCartes);
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

  if (nbCartes === 0) return null;

  return (
    <View
      testID="main-joueur"
      style={{
        position: "absolute",
        bottom: -hauteurCarte * 0.15,
        left: 0,
        right: 0,
        height: disposition.hauteurConteneur,
        overflow: "visible",
      }}
    >
      {cartes.map((carte, index) => {
        const carteDisposition = disposition.cartes[index];
        const x = carteDisposition.x;
        const angle = carteDisposition.angle;
        const decalageY = carteDisposition.decalageY;

        const jouable = estJouable(carte, cartesJouables);
        const grisee = interactionActive && !jouable;
        const carteEstMasquee = estMasquee(carte, cartesMasquees);
        const carteEstEnPose = estEnPose(carte, cartesEnPose);
        const echelle = 1;

        // Position proportionnelle du centre de la carte sur l'écran
        const xProp = (x + largeurCarte / 2) / largeurEcran;
        // Le conteneur a bottom: -hauteurCarte * 0.15, la carte a bottom: decalageY dans le conteneur
        const yProp =
          1 - (decalageY + hauteurCarte / 2 - hauteurCarte * 0.15) / hauteurEcran;

        return (
          <CarteEventailAnimee
            key={`${carte.couleur}-${carte.rang}`}
            carte={carte}
            x={x}
            decalageY={decalageY}
            angle={angle}
            largeurCarte={largeurCarte}
            hauteurCarte={hauteurCarte}
            largeurEcran={largeurEcran}
            hauteurEcran={hauteurEcran}
            hauteurConteneur={disposition.hauteurConteneur}
            jouable={jouable}
            grisee={grisee}
            estMasquee={carteEstMasquee}
            estEnPose={carteEstEnPose}
            interactionActive={interactionActive}
            animerEntree={animerNouvellesCartes}
            atlas={atlas}
            xProp={xProp}
            yProp={yProp}
            echelle={echelle}
            zIndex={index}
            dureeReorganisation={dureeReorganisation}
            onCarteJouee={onCarteJouee}
          />
        );
      })}
    </View>
  );
}
