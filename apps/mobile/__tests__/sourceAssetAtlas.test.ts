import { resoudreSourceAssetAtlas } from "../hooks/sourceAssetAtlas";

describe("sourceAssetAtlas", () => {
  it("retourne l'uri d'un asset web sans passer par Image.resolveAssetSource", () => {
    expect(
      resoudreSourceAssetAtlas({
        os: "web",
        source: { uri: "/assets/sprites/sprite-sheet.png", width: 1336, height: 1215 },
      }),
    ).toBe("/assets/sprites/sprite-sheet.png");
  });

  it("retourne le default d'un module ES sur web", () => {
    expect(
      resoudreSourceAssetAtlas({
        os: "web",
        source: { __esModule: true, default: "/assets/sprites/sprite-sheet.png" },
      }),
    ).toBe("/assets/sprites/sprite-sheet.png");
  });

  it("laisse intact l'identifiant natif d'un asset React Native", () => {
    expect(
      resoudreSourceAssetAtlas({
        os: "ios",
        source: 42,
      }),
    ).toBe(42);
  });
});
