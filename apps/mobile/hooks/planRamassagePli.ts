import { accelererDureeAnimation } from "../constants/animations-visuelles";

export interface PlanRamassagePli {
  dureeConvergence: number;
  dureeGlissement: number;
  delaiPhase2: number;
}

export function planifierRamassagePli(): PlanRamassagePli {
  const dureeConvergence = accelererDureeAnimation(180);
  const dureeGlissement = accelererDureeAnimation(270);

  return {
    dureeConvergence,
    dureeGlissement,
    delaiPhase2: dureeConvergence,
  };
}

export function calculerDureeTotaleRamassagePli(): number {
  const { delaiPhase2, dureeGlissement } = planifierRamassagePli();
  return delaiPhase2 + dureeGlissement;
}
