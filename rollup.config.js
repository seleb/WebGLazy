import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import {
	uglify
} from 'rollup-plugin-uglify';

import pkg from './package.json';

export default {
	input: './src/main',
	output: [{
		file: pkg.main,
		format: 'cjs',
	}, {
		file: './dist/WebGLazy.min.js',
		name: 'WebGLazy',
		format: 'iife',
	}],
	plugins: [
		babel({
			exclude: 'node_modules/**',
			plugins: ['external-helpers'],
		}),
		commonjs(),
		uglify(),
	],
}
