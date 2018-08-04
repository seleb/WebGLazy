import Gl, {
	Shader,
	Texture
} from './gl';
/**
 * wee!!
 * @param {Object} __options
 * @param {Object} __options.source            Element to treat as a source for output; default: see `sources`
 * @param {Object} __options.sources           If `source` isn't provided, finds the first tag from this list of possible tags; default: `['canvas', 'video', 'img']`
 * @param {Object} __options.hideSource        If `true`, extra CSS is used to hide everything except the output canvas; default: `true`
 * @param {Object} __options.background        Background CSS applied to HTML, BODY, and canvasContainer element; default: `'black'`
 * @param {Object} __options.scaleMultiplier   Multiplier applied to size of source canvas; default: `1`
 * @param {Object} __options.scaleMode         Defines the scaling behaviour of the output canvas; see SCALE_MODES for possible settings; default: `WebGLazy.SCALE_MODES.FIT`
 * @param {Object} __options.allowDownscaling  Allow scaling the output canvas smaller than the original size * `scaleMultiplier` (only applies when scaleMode is `FIT` or `COVER`); default: `false`
 * @param {Object} __options.autoInit          Call `this.init` in constructor; default: `true`
 * @param {Object} __options.timestep           Target duration between frames (in milliseconds); default: `1 / 60 * 1000`, i.e. 60fps
 */
