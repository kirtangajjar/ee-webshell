const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    index: './main.js',
  },
  output: {
    filename: 'static/bundle.js',
    path: path.resolve(__dirname)
  },
  devtool: 'source-map'
};