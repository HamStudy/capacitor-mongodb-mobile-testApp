module.exports = {
  chainWebpack: config => {
    config.devtool(process.env.NODE_ENV == "production" ? 'source-map' : 'hidden-source-map');
  }
};
