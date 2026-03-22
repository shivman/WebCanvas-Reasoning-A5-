const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    popup: './popup.js',
    content: './content.js',
    background: './background.js',
    settings: './settings.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  },
  target: 'web',
  node: {
    global: true,
    __filename: false,
    __dirname: false
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'popup.html', to: 'popup.html' },
        { from: 'settings.html', to: 'settings.html' },
        { from: '*.css', to: '[name][ext]' },
        { from: 'images', to: 'images', noErrorOnMissing: true },
        { from: 'ai-service.js', to: 'ai-service.js' },
        { from: 'test-api.js', to: 'test-api.js', noErrorOnMissing: true },
        { from: 'test-api.html', to: 'test-api.html', noErrorOnMissing: true }
      ]
    })
  ]
}; 