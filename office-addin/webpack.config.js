const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const devCerts = require('office-addin-dev-certs');

module.exports = async (env, argv) => {
  const isDev = argv.mode === 'development';
  let httpsOptions = {};
  if (isDev) {
    try {
      httpsOptions = await devCerts.getHttpsServerOptions();
    } catch {
      console.warn('Could not get dev certs, using default https');
      httpsOptions = true;
    }
  }

  return {
    entry: {
      taskpane: './src/taskpane/taskpane.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].bundle.js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/taskpane/taskpane.html',
        filename: 'taskpane.html',
        chunks: ['taskpane'],
      }),
    ],
    devServer: {
      port: 3000,
      https: httpsOptions,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      allowedHosts: 'all',
      static: {
        directory: path.join(__dirname, 'assets'),
        publicPath: '/assets',
      },
    },
    devtool: isDev ? 'source-map' : false,
  };
};
