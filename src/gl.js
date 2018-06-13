// returns the gl context
// if one doesn't exist,
// creates it then returns it
export default function Gl(__canvas) {
	if (!Gl.context) {
		Gl.context = __canvas.getContext('webgl') || __canvas.getContext('experimental-webgl');
		if (!Gl.context) {
			throw 'No WebGL support';
		}
	}
	return Gl.context;
}

export class Shader {
	constructor(__vertSource, __fragSource) {
		this.gl = new Gl();
		this.vertSource = __vertSource;
		this.fragSource = __fragSource;
		this.program = this.gl.createProgram();

		try {
			this.vertShader = this.compileShader(this.vertSource, this.gl.VERTEX_SHADER);
			this.fragShader = this.compileShader(this.fragSource, this.gl.FRAGMENT_SHADER);
		} catch (__exception) {
			this.gl.deleteProgram(this.program);
			delete this.program;
			console.error('Couldn\'t create shader: ', __exception);
			throw __exception;
		}

		this.gl.attachShader(this.program, this.vertShader);
		this.gl.deleteShader(this.vertShader);
		delete this.vertShader;
		this.gl.attachShader(this.program, this.fragShader);
		this.gl.deleteShader(this.fragShader);
		delete this.fragShader;
		this.gl.linkProgram(this.program);
	}

	/**
	 * Compiles shader source code into bytecode
	 *
	 * @param  {string} __source Shader source code in plain text format
	 * @param  {enum} __type     Shader type (e.g. gl.VERTEX_SHADER)
	 * @return {object}          Compiled shader
	 */
	compileShader(__source, __type) {
		try {
			var s = this.gl.createShader(__type);
			this.gl.shaderSource(s, __source);
			this.gl.compileShader(s);

			if (!this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS)) {
				throw this.gl.getShaderInfoLog(s);
			}

			return s;
		} catch (__exception) {
			console.error('Couldn\'t compile shader (' + __type + '): ', __source, __exception);
			throw __exception;
		}
	}

	/**
	 * Tells GL to use this shader as the current program
	 */
	useProgram() {
		this.gl.useProgram(this.program);
	}
}

export class Texture {
	constructor(__source, __id) {
		this.gl = new Gl();
		this.source = __source;
		this.texture = this.gl.createTexture();
		this.bind(__id);

		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.source);
		this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);

		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	}

	/**
	 * Updates the texture from its source
	 */
	update() {
		this.bind();
		this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.source);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	}

	/**
	 * Tells GL to use this texture
	 * @param {int} __id The texture bound is `gl.TEXTURE0 + __id`; default: 0
	 */
	bind(__id) {
		var _id = __id || this.lastBoundId || 0;
		this.gl.activeTexture(this.gl.TEXTURE0 + _id);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.lastBoundId = _id;
	}
}
