import modulesNatifsExpo from "expo/bundledNativeModules.json";

import paquetMobile from "../package.json";

describe("dependances natives Expo", () => {
  it("aligne la version JS de Worklets avec la version native embarquee", () => {
    expect(paquetMobile.dependencies["react-native-worklets"]).toBe(
      modulesNatifsExpo["react-native-worklets"],
    );
  });
});
