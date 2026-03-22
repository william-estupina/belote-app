import { ANIMATIONS } from "../constants/layout";

describe("ANIMATIONS.distribution", () => {
  it("laisse seulement une courte pause avant le tri visuel", () => {
    expect(ANIMATIONS.distribution.pauseAvantTri).toBe(250);
  });
});
