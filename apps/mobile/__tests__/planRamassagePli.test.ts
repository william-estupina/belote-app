import { planifierRamassagePli } from "../hooks/planRamassagePli";

describe("planRamassagePli", () => {
  it("fait demarrer le glissement vers la pile sans trou apres la convergence", () => {
    const plan = planifierRamassagePli();

    expect(plan.delaiPhase2).toBe(plan.dureeConvergence);
  });
});
