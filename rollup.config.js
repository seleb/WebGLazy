import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import {
	terser
} from "rollup-plugin-terser";

import pkg from './package.json';

export default {
	input: './src/main',
	output: [{
		file: pkg.main,
		format: 'cjs',
	}, {
		file: pkg.module,
		format: 'es',
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
		terser(),
	],
}
