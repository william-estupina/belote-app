// @ts-check

/** @type {import("syncpack").RcFile} */
const config = {
  versionGroups: [
    {
      label: "Use workspace protocol for internal packages",
      dependencies: ["@belote/*"],
      dependencyTypes: ["dev", "prod"],
      pinVersion: "workspace:*",
    },
  ],
};

export default config;
