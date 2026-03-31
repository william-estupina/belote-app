import { Platform } from "react-native";

import { resoudreSourceAssetAtlas } from "./sourceAssetAtlas";

const SPRITE_SHEET_RAW = require("../assets/sprites/sprite-sheet.png");

export const SPRITE_SHEET_SOURCE = resoudreSourceAssetAtlas({
  os: Platform.OS,
  source: SPRITE_SHEET_RAW,
});
