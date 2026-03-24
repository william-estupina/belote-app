export interface PlanRamassagePli {
  dureeConvergence: number;
  dureeGlissement: number;
  delaiPhase2: number;
}

export function planifierRamassagePli(): PlanRamassagePli {
  const dureeConvergence = 180;
  const dureeGlissement = 270;

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
