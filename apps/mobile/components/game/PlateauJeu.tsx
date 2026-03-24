import type { ActionEnchere, PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { useCallback, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { COULEURS } from "../../constants/theme";
import { useControleurJeu } from "../../hooks/useControleurJeu";
import { doitAfficherDernierPli } from "../../hooks/visibiliteDernierPli";
import { doitAfficherUIEncheres } from "../../hooks/visibiliteEncheres";
import { useAppStore } from "../../stores/app-store";
import { AvatarJoueur } from "./AvatarJoueur";
import { BulleBelote } from "./BulleBelote";
import { CoucheAnimation } from "./CoucheAnimation";
import { DernierPli } from "./DernierPli";
import { DialogueFinManche } from "./DialogueFinManche";
import { DialogueFinPartie } from "./DialogueFinPartie";
import { MainAdversaire } from "./MainAdversaire";
import { MainJoueur } from "./MainJoueur";
import { PanneauEncheres } from "./PanneauEncheres";
import { PaquetCentral } from "./PaquetCentral";
import { PilePlis } from "./PilePlis";
import { TableauScores } from "./TableauScores";
import { ZoneCarteRetournee } from "./ZoneCarteRetournee";
import { ZonePli } from "./ZonePli";

const estWeb = Platform.OS === "web";

export default function PlateauJeu() {
  const [dimensions, setDimensions] = useState({ largeur: 0, hauteur: 0 });
  const { preferences } = useAppStore();
  const { largeur, hauteur } = dimensions;

  const {
    etatJeu,
    cartesEnVol,
    surAnimationTerminee,
    atlas,
    cartesAtlasDistribution,
    progressionsDistribution,
    donneesWorkletDistribution,
    nbCartesActivesDistribution,
    distributionEnCours,
    demarrerPartie,
    jouerCarte,
    prendre,
    annoncer,
    passer,
    continuerApresScore,
    recommencer,
  } = useControleurJeu({
    difficulte: preferences.difficulte,
    scoreObjectif: preferences.scoreObjectif,
    largeurEcran: largeur,
    hauteurEcran: hauteur,
  });

  const surLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDimensions({ largeur: width, hauteur: height });
  }, []);
  const afficherUIEncheres = doitAfficherUIEncheres(
    etatJeu.phaseUI,
    distributionEnCours ?? false,
  );

  // Dernière action d'enchère par joueur (pour les badges sur les avatars)
  const derniereActionParJoueur = useMemo(() => {
    const map = new Map<PositionJoueur, ActionEnchere>();
    for (const action of etatJeu.historiqueEncheres) {
      map.set(action.joueur, action);
    }
    return map;
  }, [etatJeu.historiqueEncheres]);

  // Position du preneur
  const positionPreneur =
    etatJeu.indexPreneur !== null ? POSITIONS_JOUEUR[etatJeu.indexPreneur] : null;

  return (
    <View style={styles.plateau} onLayout={surLayout}>
      {largeur > 0 && hauteur > 0 && (
        <>
          {/* Bordure décorative */}
          <View style={styles.bordure} />

          {/* Écran d'accueil — bouton Jouer */}
          {etatJeu.phaseUI === "inactif" && (
            <View style={styles.centreOverlay}>
              <Pressable style={styles.boutonJouer} onPress={demarrerPartie}>
                <Text style={styles.texteBoutonJouer}>Jouer</Text>
              </Pressable>
            </View>
          )}

          {/* Mains des adversaires (dos des cartes) */}
          <MainAdversaire
            nbCartes={etatJeu.nbCartesAdversaires.nord}
            position="nord"
            largeurEcran={largeur}
            hauteurEcran={hauteur}
          />
          <MainAdversaire
            nbCartes={etatJeu.nbCartesAdversaires.ouest}
            position="ouest"
            largeurEcran={largeur}
            hauteurEcran={hauteur}
          />
          <MainAdversaire
            nbCartes={etatJeu.nbCartesAdversaires.est}
            position="est"
            largeurEcran={largeur}
            hauteurEcran={hauteur}
          />

          {/* Avatars des joueurs — identité, enchères et indicateur preneur */}
          {(["sud", "nord", "ouest", "est"] as const).map((pos) => (
            <AvatarJoueur
              key={pos}
              position={pos}
              largeurEcran={largeur}
              hauteurEcran={hauteur}
              estActif={
                (etatJeu.phaseUI === "encheres" || etatJeu.phaseUI === "jeu") &&
                etatJeu.joueurActif === pos
              }
              actionEnchere={derniereActionParJoueur.get(pos) ?? null}
              estPreneur={positionPreneur === pos}
              couleurAtout={etatJeu.couleurAtout}
              phaseUI={etatJeu.phaseUI}
            />
          ))}

          {/* Zone du pli au centre */}
          <ZonePli
            cartes={etatJeu.pliEnCours}
            largeurEcran={largeur}
            hauteurEcran={hauteur}
            couleurAtout={etatJeu.couleurAtout}
            afficherCadre={etatJeu.phaseUI !== "inactif"}
            atlas={atlas}
          />

          {/* Scores */}
          <View
            style={[
              styles.indicateurs,
              estWeb ? styles.indicateursWeb : styles.indicateursMobile,
            ]}
          >
            <TableauScores
              scoreEquipe1={etatJeu.scoreEquipe1}
              scoreEquipe2={etatJeu.scoreEquipe2}
            />
          </View>

          {/* Piles de plis remportés */}
          {etatJeu.phaseUI !== "inactif" && (
            <>
              <PilePlis
                equipe="equipe1"
                nbPlis={etatJeu.plisEquipe1}
                largeurEcran={largeur}
                hauteurEcran={hauteur}
              />
              <PilePlis
                equipe="equipe2"
                nbPlis={etatJeu.plisEquipe2}
                largeurEcran={largeur}
                hauteurEcran={hauteur}
              />
            </>
          )}

          {/* Dernier pli (haut à droite) */}
          {doitAfficherDernierPli(etatJeu.phaseUI, etatJeu.dernierPliVisible ? 1 : 0) && (
            <DernierPli
              dernierPli={etatJeu.dernierPliVisible!}
              precedentDernierPli={etatJeu.precedentDernierPliVisible}
              transitionDernierPliActive={etatJeu.transitionDernierPliActive}
              dureeTransitionDernierPliMs={etatJeu.dureeTransitionDernierPliMs}
              cleTransitionDernierPli={etatJeu.cleTransitionDernierPli}
            />
          )}

          {/* Main du joueur (sud) en éventail — interactive */}
          <MainJoueur
            cartes={etatJeu.mainJoueur}
            largeurEcran={largeur}
            hauteurEcran={hauteur}
            animerNouvellesCartes={!distributionEnCours}
            modeDisposition={distributionEnCours ? "reception" : "eventail"}
            nbCartesDisposition={
              distributionEnCours
                ? Math.max(etatJeu.mainJoueur.length, etatJeu.nbCartesAnticipeesJoueur)
                : undefined
            }
            atlas={atlas}
            cartesJouables={
              etatJeu.phaseUI === "jeu" && etatJeu.estTourHumain
                ? etatJeu.cartesJouables
                : undefined
            }
            interactionActive={etatJeu.phaseUI === "jeu" && etatJeu.estTourHumain}
            onCarteJouee={jouerCarte}
          />

          {/* Carte retournée visible pendant les enchères */}
          {afficherUIEncheres && etatJeu.carteRetournee && (
            <ZoneCarteRetournee
              carte={etatJeu.carteRetournee}
              largeurEcran={largeur}
              hauteurEcran={hauteur}
              atlas={atlas}
            />
          )}

          {/* Paquet central empilé (visible pendant la distribution) */}
          {etatJeu.phaseUI === "distribution" && (
            <PaquetCentral
              cartesRestantes={etatJeu.cartesRestantesPaquet}
              largeurEcran={largeur}
              hauteurEcran={hauteur}
              indexDonneur={etatJeu.indexDonneur}
            />
          )}

          {/* Couche d'animation (cartes en vol) */}
          <CoucheAnimation
            cartesEnVol={cartesEnVol}
            largeurEcran={largeur}
            hauteurEcran={hauteur}
            onAnimationTerminee={surAnimationTerminee}
            atlas={atlas}
            cartesAtlasDistribution={cartesAtlasDistribution}
            progressionsDistribution={progressionsDistribution}
            donneesWorkletDistribution={donneesWorkletDistribution}
            nbCartesActivesDistribution={nbCartesActivesDistribution}
            distributionEnCours={distributionEnCours}
          />

          {/* Panneau d'enchères (quand c'est au joueur humain de décider) */}
          {afficherUIEncheres &&
            etatJeu.estTourHumain &&
            etatJeu.phaseEncheres !== null && (
              <PanneauEncheres
                phaseEncheres={etatJeu.phaseEncheres}
                carteRetournee={etatJeu.carteRetournee}
                onPrendre={prendre}
                onAnnoncer={annoncer}
                onPasser={passer}
              />
            )}

          {/* Bulle belote/rebelote */}
          {etatJeu.annonceBelote && (
            <BulleBelote
              joueur={etatJeu.annonceBelote.joueur}
              type={etatJeu.annonceBelote.type}
              largeurEcran={largeur}
              hauteurEcran={hauteur}
            />
          )}

          {/* Dialogue fin de manche */}
          {etatJeu.phaseUI === "scoresManche" && (
            <DialogueFinManche
              scoreMancheEquipe1={etatJeu.scoreMancheEquipe1}
              scoreMancheEquipe2={etatJeu.scoreMancheEquipe2}
              scoreEquipe1={etatJeu.scoreEquipe1}
              scoreEquipe2={etatJeu.scoreEquipe2}
              onContinuer={continuerApresScore}
            />
          )}

          {/* Dialogue fin de partie */}
          {etatJeu.phaseUI === "finPartie" && (
            <DialogueFinPartie
              scoreEquipe1={etatJeu.scoreEquipe1}
              scoreEquipe2={etatJeu.scoreEquipe2}
              scoreObjectif={etatJeu.scoreObjectif}
              onRecommencer={recommencer}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  plateau: {
    flex: 1,
    backgroundColor: COULEURS.fondPrincipal,
  },
  bordure: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COULEURS.fondFonce,
  },
  indicateurs: {
    position: "absolute",
    gap: 3,
    zIndex: 10,
  },
  indicateursWeb: {
    left: 8,
    top: 8,
  },
  indicateursMobile: {
    left: 40,
    top: 4,
  },
  centreOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 40,
  },
  boutonJouer: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#e8b730",
    shadowColor: "rgba(212, 160, 23, 0.4)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  texteBoutonJouer: {
    color: "#1a1a1a",
    fontWeight: "bold",
    fontSize: 22,
  },
});
