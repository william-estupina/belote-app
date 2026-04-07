import path from "path";
import sharp from "sharp";

const CHEMIN_SPRITE_SHEET = path.resolve(__dirname, "../assets/sprites/sprite-sheet.png");
const LARGEUR_CELLULE = 167;
const HAUTEUR_CELLULE = 243;

async function lirePixel(
  x: number,
  y: number,
): Promise<[number, number, number, number]> {
  const { data } = await sharp(CHEMIN_SPRITE_SHEET)
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return [data[0], data[1], data[2], data[3]];
}

describe("spriteSheet atlas", () => {
  it("donne un fond de carte opaque aux rectos visibles", async () => {
    const [rouge, vert, bleu, alpha] = await lirePixel(20, 120);

    expect(alpha).toBeGreaterThan(240);
    expect(rouge).toBeGreaterThan(200);
    expect(vert).toBeGreaterThan(200);
    expect(bleu).toBeGreaterThan(180);
  });

  it("utilise un dos rouge et dore au lieu d'un aplat bleu", async () => {
    const [rouge, vert, bleu, alpha] = await lirePixel(
      Math.floor(LARGEUR_CELLULE / 2),
      4 * HAUTEUR_CELLULE + Math.floor(HAUTEUR_CELLULE / 2),
    );

    expect(alpha).toBeGreaterThan(240);
    expect(rouge).toBeGreaterThan(bleu);
    expect(rouge).toBeGreaterThan(vert);
  });

  it("reprend le rouge vif des losanges du dos React", async () => {
    const [rouge, vert, bleu, alpha] = await lirePixel(
      Math.round(LARGEUR_CELLULE * 0.21),
      4 * HAUTEUR_CELLULE + Math.round(HAUTEUR_CELLULE * 0.16),
    );

    expect(alpha).toBeGreaterThan(240);
    expect(rouge).toBeGreaterThan(180);
    expect(vert).toBeGreaterThan(40);
    expect(vert).toBeLessThan(80);
    expect(bleu).toBeGreaterThan(40);
    expect(bleu).toBeLessThan(80);
  });
});
