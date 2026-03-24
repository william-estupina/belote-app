import type { PhaseUI } from "./useControleurJeu";

export function doitAfficherDernierPli(
  phaseUI: PhaseUI,
  longueurHistoriquePlis: number,
): boolean {
  if (longueurHistoriquePlis <= 0) {
    return false;
  }

  return phaseUI === "jeu" || phaseUI === "finPli";
}
