// Orchestration des animations de distribution (initiale, restante, redistribution)
import type { ContextePartie } from "@belote/game-logic";
import type { machineBelote } from "@belote/game-logic";
import type { Carte, Couleur, PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { useCallback, useRef } from "react";
import type { Actor } from "xstate";

import { calculerDispositionReserveCentrale } from "../components/game/reserve-centrale-disposition";
import { ANIMATIONS } from "../constants/layout";
import { construireCartesRetourPaquet } from "./construireCartesRetourPaquet";
import { extraireEtatUI } from "./extraireEtatUI";
import type { useAnimations } from "./useAnimations";
import type { useAnimationsDistribution } from "./useAnimationsDistribution";
import type { EtatJeu } from "./useControleurJeu";

const INDEX_HUMAIN = 0;
const NB_CARTES_JEU_BELOTE = 32;

function estPositionAdverse(
  position: PositionJoueur,
): position is "nord" | "est" | "ouest" {
  return position !== "sud";
}

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

function extraireNbCartesAdversaires(
  contexte: ContextePartie,
): EtatJeu["nbCartesAdversaires"] {
  return {
    nord: contexte.mains[2].length,
    est: contexte.mains[3].length,
    ouest: contexte.mains[1].length,
  };
}

function creerMainsRecordDepuisContexte(
  contexte: ContextePartie,
): Record<PositionJoueur, Carte[]> {
  return {
    sud: contexte.mains[0],
    ouest: contexte.mains[1],
    nord: contexte.mains[2],
    est: contexte.mains[3],
  };
}

const ORDRE_COULEURS_TRI_DISTRIBUTION: Couleur[] = [
  "pique",
  "coeur",
  "carreau",
  "trefle",
];

function trierMainParCouleur(main: ReadonlyArray<Carte>): Carte[] {
  return [...main].sort(
    (a, b) =>
      ORDRE_COULEURS_TRI_DISTRIBUTION.indexOf(a.couleur) -
      ORDRE_COULEURS_TRI_DISTRIBUTION.indexOf(b.couleur),
  );
}

function calculerTotalCartes(
  mains: Record<PositionJoueur, Carte[]>,
  cartesSupplementaires = 0,
): number {
  let total = cartesSupplementaires;
  for (const position of POSITIONS_JOUEUR) {
    total += mains[position].length;
  }

  return total;
}

function ajouterCartesAuxAdversaires(
  nbCartesAdversaires: EtatJeu["nbCartesAdversaires"],
  position: PositionJoueur,
  nombreCartes: number,
): EtatJeu["nbCartesAdversaires"] {
  if (!estPositionAdverse(position)) {
    return nbCartesAdversaires;
  }

  return {
    ...nbCartesAdversaires,
    [position]: nbCartesAdversaires[position] + nombreCartes,
  };
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

  const planifierTimeout = useCallback(
    (callback: () => void, delaiMs: number) => {
      const timeout = setTimeout(callback, delaiMs);
      timeoutsControleurRef.current.push(timeout);
      return timeout;
    },
    [timeoutsControleurRef],
  );

  const construireEtatDepuisContexte = useCallback(
    (
      contexte: ContextePartie,
      etatMachine: string,
      cartesRestantesPaquet: number,
    ): Partial<EtatJeu> => ({
      ...extraireEtatUI(contexte, etatMachine),
      mainJoueur: [...contexte.mains[INDEX_HUMAIN]],
      nbCartesAdversaires: extraireNbCartesAdversaires(contexte),
      cartesRestantesPaquet,
      nbCartesAnticipeesJoueur: contexte.mains[INDEX_HUMAIN].length,
    }),
    [],
  );

  const programmerRelanceBot = useCallback(() => {
    planifierTimeout(() => {
      if (estDemonte.current) return;
      jouerBotSiNecessaire();
    }, 50);
  }, [estDemonte, jouerBotSiNecessaire, planifierTimeout]);

  // --- Phase 3 : finalisation après distribution ---
  const lancerPhase3 = useCallback(
    (_contexte: ContextePartie) => {
      if (estDemonte.current) return;

      const acteur = acteurRef.current;
      if (!acteur) return;
      const snap = acteur.getSnapshot();
      const etat = snap.value as string;
      const ctx = snap.context;
      const carteRetournee = ctx.carteRetournee;
      const dimensionsCourantes = dimensionsEcranRef.current;

      const finaliserEntreeEncheres = () => {
        if (estDemonte.current) return;

        setEtatJeu((prev) => ({
          ...prev,
          ...construireEtatDepuisContexte(ctx, etat, 12),
          mainJoueur: trierMainParCouleur(ctx.mains[INDEX_HUMAIN]),
        }));
        programmerRelanceBot();
      };

      animationDistribEnCours.current = false;

      setEtatJeu((prev) => ({
        ...prev,
        mainJoueur: [...ctx.mains[INDEX_HUMAIN]],
        phaseUI: "distribution",
        phaseEncheres: null,
        carteRetournee: null,
        nbCartesAdversaires: extraireNbCartesAdversaires(ctx),
        cartesRestantesPaquet: 12,
        nbCartesAnticipeesJoueur: ctx.mains[INDEX_HUMAIN].length,
      }));

      planifierTimeout(() => {
        animDistribution.terminerDistribution();

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
      }, 16);
    },
    [
      acteurRef,
      estDemonte,
      animationDistribEnCours,
      dimensionsEcranRef,
      animDistribution,
      construireEtatDepuisContexte,
      onRevelationTermineeRef,
      planifierTimeout,
      programmerRelanceBot,
      setEtatJeu,
    ],
  );

  // --- Lancer la distribution avec animation ---
  const lancerDistributionAnimee = useCallback(
    (contexte: ContextePartie) => {
      animationDistribEnCours.current = true;
      nbPlisVus.current = 0;

      const mainsRecord = creerMainsRecordDepuisContexte(contexte);
      const totalCartesAttendues = calculerTotalCartes(mainsRecord);

      setEtatJeu((prev) => ({
        ...prev,
        phaseUI: "distribution",
        mainJoueur: [],
        nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
        pliEnCours: [],
        cartesRestantesPaquet: NB_CARTES_JEU_BELOTE,
        nbCartesAnticipeesJoueur: 0,
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
        desactiverTri: true,
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

          if (estPositionAdverse(position)) {
            setEtatJeu((prev) => ({
              ...prev,
              nbCartesAdversaires: ajouterCartesAuxAdversaires(
                prev.nbCartesAdversaires,
                position,
                cartes.length,
              ),
            }));
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

      planifierTimeout(() => {
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

            planifierTimeout(() => {
              if (estDemonte.current) return;
              lancerDistributionAnimee(contexte);
            }, ANIMATIONS.redistribution.dureeGlissementDealer);
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
    },
    [
      animations,
      lancerDistributionAnimee,
      estDemonte,
      animationDistribEnCours,
      nbPlisVus,
      dimensionsEcranRef,
      etatJeuRef,
      onRetourCarteRetourneeRef,
      planifierTimeout,
      setEtatJeu,
    ],
  );

  // --- Phase 3 restante : finalisation après distribution restante ---
  const lancerPhase3Restante = useCallback(
    (_contexte: ContextePartie) => {
      if (estDemonte.current) return;

      const acteur = acteurRef.current;
      if (!acteur) return;
      const snap = acteur.getSnapshot();
      const etat = snap.value as string;
      const ctx = snap.context;

      animationDistribEnCours.current = false;
      animDistribution.terminerDistribution();

      const mainTriee = trierMainParCouleur(ctx.mains[INDEX_HUMAIN]);

      setEtatJeu((prev) => ({
        ...prev,
        ...construireEtatDepuisContexte(ctx, etat, 0),
        mainJoueur: mainTriee,
      }));

      planifierTimeout(() => {
        programmerRelanceBot();
      }, 16);
    },
    [
      acteurRef,
      estDemonte,
      animationDistribEnCours,
      animDistribution,
      construireEtatDepuisContexte,
      planifierTimeout,
      programmerRelanceBot,
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

      const totalCartesAttendues = calculerTotalCartes(
        mainsRecord,
        carteRetournee ? 1 : 0,
      );

      setEtatJeu((prev) => ({
        ...prev,
        phaseUI: "distribution",
        carteRetournee: null,
        cartesRestantesPaquet: totalCartesAttendues,
        nbCartesAnticipeesJoueur: prev.mainJoueur.length,
      }));

      let cartesRecues = 0;
      let cartesSudEnvoyeesRestante = nbCartesExistantesSud;
      let tousCartesRecues = false;
      let triSudTermine = false;

      const verifierEtLancerPhase3Restante = () => {
        if (tousCartesRecues && triSudTermine) {
          lancerPhase3Restante(contexte);
        }
      };

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

        if (estPositionAdverse(position)) {
          setEtatJeu((prev) => ({
            ...prev,
            nbCartesAdversaires: ajouterCartesAuxAdversaires(
              prev.nbCartesAdversaires,
              position,
              cartes.length,
            ),
          }));
        }

        cartesRecues += cartes.length;
        if (cartesRecues >= totalCartesAttendues) {
          tousCartesRecues = true;
          verifierEtLancerPhase3Restante();
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
          onTriSudTermine: () => {
            if (estDemonte.current) return;
            triSudTermine = true;
            verifierEtLancerPhase3Restante();
          },
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
