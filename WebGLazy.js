/**
 * @file      Exposes the `WebGLazy` API
 * @author    Sean S. LeBlanc
 * @version   1.1.1
 * @license   MIT
 */
var WebGLazy = ((
    function () {
        'use strict';
        // returns the gl context
        // if one doesn't exist,
        // creates it then returns it
        function Gl(__canvas) {
            if (!Gl.context) {
                Gl.context = __canvas.getContext('webgl') || __canvas.getContext('experimental-webgl');
                if (!Gl.context) {
                    throw 'No WebGL support';
                }
            }
            return Gl.context;
        }

        Gl.Shader = function (__vertSource, __fragSource) {
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
        };

        /**
         * Compiles shader source code into bytecode
         *
         * @param  {string} __source Shader source code in plain text format
         * @param  {enum} __type     Shader type (e.g. gl.VERTEX_SHADER)
         * @return {object}          Compiled shader
         */
        Gl.Shader.prototype.compileShader = function (__source, __type) {
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
        };

        /**
         * Tells GL to use this shader as the current program
         */
        Gl.Shader.prototype.useProgram = function () {
            this.gl.useProgram(this.program);
        };

        Gl.Texture = function (__source, __id) {
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
        };

        /**
         * Updates the texture from its source
         */
        Gl.Texture.prototype.update = function () {
            this.bind();
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.source);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        };

        /**
         * Tells GL to use this texture
         * @param {int} __id The texture bound is `gl.TEXTURE0 + __id`; default: 0
         */
        Gl.Texture.prototype.bind = function (__id) {
            var _id = __id || this.lastBoundId || 0;
            this.gl.activeTexture(this.gl.TEXTURE0 + _id);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.lastBoundId = _id;
        };


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
         * @param {Object} __options.timstep           Target duration between frames (in milliseconds); default: `1 / 60 * 1000`, i.e. 60fps
         */
        function API(__options) {
            this.options = __options || {};
            this.sources = this.options.sources || ['canvas', 'video', 'img'];
            this.source = this.options.source || this.getSource();
            this.hideSource = this.options.hideSource === undefined || this.options.hideSource;
            this.background = this.options.background || 'black';
            this.scaleMultiplier = this.options.scaleMultiplier || 1;
            this.scaleMode = this.options.scaleMode !== undefined ? this.options.scaleMode : this.constructor.SCALE_MODES.FIT;
            this.allowDownscaling = this.options.allowDownscaling || false;
            this.timestep = this.options.timestep || (1 / 60 * 1000);
            this.disableFeedbackTexture = !!this.options.disableFeedbackTexture;

            if (this.options.autoInit === undefined || this.options.autoInit) {
                this.init();
            }
        }

        API.SCALE_MODES = Object.freeze({
            'FIT': 'FIT',             // scale to fit screen
            'COVER': 'COVER',         // scale to cover screen
            'MULTIPLES': 'MULTIPLES', // scale up in multiples of original size
            'NONE': 'NONE'            // don't scale
        });

        /**
         * Finds a source on the page by searching for elements with supported tag names
         * Throws an exception if one could not be found
         * @return {HTMLElement} First found source
         */
        API.prototype.getSource = function () {
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
        };

        /**
         * Inserts the stylesheet into the document head
         */
        API.prototype.insertStylesheet = function () {
            this.style = document.createElement('style');
            document.head.appendChild(this.style);
            this.style.innerHTML = [
                'html,body,div#canvasContainer{',
                '   padding:0;',
                '   margin:0;',
                '   ',
                '   width:100%;',
                '   height:100%;',
                '',
                '   top:0;',
                '   left:0;',
                '   right:0;',
                '   bottom:0;',
                '',
                '   background: ' + this.background + ';',
                '   color:#FFFFFF;',
                '',
                '   overflow:hidden;',
                '',
                '   /*cursor:none;*/',
                this.hideSource ? ' visibility: hidden!important;' : '',
                '}',
                '',
                'canvas#outputCanvas{',
                '   image-rendering: optimizeSpeed;',
                '    image-rendering: -moz-crisp-edges;',
                '   image-rendering: -o-crisp-edges; ',
                '    image-rendering: -webkit-optimize-contrast;',
                '    image-rendering: optimize-contrast;',
                '   image-rendering: crisp-edges;',
                '    image-rendering: pixelated;',
                '    -ms-interpolation-mode: nearest-neighbor;',
                '',
                '   position:absolute;',
                '   margin:auto;',
                '   top:0;',
                '   left:-1000%;',
                '   right:-1000%;',
                '   bottom:0;',
                '',
                this.hideSource ? ' visibility: visible!important;' : '',
                this.scaleMode === this.constructor.SCALE_MODES.MULTIPLES ? [
                    '  transition:',
                    '       width  0.2s cubic-bezier(0.22, 1.84, 0.88, 0.77),',
                    '       height 0.2s cubic-bezier(0.22, 1.84, 0.88, 0.77);'
                ].join('\n') : '',
                '};'
            ].join('\n');
        };

        /**
         * Initializes the API
         * This needs to be called once, after which the main loop will maintain itself
         */
        API.prototype.init = function () {
            // determine size/ratio from source
            this.size = {
                x: this.source.width || this.source.style.width,
                y: this.source.height || this.source.style.height
            };
            this.size.x *= this.scaleMultiplier || 1;
            this.size.y *= this.scaleMultiplier || 1;
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

            this.scaleMultiplier = 1;
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
                vertSource = vertSource || [
                    '// default vertex shader',
                    'attribute vec4 position;',
                    'void main() {',
                    '   gl_Position = position;',
                    '}'
                ].join('\n');
                fragSource = fragSource || [
                    '// default fragment shader',
                    'precision mediump float;',
                    'uniform sampler2D tex0;',
                    'uniform sampler2D tex1;',
                    'uniform vec2 resolution;',
                    '',
                    'void main() {',
                    '   vec2 coord = gl_FragCoord.xy;',
                    '   vec2 uv = coord.xy / resolution.xy;',
                    '   gl_FragColor = vec4(texture2D(tex1, uv).rgb, 1.0);',
                    '}'
                ].join('\n');
                this.shader = new Gl.Shader(vertSource, fragSource);

                // create plane
                this.vertices = new Float32Array([
                    -1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
                    1.0, -1.0, 1.0, 1.0, -1.0, 1.0
                ]);
                this.vertexBuffer = this.gl.createBuffer();
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.STATIC_DRAW);

                // create textures
                this.textureSource = new Gl.Texture(this.source, 0);
                if (!this.disableFeedbackTexture) {
                    this.textureFeedback = new Gl.Texture(this.canvas, 1);
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

            // main loop setup
            this.accumulator = 0;
            this.startTime = performance.now();
            this.curTime = this.lastTime = 0;

            // convert the main to support `this` when used as a callback
            // and start the main loop
            this.main = this.main.bind(this);
            this.main(this.curTime);
        };

        /**
         * main loop; callback for requestAnimationFrame
         * Maintains time information, calls render as needed, and maintains the main loop
         * @param  {DOMHighResTimeStamp} __timestamp the time in milliseconds; default: performance.now()
         */
        API.prototype.main = function (__timestamp) {
            // update time
            this.lastTime = this.curTime;
            this.curTime = (__timestamp || performance.now()) - this.startTime;
            this.deltaTime = this.curTime - this.lastTime;
            this.accumulator += this.deltaTime;

            // call render if needed
            if (this.accumulator > this.timestep) {
                this.render();
                this.accumulator -= this.timestep;
            }

            // request another frame to maintain the loop
            requestAnimationFrame(this.main);
        };

        /**
         * Updated the source texture + shader uniforms, clears the output, and renders a frame
         */
        API.prototype.renderCanvas = function () {
            this.canvas2d.clearRect(0, 0, this.size.x, this.size.y);
            this.canvas2d.drawImage(this.source, 0, 0);
        };

        /**
         * Updated the source texture + shader uniforms, clears the output, and renders a frame
         */
        API.prototype.renderGL = function () {
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
        };

        /**
         * Resizes the output canvas based on the window size and scaleMode
         */
        API.prototype.onResize = function () {
            var aw;
            var ah;
            var w = this.canvasContainer.offsetWidth;
            var h = this.canvasContainer.offsetHeight;
            var ratio = w / h;

            if (ratio < this.ratio) {
                h = Math.round(w / this.ratio);
            } else {
                w = Math.round(h * this.ratio);
            }

            switch (this.scaleMode) {
            case this.constructor.SCALE_MODES.MULTIPLES:
                // scale to the largest multiple that fits within bounds of screen
                this.scaleMultiplier = 1;
                aw = this.size.x;
                ah = this.size.y;

                while (aw + this.size.x <= w || ah + this.size.y <= h) {
                    aw += this.size.x;
                    ah += this.size.y;
                    this.scaleMultiplier += 1;
                }
                break;
            case this.constructor.SCALE_MODES.FIT:
                // scale canvas to fit within bounds of screen
                aw = w;
                ah = h;
                this.scaleMultiplier = w / this.size.x;
                break;
            case this.constructor.SCALE_MODES.COVER:
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
                this.scaleMultiplier = w / this.size.x;
                break;
            case this.constructor.SCALE_MODES.NONE:
                // don't scale canvas; leave it as a 1:1 representation
                this.scaleMultiplier = 1;
                aw = this.size.x;
                ah = this.size.y;
                break;
            }

            this.canvas.style.width = aw + 'px';
            this.canvas.style.height = ah + 'px';
        };

        // return the public API
        return API;
    }
)());