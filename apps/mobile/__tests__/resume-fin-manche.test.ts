import { construireResumeFinManche } from "../hooks/resume-fin-manche";

describe("construireResumeFinManche", () => {
  it("retourne contrat-rempli quand l'equipe preneuse remplit le contrat", () => {
    const resume = construireResumeFinManche({
      indexPreneur: 0,
      scoreEquipe1: 182,
      scoreEquipe2: 74,
      scoreMancheEquipe1: 92,
      scoreMancheEquipe2: 64,
    });

    expect(resume.messageVerdict).toBe("Contrat rempli !");
    expect(resume.verdict).toBe("contrat-rempli");
    expect(resume.estContratRempli).toBe(true);
    expect(resume.estChute).toBe(false);
    expect(resume.estCapot).toBe(false);
    expect(resume.scoreAvantEquipe1).toBe(90);
    expect(resume.scoreAvantEquipe2).toBe(10);
  });

  it("retourne vous etes dedans quand l'equipe du joueur humain chute", () => {
    const resume = construireResumeFinManche({
      indexPreneur: 0,
      scoreEquipe1: 20,
      scoreEquipe2: 212,
      scoreMancheEquipe1: 20,
      scoreMancheEquipe2: 162,
    });

    expect(resume.messageVerdict).toBe("Vous êtes dedans");
    expect(resume.verdict).toBe("dedans-nous");
    expect(resume.estContratRempli).toBe(false);
    expect(resume.estChute).toBe(true);
    expect(resume.equipePreneur).toBe("equipe1");
  });

  it("retourne ils sont dedans quand l'adversaire chute", () => {
    const resume = construireResumeFinManche({
      indexPreneur: 1,
      scoreEquipe1: 172,
      scoreEquipe2: 0,
      scoreMancheEquipe1: 172,
      scoreMancheEquipe2: 0,
    });

    expect(resume.messageVerdict).toBe("Ils sont dedans");
    expect(resume.verdict).toBe("dedans-eux");
    expect(resume.estChute).toBe(true);
    expect(resume.equipePreneur).toBe("equipe2");
  });

  it("identifie l'equipe qui fait capot", () => {
    const resume = construireResumeFinManche({
      indexPreneur: 1,
      scoreEquipe1: 0,
      scoreEquipe2: 252,
      scoreMancheEquipe1: 0,
      scoreMancheEquipe2: 252,
    });

    expect(resume.estCapot).toBe(true);
    expect(resume.equipeCapot).toBe("equipe2");
    expect(resume.equipeGagnanteManche).toBe("equipe2");
  });
});
