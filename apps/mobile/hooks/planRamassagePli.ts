export interface PlanRamassagePli {
  dureeConvergence: number;
  dureeGlissement: number;
  delaiPhase2: number;
}

export function planifierRamassagePli(): PlanRamassagePli {
  const dureeConvergence = 120;
  const dureeGlissement = 180;

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
