// Orchestration des animations de distribution (initiale, restante, redistribution)
import type { ContextePartie } from "@belote/game-logic";
import type { machineBelote } from "@belote/game-logic";
import type { Carte, PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { useCallback, useRef } from "react";
import type { Actor } from "xstate";

import { calculerDispositionReserveCentrale } from "../components/game/reserve-centrale-disposition";
import { ANIMATIONS } from "../constants/layout";
import { construireCartesRetourPaquet } from "./construireCartesRetourPaquet";
import { extraireEtatUI } from "./extraireEtatUI";
import { construireTransitionTriMainInitiale } from "./transition-tri-main-initiale";
import { trierMainJoueur } from "./triMainJoueur";
import type { useAnimations } from "./useAnimations";
import type { useAnimationsDistribution } from "./useAnimationsDistribution";
import type { EtatJeu } from "./useControleurJeu";

const INDEX_HUMAIN = 0;
const NB_CARTES_JEU_BELOTE = 32;

function conserverHistoriqueEncheresAvantRedistribution(etat: EtatJeu) {
  if (etat.phaseEncheres !== "encheres2" || etat.historiqueEncheres.length >= 8) {
    return etat.historiqueEncheres;
  }

  return [
    ...etat.historiqueEncheres,
    {
      type: "PASSER" as const,
      joueur: POSITIONS_JOUEUR[etat.indexDonneur],
    },
  ];
}

interface RefsPartagees {
  acteurRef: React.MutableRefObject<Actor<typeof machineBelote> | null>;
  etatJeuRef: React.MutableRefObject<EtatJeu>;
  dimensionsEcranRef: React.MutableRefObject<{ largeur: number; hauteur: number }>;
  estDemonte: React.MutableRefObject<boolean>;
  animationDistribEnCours: React.MutableRefObject<boolean>;
  nbPlisVus: React.MutableRefObject<number>;
  timeoutsControleurRef: React.MutableRefObject<ReturnType<typeof setTimeout>[]>;
  onRevelationTermineeRef: React.MutableRefObject<(() => void) | null>;
  onRetourCarteRetourneeRef: React.MutableRefObject<(() => void) | null>;
}

interface Deps {
  setEtatJeu: React.Dispatch<React.SetStateAction<EtatJeu>>;
  animations: ReturnType<typeof useAnimations>;
  animDistribution: ReturnType<typeof useAnimationsDistribution>;
  jouerBotSiNecessaire: () => void;
}

export function useOrchestrationDistribution(refs: RefsPartagees, deps: Deps) {
  const {
    acteurRef,
    etatJeuRef,
    dimensionsEcranRef,
    estDemonte,
    animationDistribEnCours,
    nbPlisVus,
    timeoutsControleurRef,
    onRevelationTermineeRef,
    onRetourCarteRetourneeRef,
  } = refs;
  const { setEtatJeu, animations, animDistribution, jouerBotSiNecessaire } = deps;

  // Ref pour appeler lancerDistributionRestanteAnimee depuis les callbacks déclarés avant
  const distribRestanteRef = useRef<(ctx: ContextePartie) => void>(() => {});

  // --- Phase 3 : tri et finalisation après distribution ---
  const lancerPhase3 = useCallback(
    (contexte: ContextePartie) => {
      const { distribution } = ANIMATIONS;

      const timeout = setTimeout(() => {
        if (estDemonte.current) return;

        const acteur = acteurRef.current;
        if (!acteur) return;
        const snap = acteur.getSnapshot();
        const etat = snap.value as string;
        const ctx = snap.context;
        const carteRetournee = ctx.carteRetournee;
        const mainTriee = trierMainJoueur(ctx.mains[INDEX_HUMAIN], {
          couleurPrioritaire: ctx.couleurAtout ?? ctx.carteRetournee?.couleur ?? null,
          couleurAtout: ctx.couleurAtout,
        });
        const transitionTriMainInitiale = construireTransitionTriMainInitiale(
          ctx.mains[INDEX_HUMAIN],
          mainTriee,
        );
        const dimensionsCourantes = dimensionsEcranRef.current;

        animDistribution.animerTriSud({
          mainDistribuee: ctx.mains[INDEX_HUMAIN],
          mainTriee,
          largeurEcran: dimensionsCourantes.largeur,
          hauteurEcran: dimensionsCourantes.hauteur,
          onTerminee: () => {
            if (estDemonte.current) return;

            animationDistribEnCours.current = false;

            setEtatJeu((prev) => ({
              ...prev,
              mainJoueur: transitionTriMainInitiale.etatAvantTri.mainJoueur,
              phaseUI: "distribution",
              phaseEncheres: null,
              carteRetournee: null,
              nbCartesAdversaires: {
                nord: ctx.mains[2].length,
                est: ctx.mains[3].length,
                ouest: ctx.mains[1].length,
              },
              cartesRestantesPaquet: 12,
              nbCartesAnticipeesJoueur: ctx.mains[INDEX_HUMAIN].length,
              triMainDiffere: transitionTriMainInitiale.etatAvantTri.triMainDiffere,
            }));

            const timeoutTerminer = setTimeout(() => {
              animDistribution.terminerDistribution();
            }, 16);
            timeoutsControleurRef.current.push(timeoutTerminer);

            if (
              !carteRetournee ||
              dimensionsCourantes.largeur <= 0 ||
              dimensionsCourantes.hauteur <= 0
            ) {
              finaliserEntreeEncheres();
              return;
            }

            onRevelationTermineeRef.current = finaliserEntreeEncheres;
            setEtatJeu((prev) => ({
              ...prev,
              phaseUI: "revelationCarte",
              carteRetournee,
            }));
          },
        });
        // Masquer les cartes sud dans l'Atlas avant de démonter le canvas,
        // pour éviter un flash dû au double rendu (Atlas + MainJoueur).
        const finaliserEntreeEncheres = () => {
          if (estDemonte.current) return;

          setEtatJeu((prev) => ({
            ...prev,
            ...extraireEtatUI(ctx, etat),
            mainJoueur: transitionTriMainInitiale.etatApresTri.mainJoueur,
            triMainDiffere: transitionTriMainInitiale.etatApresTri.triMainDiffere,
            nbCartesAdversaires: {
              nord: ctx.mains[2].length,
              est: ctx.mains[3].length,
              ouest: ctx.mains[1].length,
            },
            cartesRestantesPaquet: 12,
            nbCartesAnticipeesJoueur: ctx.mains[INDEX_HUMAIN].length,
          }));

          const timeoutBot = setTimeout(() => jouerBotSiNecessaire(), 50);
          timeoutsControleurRef.current.push(timeoutBot);
        };
      }, distribution.pauseAvantTri);

      timeoutsControleurRef.current.push(timeout);
    },
    [
      acteurRef,
      estDemonte,
      animationDistribEnCours,
      dimensionsEcranRef,
      timeoutsControleurRef,
      onRevelationTermineeRef,
      jouerBotSiNecessaire,
      animDistribution,
      setEtatJeu,
    ],
  );

  // --- Lancer la distribution avec animation ---
  const lancerDistributionAnimee = useCallback(
    (contexte: ContextePartie) => {
      animationDistribEnCours.current = true;
      nbPlisVus.current = 0;

      const mainsRecord: Record<PositionJoueur, Carte[]> = {
        sud: contexte.mains[0],
        ouest: contexte.mains[1],
        nord: contexte.mains[2],
        est: contexte.mains[3],
      };

      // Calculer le nombre total de cartes à distribuer (5 par joueur = 20)
      let totalCartesAttendues = 0;
      for (const pos of POSITIONS_JOUEUR) {
        totalCartesAttendues += mainsRecord[pos].length;
      }

      setEtatJeu((prev) => ({
        ...prev,
        phaseUI: "distribution",
        mainJoueur: [],
        nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
        pliEnCours: [],
        cartesRestantesPaquet: NB_CARTES_JEU_BELOTE,
        nbCartesAnticipeesJoueur: 0,
        triMainDiffere: false,
        dernierPliVisible: null,
        precedentDernierPliVisible: null,
        transitionDernierPliActive: false,
        dureeTransitionDernierPliMs: 0,
        cleTransitionDernierPli: 0,
        afficherActionsEnchereRedistribution: false,
      }));

      let cartesRecues = 0;
      let cartesSudEnvoyees = 0;

      animDistribution.lancerDistribution(mainsRecord, {
        indexDonneur: contexte.indexDonneur,
        cartesVisibles: mainsRecord.sud,
        onPaquetDepart: (position, cartes) => {
          if (estDemonte.current) return;
          if (position === "sud") {
            cartesSudEnvoyees += cartes.length;
          }

          setEtatJeu((prev) => ({
            ...prev,
            cartesRestantesPaquet: prev.cartesRestantesPaquet - cartes.length,
            nbCartesAnticipeesJoueur:
              position === "sud" ? cartesSudEnvoyees : prev.nbCartesAnticipeesJoueur,
          }));
        },
        onPaquetArrive: (position, cartes) => {
          if (estDemonte.current) return;

          if (position !== "sud") {
            setEtatJeu((prev) => ({
              ...prev,
              nbCartesAdversaires: {
                ...prev.nbCartesAdversaires,
                [position]:
                  prev.nbCartesAdversaires[position as "nord" | "est" | "ouest"] +
                  cartes.length,
              },
            }));
          } else {
            // Masquer les slots canvas sud arrivés pour éviter le doublon visuel,
            // puis ajouter immédiatement à la main pour permettre l'animation
            // de réorganisation quand le paquet suivant partira.
          }

          cartesRecues += cartes.length;
          if (cartesRecues >= totalCartesAttendues) {
            lancerPhase3(contexte);
          }
        },
      });
    },
    [
      animDistribution,
      lancerPhase3,
      estDemonte,
      animationDistribEnCours,
      nbPlisVus,
      setEtatJeu,
    ],
  );

  const lancerRedistributionAnimee = useCallback(
    (contexte: ContextePartie) => {
      animationDistribEnCours.current = true;
      nbPlisVus.current = 0;

      setEtatJeu((prev) => ({
        ...prev,
        phaseUI: "redistribution",
        indexDonneur: prev.indexDonneur,
        joueurActif: POSITIONS_JOUEUR[contexte.indexJoueurActif],
        phaseEncheres: prev.phaseEncheres,
        indexPreneur: null,
        couleurAtout: null,
        cartesRestantesPaquet: 1,
        historiqueEncheres: conserverHistoriqueEncheresAvantRedistribution(prev),
        cartesJouables: [],
        estTourHumain: false,
        afficherActionsEnchereRedistribution: true,
      }));

      const timeoutAvantRappel = setTimeout(() => {
        if (estDemonte.current) return;

        const { largeur, hauteur } = dimensionsEcranRef.current;
        const disposition = calculerDispositionReserveCentrale({
          largeurEcran: largeur,
          hauteurEcran: hauteur,
        });
        const centrePaquet = {
          x: disposition.centrePaquet.x / largeur,
          y: disposition.centrePaquet.y / hauteur,
        };

        const carteRetournee = etatJeuRef.current.carteRetournee;
        const cartesRetour = construireCartesRetourPaquet(
          etatJeuRef.current,
          largeur,
          hauteur,
        );

        const lancerPhase2 = () => {
          animations.lancerAnimationRetourPaquet(cartesRetour, centrePaquet, () => {
            if (estDemonte.current) return;

            setEtatJeu((prev) => ({
              ...prev,
              cartesRestantesPaquet: 32,
              indexDonneur: contexte.indexDonneur,
            }));

            const timeoutApresDealer = setTimeout(() => {
              if (estDemonte.current) return;
              lancerDistributionAnimee(contexte);
            }, ANIMATIONS.redistribution.dureeGlissementDealer);

            timeoutsControleurRef.current.push(timeoutApresDealer);
          });
        };

        if (carteRetournee) {
          onRetourCarteRetourneeRef.current = () => {
            setEtatJeu((prev) => ({ ...prev, carteRetourneeEnRetour: null }));
            lancerPhase2();
          };
          setEtatJeu((prev) => ({
            ...prev,
            mainJoueur: [],
            nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
            carteRetournee: null,
            carteRetourneeEnRetour: carteRetournee,
            phaseEncheres: null,
            historiqueEncheres: [],
            cartesRestantesPaquet: 1,
            afficherActionsEnchereRedistribution: false,
          }));
        } else {
          setEtatJeu((prev) => ({
            ...prev,
            mainJoueur: [],
            nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
            phaseEncheres: null,
            historiqueEncheres: [],
            cartesRestantesPaquet: 1,
            afficherActionsEnchereRedistribution: false,
          }));
          lancerPhase2();
        }
      }, ANIMATIONS.redistribution.pauseAvantRappel);

      timeoutsControleurRef.current.push(timeoutAvantRappel);
    },
    [
      animations,
      lancerDistributionAnimee,
      estDemonte,
      animationDistribEnCours,
      nbPlisVus,
      dimensionsEcranRef,
      etatJeuRef,
      timeoutsControleurRef,
      onRetourCarteRetourneeRef,
      setEtatJeu,
    ],
  );

  // --- Phase 3 restante : tri et finalisation après distribution restante ---
  const lancerPhase3Restante = useCallback(
    (contexte: ContextePartie) => {
      const { distribution } = ANIMATIONS;

      const timeout = setTimeout(() => {
        if (estDemonte.current) return;

        const acteur = acteurRef.current;
        if (!acteur) return;
        const snap = acteur.getSnapshot();
        const etat = snap.value as string;
        const ctx = snap.context;

        const mainTriee = trierMainJoueur(ctx.mains[INDEX_HUMAIN], {
          couleurPrioritaire: ctx.couleurAtout ?? ctx.carteRetournee?.couleur ?? null,
          couleurAtout: ctx.couleurAtout,
        });
        const dimensionsCourantes = dimensionsEcranRef.current;

        animDistribution.animerTriSud({
          mainDistribuee: ctx.mains[INDEX_HUMAIN],
          mainTriee,
          largeurEcran: dimensionsCourantes.largeur,
          hauteurEcran: dimensionsCourantes.hauteur,
          onTerminee: () => {
            if (estDemonte.current) return;

            animationDistribEnCours.current = false;

            setEtatJeu((prev) => ({
              ...prev,
              ...extraireEtatUI(ctx, etat),
              mainJoueur: mainTriee,
              triMainDiffere: true,
              nbCartesAdversaires: {
                nord: ctx.mains[2].length,
                est: ctx.mains[3].length,
                ouest: ctx.mains[1].length,
              },
              cartesRestantesPaquet: 0,
              nbCartesAnticipeesJoueur: ctx.mains[INDEX_HUMAIN].length,
            }));

            const timeoutTerminer = setTimeout(() => {
              animDistribution.terminerDistribution();
              setEtatJeu((prev) => ({ ...prev, triMainDiffere: false }));
              const timeoutBot = setTimeout(() => jouerBotSiNecessaire(), 50);
              timeoutsControleurRef.current.push(timeoutBot);
            }, 16);
            timeoutsControleurRef.current.push(timeoutTerminer);
          },
        });
      }, distribution.pauseAvantTri);

      timeoutsControleurRef.current.push(timeout);
    },
    [
      acteurRef,
      estDemonte,
      animationDistribEnCours,
      timeoutsControleurRef,
      jouerBotSiNecessaire,
      animDistribution,
      setEtatJeu,
    ],
  );

  // --- Animation distribution restante (après enchères) ---
  const lancerDistributionRestanteAnimee = useCallback(
    (contexte: ContextePartie) => {
      animationDistribEnCours.current = true;

      const indexPreneur = contexte.indexPreneur!;
      const positionPreneur = POSITIONS_JOUEUR[indexPreneur];

      const premierServi = POSITIONS_JOUEUR[(contexte.indexDonneur + 3) % 4];
      const estPreneurPremier = positionPreneur === premierServi;

      const mainsRecord: Record<PositionJoueur, Carte[]> = {
        sud: [],
        ouest: [],
        nord: [],
        est: [],
      };

      for (let i = 0; i < 4; i++) {
        const pos = POSITIONS_JOUEUR[i];
        if (i === indexPreneur) {
          mainsRecord[pos] = contexte.mains[i].slice(6);
        } else {
          mainsRecord[pos] = contexte.mains[i].slice(5);
        }
      }

      const carteRetournee = contexte.carteRetournee;

      const sudEstPreneur = indexPreneur === 0;
      const cartesExistantesSud =
        sudEstPreneur && !estPreneurPremier && carteRetournee
          ? [...etatJeuRef.current.mainJoueur, carteRetournee]
          : [...etatJeuRef.current.mainJoueur];
      const nbCartesExistantesSud = cartesExistantesSud.length;

      let totalCartesAttendues = 0;
      for (const pos of POSITIONS_JOUEUR) {
        totalCartesAttendues += mainsRecord[pos].length;
      }
      if (carteRetournee) {
        totalCartesAttendues += 1;
      }

      setEtatJeu((prev) => ({
        ...prev,
        phaseUI: "distribution",
        carteRetournee: null,
        cartesRestantesPaquet: totalCartesAttendues,
        nbCartesAnticipeesJoueur: prev.mainJoueur.length,
        triMainDiffere: false,
      }));

      let cartesRecues = 0;
      let cartesSudEnvoyeesRestante = nbCartesExistantesSud;
      const cartesSudAccumuleesRestante: Carte[] = [];

      const gererPaquetDepart = (position: PositionJoueur, cartes: Carte[]) => {
        if (estDemonte.current) return;
        if (position === "sud") {
          cartesSudEnvoyeesRestante += cartes.length;
        }

        setEtatJeu((prev) => ({
          ...prev,
          cartesRestantesPaquet: prev.cartesRestantesPaquet - cartes.length,
          nbCartesAnticipeesJoueur:
            position === "sud"
              ? cartesSudEnvoyeesRestante
              : prev.nbCartesAnticipeesJoueur,
        }));
      };

      const gererPaquetArrive = (position: PositionJoueur, cartes: Carte[]) => {
        if (estDemonte.current) return;

        if (position !== "sud") {
          setEtatJeu((prev) => ({
            ...prev,
            nbCartesAdversaires: {
              ...prev.nbCartesAdversaires,
              [position]:
                prev.nbCartesAdversaires[position as "nord" | "est" | "ouest"] +
                cartes.length,
            },
          }));
        } else {
          cartesSudAccumuleesRestante.push(...cartes);
        }

        cartesRecues += cartes.length;
        if (cartesRecues >= totalCartesAttendues) {
          lancerPhase3Restante(contexte);
        }
      };

      const lancerDistribRestante = () => {
        const cartesVisiblesSud = mainsRecord.sud;
        const cartesVisibles =
          estPreneurPremier && carteRetournee
            ? [carteRetournee, ...cartesVisiblesSud]
            : [...cartesVisiblesSud];

        const mainsADistribuer = estPreneurPremier
          ? {
              ...mainsRecord,
              [positionPreneur]: carteRetournee
                ? [carteRetournee, ...mainsRecord[positionPreneur]]
                : mainsRecord[positionPreneur],
            }
          : mainsRecord;

        const nbCartesExistantesAdversaires: Partial<
          Record<"nord" | "est" | "ouest", number>
        > = {};
        for (const pos of ["nord", "est", "ouest"] as const) {
          const idx = POSITIONS_JOUEUR.indexOf(pos);
          nbCartesExistantesAdversaires[pos] =
            contexte.mains[idx].length - mainsADistribuer[pos].length;
        }

        animDistribution.lancerDistribution(mainsADistribuer, {
          indexDonneur: contexte.indexDonneur,
          cartesExistantesSud,
          nbCartesExistantesSud,
          nbCartesExistantesAdversaires,
          cartesVisibles,
          onPaquetDepart: (position, cartes) => {
            gererPaquetDepart(position, cartes);
          },
          onPaquetArrive: gererPaquetArrive,
        });
      };

      if (!estPreneurPremier && carteRetournee) {
        gererPaquetDepart(positionPreneur, [carteRetournee]);
        animations.glisserCarteRetournee(
          carteRetournee,
          0.5,
          0.35,
          positionPreneur,
          () => {
            gererPaquetArrive(positionPreneur, [carteRetournee]);
            lancerDistribRestante();
          },
        );
      } else {
        lancerDistribRestante();
      }
    },
    [
      animations,
      animDistribution,
      lancerPhase3Restante,
      estDemonte,
      animationDistribEnCours,
      setEtatJeu,
    ],
  );

  // Mettre à jour la ref pour que prendre/annoncer puissent appeler cette fonction
  distribRestanteRef.current = lancerDistributionRestanteAnimee;

  return {
    distribRestanteRef,
    lancerDistributionAnimee,
    lancerRedistributionAnimee,
    lancerDistributionRestanteAnimee,
  };
}
