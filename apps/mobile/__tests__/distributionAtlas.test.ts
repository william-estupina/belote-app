import type { Couleur, Rang } from "@belote/shared-types";

import {
  SPRITE_COLONNES,
  SPRITE_LIGNES,
  calculerPointArc,
  calculerRectoSource,
  calculerVersoSource,
  interpolerBezierQuadratique,
} from "../hooks/distributionAtlas";

describe("distributionAtlas", () => {
  it("expose une grille atlas 8x5", () => {
    expect(SPRITE_COLONNES).toBe(8);
    expect(SPRITE_LIGNES).toBe(5);
  });

  it.each<[Couleur, Rang, number, number]>([
    ["trefle", "7", 0, 0],
    ["trefle", "as", 7, 0],
    ["carreau", "7", 0, 1],
    ["coeur", "10", 3, 2],
    ["pique", "roi", 6, 3],
  ])(
    "mappe %s %s vers la bonne cellule",
    (couleur, rang, colonneAttendue, ligneAttendue) => {
      const rect = calculerRectoSource(100, 200, couleur, rang);

      expect(rect).toEqual({
        x: colonneAttendue * 100,
        y: ligneAttendue * 200,
        width: 100,
        height: 200,
      });
    },
  );

  it("retourne le verso sur la derniere ligne, premiere colonne", () => {
    expect(calculerVersoSource(120, 180)).toEqual({
      x: 0,
      y: 4 * 180,
      width: 120,
      height: 180,
    });
  });

  it("calcule un point de controle perpendiculaire sur un vol horizontal", () => {
    const point = calculerPointArc(
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.5 },
      0.05,
    );

    expect(point.x).toBeCloseTo(0.7, 5);
    expect(point.y).toBeCloseTo(0.48, 5);
  });

  it("interpole une bezier quadratique a t=0.5", () => {
    const point = interpolerBezierQuadratique(
      { x: 0, y: 0 },
      { x: 0.5, y: 1 },
      { x: 1, y: 0 },
      0.5,
    );

    expect(point.x).toBeCloseTo(0.5, 5);
    expect(point.y).toBeCloseTo(0.5, 5);
  });
});
