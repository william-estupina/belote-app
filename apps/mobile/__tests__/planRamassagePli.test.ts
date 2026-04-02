import { planifierRamassagePli } from "../hooks/planRamassagePli";

describe("planRamassagePli", () => {
  it("ralentit suffisamment la convergence puis le depart vers la pile", () => {
    const plan = planifierRamassagePli();

    expect(plan.dureeConvergence).toBe(288);
    expect(plan.dureeGlissement).toBe(432);
    expect(plan.delaiPhase2).toBe(plan.dureeConvergence);
  });
});
