const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
	entry: "./WebGLazy.js",
	output: {
		filename: 'WebGLazy.min.js',
		path: path.resolve(__dirname, ''),
		library: "",
		libraryTarget: "window"
	},
	optimization: {
		minimize: true,
		minimizer: [
			// we specify a custom UglifyJsPlugin here to get source maps in production
			new UglifyJsPlugin({
				uglifyOptions: {
					ecma: 5,
					mangle: {
						reserved: ["WebGLazy"]
					}
				}
			})
		]
	}
}