export default class WebGLazy {
	constructor(__options) {
		this.options = __options || {};
		this.sources = this.options.sources || ['canvas', 'video', 'img'];
		this.source = this.options.source || this.getSource();
		this.hideSource = this.options.hideSource === undefined || this.options.hideSource;
		this.background = this.options.background || 'black';
		this.options.scaleMultiplier = this.options.scaleMultiplier || 1;
		this.scaleMultiplier = this.options.scaleMultiplier;
		this.scaleMode = this.options.scaleMode !== undefined ? this.options.scaleMode : this.constructor.SCALE_MODES.FIT;
		this.allowDownscaling = this.options.allowDownscaling || false;
		this.timestep = this.options.timestep || (1 / 60 * 1000);
		this.disableFeedbackTexture = !!this.options.disableFeedbackTexture;
		this.disableMouseEvents = !!this.options.disableMouseEvents;
		if (this.options.autoInit === undefined || this.options.autoInit) {
			this.init();
		}
	}
	/**
	 * Finds a source on the page by searching for elements with supported tag names
	 * Throws an exception if one could not be found
	 * @return {HTMLElement} First found source
	 */
	getSource() {
		var i;
		var sources = [];
		for (i = 0; i < this.sources.length; ++i) {
			sources.push(Array.prototype.slice.call(document.getElementsByTagName(this.sources[i])));
		}
		sources = Array.prototype.concat.apply([], sources);
		if (sources.length === 0) {
			throw 'Couldn\'t find an element from ' + this.sources + ' to use as a source';
		}
		return sources[0];
	}
	/**
	 * Inserts the stylesheet into the document head
	 */
	insertStylesheet() {
		this.style = document.createElement('style');
		document.head.appendChild(this.style);
		this.style.innerHTML = `
html,body,div#canvasContainer{
	padding:0;
	margin:0;

	width:100%;
	height:100%;

	top:0;
	left:0;
	right:0;
	bottom:0;

	background: ${this.background};
	color:#FFFFFF;

	overflow:hidden;

	${this.hideSource ? 'visibility: hidden!important;' : ''}
}

canvas#outputCanvas{
	image-rendering: optimizeSpeed;
	image-rendering: -webkit-crisp-edges;
	image-rendering: -moz-crisp-edges;
	image-rendering: -o-crisp-edges; 
	image-rendering: crisp-edges;
	image-rendering: -webkit-optimize-contrast;
	image-rendering: optimize-contrast;
	image-rendering: pixelated;
	-ms-interpolation-mode: nearest-neighbor;

	position:absolute;
	margin:auto;
	top:0;
	left:-1000%;
	right:-1000%;
	bottom:0;

			${this.hideSource ? ' visibility: visible!important;' : ''}
			${this.scaleMode === this.constructor.SCALE_MODES.MULTIPLES ? `
	transition:
		width  0.2s cubic-bezier(0.22, 1.84, 0.88, 0.77),
		height 0.2s cubic-bezier(0.22, 1.84, 0.88, 0.77);` : ''}
};`;
	}
	/**
	 * Initializes the API
	 * This needs to be called once, after which the main loop will maintain itself
	 */
	init() {
		// determine size/ratio from source
		this.size = {
			x: this.source.width || this.source.style.width,
			y: this.source.height || this.source.style.height
		};
		this.size.x *= this.options.scaleMultiplier || 1;
		this.size.y *= this.options.scaleMultiplier || 1;
		this.ratio = this.size.x / this.size.y;
		// insert stylesheet
		this.insertStylesheet();
		// create canvasContainer
		this.canvasContainer = document.createElement('div');
		this.canvasContainer.id = 'canvasContainer';
		if (!this.allowDownscaling) {
			this.canvasContainer.style.minWidth = this.size.x + 'px';
			this.canvasContainer.style.minHeight = this.size.y + 'px';
		}
		// create canvas
		this.canvas = document.createElement('canvas');
		this.canvas.id = 'outputCanvas';
		this.canvas.width = this.size.x;
		this.canvas.height = this.size.y;
		this.canvas.style.width = this.canvas.style.height = 0;
		this.canvasContainer.appendChild(this.canvas);
		document.body.appendChild(this.canvasContainer);
		// create rendering context
		try {
			this.gl = new Gl(this.canvas);
			this.render = this.renderGL;
		} catch (__error) {
			console.warn('Falling back to canvas rendering: ', __error);
			this.render = this.renderCanvas;
			this.canvas2d = this.canvas.getContext('2d');
		}
		if (this.gl) {
			// create shader
			var vertSource;
			var fragSource;
			var vertSourceElement = document.getElementById('shader-vert');
			var fragSourceElement = document.getElementById('shader-frag');
			if (vertSourceElement) {
				vertSource = vertSourceElement.innerHTML;
			}
			if (fragSourceElement) {
				fragSource = fragSourceElement.innerHTML;
			}
			vertSource = vertSource || `
// default vertex shader
attribute vec4 position;
void main() {
	gl_Position = position;
}`;
			fragSource = fragSource || `
// default fragment shader
precision mediump float;
uniform sampler2D tex0;
uniform sampler2D tex1;
uniform vec2 resolution;

void main() {
	vec2 coord = gl_FragCoord.xy;
	vec2 uv = coord.xy / resolution.xy;
	gl_FragColor = vec4(texture2D(tex0, uv).rgb, 1.0);
}`;
			this.shader = new Shader(vertSource, fragSource);
			// create plane
			this.vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
				1.0, -1.0, 1.0, 1.0, -1.0, 1.0
			]);
			this.vertexBuffer = this.gl.createBuffer();
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
			this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.STATIC_DRAW);
			// create textures
			this.textureSource = new Texture(this.source, 0);
			if (!this.disableFeedbackTexture) {
				this.textureFeedback = new Texture(this.canvas, 1);
			}
			// cache GL attribute/uniform locations
			this.glLocations = {
				position: this.gl.getAttribLocation(this.shader.program, 'position'),
				tex0: this.gl.getUniformLocation(this.shader.program, 'tex0'),
				tex1: this.gl.getUniformLocation(this.shader.program, 'tex1'),
				time: this.gl.getUniformLocation(this.shader.program, 'time'),
				resolution: this.gl.getUniformLocation(this.shader.program, 'resolution')
			};
			// misc. GL setup
			this.gl.enableVertexAttribArray(this.glLocations.position);
			this.gl.viewport(0, 0, this.size.x, this.size.y);
			this.shader.useProgram();
			this.gl.vertexAttribPointer(this.glLocations.position, 2, this.gl.FLOAT, false, 0, 0);
			this.gl.clearColor(0, 0, 0, 1.0);
			this.gl.uniform1i(this.glLocations.tex0, 0);
			this.gl.uniform1i(this.glLocations.tex1, 1);
			this.gl.uniform2f(this.glLocations.resolution, this.size.x, this.size.y);
		}
		// bind the resize
		// and trigger it immediately
		window.onresize = this.onResize.bind(this);
		window.onresize();
		// bind mouse events
		if (!this.disableMouseEvents) {
			this.canvas.onmousedown = this.onMouseEvent.bind(this);
			this.canvas.onmouseup = this.onMouseEvent.bind(this);
			this.canvas.onmousemove = this.onMouseEvent.bind(this);
			this.canvas.onmouseenter = this.onMouseEvent.bind(this);
			this.canvas.onmouseexit = this.onMouseEvent.bind(this);
			this.canvas.onmouseover = this.onMouseEvent.bind(this);
			this.canvas.onmouseout = this.onMouseEvent.bind(this);
			this.canvas.onmouseleave = this.onMouseEvent.bind(this);
			this.canvas.onclick = this.onMouseEvent.bind(this);
			this.canvas.ondblclick = this.onMouseEvent.bind(this);
			this.canvas.oncontextmenu = this.onMouseEvent.bind(this);
			this.canvas.ontouchstart = this.onTouchEvent.bind(this);
			this.canvas.ontouchend = this.onTouchEvent.bind(this);
			this.canvas.ontouchmove = this.onTouchEvent.bind(this);
			this.canvas.touchcancel = this.onTouchEvent.bind(this);
		}
		// main loop setup
		this.accumulator = 0;
		if ("performance" in window) {
			this.now = function () {
				return window.performance.now();
			};
		} else {
			this.now = function () {
				return window.Date.now();
			};
		}
		if ("requestAnimationFrame" in window) {
			this.requestAnimationFrame = function (__cb) {
				window.requestAnimationFrame(__cb);
			};
		} else {
			this.requestAnimationFrame = function (__cb) {
				setTimeout(__cb, -1);
			};
		}
		this.startTime = this.now();
		this.curTime = this.lastTime = 0;
		// convert the main to support `this` when used as a callback
		// and start the main loop
		this.main(this.curTime);
	}
	/**
	 * Updated the source texture + shader uniforms, clears the output, and renders a frame
	 */
	renderCanvas() {
		this.canvas2d.clearRect(0, 0, this.size.x, this.size.y);
		this.canvas2d.drawImage(this.source, 0, 0);
	}
	/**
	 * Updated the source texture + shader uniforms, clears the output, and renders a frame
	 */
	renderGL() {
		// update
		this.textureSource.update();
		this.gl.uniform1f(this.glLocations.time, this.curTime);
		// clear
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		// render
		this.shader.useProgram();
		this.textureSource.bind();
		if (!this.disableFeedbackTexture) {
			this.textureFeedback.bind();
		}
		this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertices.length / 2);
		if (!this.disableFeedbackTexture) {
			this.textureFeedback.update();
		}
	}
	/**
	 * Resizes the output canvas based on the window size and scaleMode
	 */
	onResize() {
		var aw;
		var ah;
		var w = this.canvasContainer.offsetWidth;
		var h = this.canvasContainer.offsetHeight;
		var ratio = w / h;
		var scaleModes = this.constructor.SCALE_MODES;
		var scaleMultiplier = 1;
		if (ratio < this.ratio) {
			h = Math.round(w / this.ratio);
		} else {
			w = Math.round(h * this.ratio);
		}
		switch (this.scaleMode) {
			case scaleModes.MULTIPLES:
				// scale to the largest multiple that fits within bounds of screen
				scaleMultiplier = 1;
				aw = this.size.x;
				ah = this.size.y;
				while (aw + this.size.x <= w || ah + this.size.y <= h) {
					aw += this.size.x;
					ah += this.size.y;
					scaleMultiplier += 1;
				}
				break;
			case scaleModes.FIT:
				// scale canvas to fit within bounds of screen
				aw = w;
				ah = h;
				scaleMultiplier = w / this.size.x;
				break;
			case scaleModes.COVER:
				// scale canvas to cover bounds of screen
				w = this.canvasContainer.offsetWidth;
				h = this.canvasContainer.offsetHeight;
				if (ratio < this.ratio) {
					w = Math.round(h * this.ratio);
				} else {
					h = Math.round(w / this.ratio);
				}
				aw = w;
				ah = h;
				scaleMultiplier = w / this.size.x;
				break;
			case scaleModes.NONE:
				// don't scale canvas; leave it as a 1:1 representation
				scaleMultiplier = 1;
				aw = this.size.x;
				ah = this.size.y;
				break;
		}
		this.scaleMultiplier = this.options.scaleMultiplier * scaleMultiplier;
		this.canvas.style.width = aw + 'px';
		this.canvas.style.height = ah + 'px';
	}
	/**
	 * Dispatches a cloned MouseEvent to the source with
	 * coordinates transformed from output-space to source-space
	 * @param  {MouseEvent} __event The original event triggered on the output canvas
	 */
	onMouseEvent(__event) {
		var elOutput = this.canvas;
		var elSource = this.source;
		var leftOutput = elOutput.offsetLeft + elOutput.scrollLeft;
		var topOutput = elOutput.offsetTop + elOutput.scrollTop;
		var leftSource = elSource.offsetLeft + elSource.scrollLeft;
		var topSource = elSource.offsetTop + elSource.scrollTop;
		var scaleMultiplier = 1 / this.scaleMultiplier;
		var clone = new MouseEvent(__event.type, {
			screenX: (__event.screenX - leftOutput) * scaleMultiplier + leftSource,
			screenY: (__event.screenY - topOutput) * scaleMultiplier + topSource,
			clientX: (__event.clientX - leftOutput) * scaleMultiplier + leftSource,
			clientY: (__event.clientY - topOutput) * scaleMultiplier + topSource,
			altKey: __event.altKey,
			shiftKey: __event.shiftKey,
			metaKey: __event.metaKey,
			button: __event.button,
			buttons: __event.buttons,
			relatedTarget: __event.relatedTarget,
			region: __event.region
		});
		elSource.dispatchEvent(clone);
	}
	/**
	 * Dispatches a cloned TouchEvent to the source with
	 * coordinates transformed from output-space to source-space
	 * @param  {TouchEvent} __event The original event triggered on the output canvas
	 */
	onTouchEvent(__event) {
		var elOutput = this.canvas;
		var elSource = this.source;
		var leftOutput = elOutput.offsetLeft + elOutput.scrollLeft;
		var topOutput = elOutput.offsetTop + elOutput.scrollTop;
		var leftSource = elSource.offsetLeft + elSource.scrollLeft;
		var topSource = elSource.offsetTop + elSource.scrollTop;
		var scaleMultiplier = 1 / this.scaleMultiplier;

		var transformTouch = touch => new Touch({
			identifier: touch.identifier,
			force: touch.force,
			rotationAngle: touch.rotationAngle,
			target: touch.target,
			radiusX: touch.radiusX,
			radiusY: touch.radiusY,
			pageX: ((touch.pageX - leftOutput) * scaleMultiplier) + leftSource,
			pageY: ((touch.pageY - leftOutput) * scaleMultiplier) + leftSource,
			screenX: ((touch.screenX - leftOutput) * scaleMultiplier) + leftSource,
			screenY: ((touch.screenY - topOutput) * scaleMultiplier) + topSource,
			clientX: ((touch.clientX - leftOutput) * scaleMultiplier) + leftSource,
			clientY: ((touch.clientY - topOutput) * scaleMultiplier) + topSource,
		});

		var touches = Array.from(event.touches).map(transformTouch);
		var targetTouches = Array.from(event.targetTouches).map(transformTouch);
		var changedTouches = Array.from(event.changedTouches).map(transformTouch);

		var clone = new event.constructor(event.type, {
			touches,
			targetTouches,
			changedTouches,
			ctrlKey: event.ctrlKey,
			shiftKey: event.shiftKey,
			altKey: event.altKey,
			metaKey: event.metaKey
		});
		elSource.dispatchEvent(clone);
	}

	/**
	 * main loop; callback for requestAnimationFrame
	 * Maintains time information, calls render as needed, and maintains the main loop
	 * @param  {DOMHighResTimeStamp} __timestamp the time in milliseconds; default: performance.now()
	 */
	main = __timestamp => {
		// update time
		this.lastTime = this.curTime;
		this.curTime = (__timestamp || this.now()) - this.startTime;
		this.deltaTime = this.curTime - this.lastTime;
		this.accumulator += this.deltaTime;

		// call render if needed
		if (this.accumulator > this.timestep) {
			this.render();
			this.accumulator -= this.timestep;
		}

		// request another frame to maintain the loop
		this.requestAnimationFrame(this.main);
	}

}

WebGLazy.SCALE_MODES = Object.freeze({
	'FIT': 'FIT', // scale to fit screen
	'COVER': 'COVER', // scale to cover screen
	'MULTIPLES': 'MULTIPLES', // scale up in multiples of original size
	'NONE': 'NONE' // don't scale
});
