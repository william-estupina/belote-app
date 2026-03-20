import type { PhaseUI } from "./useControleurJeu";

export function doitAfficherUIEncheres(
  phaseUI: PhaseUI,
  distributionEnCours: boolean,
): boolean {
  return phaseUI === "encheres" && !distributionEnCours;
}
