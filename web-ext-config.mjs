export default {
  // icon-128.png is only used for the AMO listing, not by the add-on itself.
  ignoreFiles: ["test", "test/**", "web-ext-config.mjs", "icons/icon-128.png"],
  build: {
    overwriteDest: true,
  },
};
