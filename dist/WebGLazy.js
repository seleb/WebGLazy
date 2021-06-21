var WebGLazy = (function () {
  'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  // returns the gl context
  // if one doesn't exist,
  // creates it then returns it
  function Gl(canvas) {
    if (!Gl.context) {
      Gl.context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!Gl.context) {
        throw 'No WebGL support';
      }
    }

    return Gl.context;
  }
  var Shader = /*#__PURE__*/function () {
    function Shader(vertSource, fragSource) {
      _classCallCheck(this, Shader);

      this.gl = new Gl();
      this.vertSource = vertSource;
      this.fragSource = fragSource;
      this.program = this.gl.createProgram();

      try {
        this.vertShader = this.compileShader(this.vertSource, this.gl.VERTEX_SHADER);
        this.fragShader = this.compileShader(this.fragSource, this.gl.FRAGMENT_SHADER);
      } catch (error) {
        this.gl.deleteProgram(this.program);
        delete this.program;
        console.error('Couldn\'t create shader: ', error);
        throw error;
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
     * @param  {string} source Shader source code in plain text format
     * @param  {enum} type     Shader type (e.g. gl.VERTEX_SHADER)
     * @return {object}          Compiled shader
     */


    _createClass(Shader, [{
      key: "compileShader",
      value: function compileShader(source, type) {
        try {
          var s = this.gl.createShader(type);
          this.gl.shaderSource(s, source);
          this.gl.compileShader(s);

          if (!this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS)) {
            throw this.gl.getShaderInfoLog(s);
          }

          return s;
        } catch (error) {
          console.error("Couldn't compile shader (".concat(type, "): "), source, error);
          throw error;
        }
      }
      /**
       * Tells GL to use this shader as the current program
       */

    }, {
      key: "useProgram",
      value: function useProgram() {
        this.gl.useProgram(this.program);
      }
    }]);

    return Shader;
  }();
  var Texture = /*#__PURE__*/function () {
    function Texture(source, id, pixelate) {
      _classCallCheck(this, Texture);

      this.gl = new Gl();
      this.source = source;
      this.texture = this.gl.createTexture();
      this.bind(id);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.source);
      this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, pixelate ? this.gl.NEAREST : this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, pixelate ? this.gl.NEAREST : this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
    /**
     * Updates the texture from its source
     */


    _createClass(Texture, [{
      key: "update",
      value: function update() {
        this.bind();
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.source);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
      }
      /**
       * Tells GL to use this texture
       * @param {int} id The texture bound is `gl.TEXTURE0 + id`; default: 0
       */

    }, {
      key: "bind",
      value: function bind(id) {
        var _id = id || this.lastBoundId || 0;

        this.gl.activeTexture(this.gl.TEXTURE0 + _id);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.lastBoundId = _id;
      }
    }]);

    return Texture;
  }();

  var defaultVertex = "// default vertex shader\nattribute vec4 position;\nvoid main() {\n\tgl_Position = position;\n}";
  var defaultFragment = "// default fragment shader\nprecision mediump float;\nuniform sampler2D tex0;\nuniform sampler2D tex1;\nuniform vec2 resolution;\n\nvoid main() {\n\tvec2 coord = gl_FragCoord.xy;\n\tvec2 uv = coord.xy / resolution.xy;\n\tgl_FragColor = texture2D(tex0, uv);\n}";
  /**
   * wee!!
   * @param {Object} options
   * @param {HTMLElement} options.source        Element to treat as a source for output; default: see `sources`
   * @param {Array} options.sources             If `source` isn't provided, finds the first tag from this list of possible tags; default: `['canvas', 'video', 'img']`
   * @param {boolean} options.hideSource        If `true`, extra CSS is used to hide everything except the output canvas; default: `true`
   * @param {string} options.background         Background CSS applied to HTML, BODY, and canvasContainer element; default: `'black'`
   * @param {Number} options.scaleMultiplier    Multiplier applied to size of source canvas; default: `1`
   * @param {string} options.scaleMode          Defines the scaling behaviour of the output canvas; see SCALE_MODES for possible settings; default: `WebGLazy.SCALE_MODES.FIT`
   * @param {boolean} options.allowDownscaling  Allow scaling the output canvas smaller than the original size * `scaleMultiplier` (only applies when scaleMode is `FIT` or `COVER`); default: `false`
   * @param {boolean} options.autoInit          Call `this.init` in constructor; default: `true`
   * @param {Number} options.timestep           Target duration between frames (in milliseconds); default: `1 / 60 * 1000`, i.e. 60fps
   * @param {boolean} options.pixelate          If `true`, uses `GL_NEAREST` and `image-rendering: pixelated`; default: `true`
   * @param {string} options.vertex            Vertex shader source; default: a functional pass-through
   * @param {string} options.fragment          Fragment shader source; default: a functional pass-through
   */

  var WebGLazy = /*#__PURE__*/function () {
    function WebGLazy(_ref) {
      var _this = this;

      var source = _ref.source,
          _ref$sources = _ref.sources,
          sources = _ref$sources === void 0 ? ['canvas', 'video', 'img'] : _ref$sources,
          _ref$hideSource = _ref.hideSource,
          hideSource = _ref$hideSource === void 0 ? true : _ref$hideSource,
          _ref$background = _ref.background,
          background = _ref$background === void 0 ? 'black' : _ref$background,
          _ref$scaleMultiplier = _ref.scaleMultiplier,
          scaleMultiplier = _ref$scaleMultiplier === void 0 ? 1 : _ref$scaleMultiplier,
          _ref$scaleMode = _ref.scaleMode,
          scaleMode = _ref$scaleMode === void 0 ? WebGLazy.SCALE_MODES.FIT : _ref$scaleMode,
          _ref$allowDownscaling = _ref.allowDownscaling,
          allowDownscaling = _ref$allowDownscaling === void 0 ? false : _ref$allowDownscaling,
          _ref$timestep = _ref.timestep,
          timestep = _ref$timestep === void 0 ? 1 / 60 * 1000 : _ref$timestep,
          _ref$disableFeedbackT = _ref.disableFeedbackTexture,
          disableFeedbackTexture = _ref$disableFeedbackT === void 0 ? false : _ref$disableFeedbackT,
          _ref$disableMouseEven = _ref.disableMouseEvents,
          disableMouseEvents = _ref$disableMouseEven === void 0 ? false : _ref$disableMouseEven,
          _ref$pixelate = _ref.pixelate,
          pixelate = _ref$pixelate === void 0 ? true : _ref$pixelate,
          _ref$autoInit = _ref.autoInit,
          autoInit = _ref$autoInit === void 0 ? true : _ref$autoInit,
          _ref$vertex = _ref.vertex,
          vertex = _ref$vertex === void 0 ? defaultVertex : _ref$vertex,
          _ref$fragment = _ref.fragment,
          fragment = _ref$fragment === void 0 ? defaultFragment : _ref$fragment;

      _classCallCheck(this, WebGLazy);

      this.main = function (timestamp) {
        // update time
        _this.lastTime = _this.curTime;
        _this.curTime = (timestamp || _this.now()) - _this.startTime;
        _this.deltaTime = _this.curTime - _this.lastTime;
        _this.accumulator += _this.deltaTime; // call render if needed

        if (_this.accumulator > _this.timestep) {
          _this.render();

          _this.accumulator -= _this.timestep;
        } // request another frame to maintain the loop


        _this.requestAnimationFrame(_this.main);
      };

      this.sources = sources;
      this.source = source || this.getSource();
      this.hideSource = hideSource;
      this.background = background;
      this.scaleMultiplier = scaleMultiplier;
      this._scale = scaleMultiplier;
      this.scaleMode = scaleMode;
      this.allowDownscaling = allowDownscaling;
      this.timestep = timestep;
      this.disableFeedbackTexture = !!disableFeedbackTexture;
      this.disableMouseEvents = !!disableMouseEvents;
      this.pixelate = pixelate;
      this.vertex = vertex;
      this.fragment = fragment;

      if (autoInit) {
        this.init();
      }
    }
    /**
     * Finds a source on the page by searching for elements with supported tag names
     * Throws an exception if one could not be found
     * @return {HTMLElement} First found source
     */


    _createClass(WebGLazy, [{
      key: "getSource",
      value: function getSource() {
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

    }, {
      key: "insertStylesheet",
      value: function insertStylesheet() {
        this.style = document.createElement('style');
        document.head.appendChild(this.style);
        this.style.innerHTML = "\nhtml,body,div#canvasContainer{\n\tpadding:0;\n\tmargin:0;\n\n\twidth:100%;\n\theight:100%;\n\n\ttop:0;\n\tleft:0;\n\tright:0;\n\tbottom:0;\n\n\tbackground: ".concat(this.background, ";\n\tcolor:#FFFFFF;\n\n\toverflow:hidden;\n\n\t").concat(this.hideSource ? 'visibility: hidden!important;' : '', "\n}\n\ncanvas#outputCanvas{\n").concat(this.pixelate ? "\n\timage-rendering: optimizeSpeed;\n\timage-rendering: -webkit-crisp-edges;\n\timage-rendering: -moz-crisp-edges;\n\timage-rendering: -o-crisp-edges; \n\timage-rendering: crisp-edges;\n\timage-rendering: -webkit-optimize-contrast;\n\timage-rendering: optimize-contrast;\n\timage-rendering: pixelated;\n\t-ms-interpolation-mode: nearest-neighbor;\n" : '', "\n\n\tposition:absolute;\n\tmargin:auto;\n\ttop:0;\n\tleft:-1000%;\n\tright:-1000%;\n\tbottom:0;\n\n\t\t\t").concat(this.hideSource ? ' visibility: visible!important;' : '', "\n\t\t\t").concat(this.scaleMode === this.constructor.SCALE_MODES.MULTIPLES ? "\n\ttransition:\n\t\twidth  0.2s cubic-bezier(0.22, 1.84, 0.88, 0.77),\n\t\theight 0.2s cubic-bezier(0.22, 1.84, 0.88, 0.77);" : '', "\n};");
      }
      /**
       * Initializes the API
       * This needs to be called once, after which the main loop will maintain itself
       */

    }, {
      key: "init",
      value: function init() {
        // determine size/ratio from source
        this.size = {
          x: this.source.width || this.source.style.width,
          y: this.source.height || this.source.style.height
        };
        this.size.x *= this.scaleMultiplier || 1;
        this.size.y *= this.scaleMultiplier || 1;
        this.ratio = this.size.x / this.size.y; // insert stylesheet

        this.insertStylesheet(); // create canvasContainer

        this.canvasContainer = document.createElement('div');
        this.canvasContainer.id = 'canvasContainer';

        if (!this.allowDownscaling) {
          this.canvasContainer.style.minWidth = this.size.x + 'px';
          this.canvasContainer.style.minHeight = this.size.y + 'px';
        } // create canvas


        this.canvas = document.createElement('canvas');
        this.canvas.id = 'outputCanvas';
        this.canvas.width = this.size.x;
        this.canvas.height = this.size.y;
        this.canvas.style.width = this.canvas.style.height = 0;
        this.canvasContainer.appendChild(this.canvas);
        document.body.appendChild(this.canvasContainer); // create rendering context

        try {
          this.gl = new Gl(this.canvas);
          this.render = this.renderGL;
        } catch (__error) {
          console.warn('Falling back to canvas rendering: ', __error);
          this.render = this.renderCanvas;
          this.canvas2d = this.canvas.getContext('2d');
        }

        if (this.gl) {
          // create plane
          this.vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0]);
          this.vertexBuffer = this.gl.createBuffer();
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.STATIC_DRAW); // create textures

          this.textureSource = new Texture(this.source, 0, this.pixelate);

          if (!this.disableFeedbackTexture) {
            this.textureFeedback = new Texture(this.canvas, 1, this.pixelate);
          } // create shader


          this.setShader(this.vertex, this.fragment); // misc. GL setup

          this.gl.viewport(0, 0, this.size.x, this.size.y);
          this.gl.clearColor(0, 0, 0, 1.0);
        } // bind the resize
        // and trigger it immediately


        window.onresize = this.onResize.bind(this);
        window.onresize(); // bind mouse events

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
        } // main loop setup


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

        if ("requestPostAnimationFrame" in window) {
          this.requestAnimationFrame = function (__cb) {
            window.requestPostAnimationFrame(__cb);
          };
        } else if ("requestAnimationFrame" in window) {
          this.requestAnimationFrame = function (__cb) {
            window.requestAnimationFrame(__cb);
          };
        } else {
          this.requestAnimationFrame = function (__cb) {
            setTimeout(__cb, -1);
          };
        }

        this.startTime = this.now();
        this.curTime = this.lastTime = 0; // convert the main to support `this` when used as a callback
        // and start the main loop

        this.main(this.curTime);
      }
      /**
       * 
       * @param {string} [vertex] Vertex shader source; default: a functional pass-through
       * @param {string} [fragment] Fragment shader source; default: a functional pass-through
       */

    }, {
      key: "setShader",
      value: function setShader() {
        var vertex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : defaultVertex;
        var fragment = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultFragment;

        // create shader
        if (this.program) {
          this.gl.deleteProgram(this.program);
        }

        this.shader = new Shader(vertex, fragment);
        this.shader.useProgram();
        this.glLocations = {
          position: this.gl.getAttribLocation(this.shader.program, 'position'),
          tex0: this.gl.getUniformLocation(this.shader.program, 'tex0'),
          tex1: this.gl.getUniformLocation(this.shader.program, 'tex1'),
          time: this.gl.getUniformLocation(this.shader.program, 'time'),
          resolution: this.gl.getUniformLocation(this.shader.program, 'resolution')
        };
        this.gl.uniform1i(this.glLocations.tex0, 0);
        this.gl.uniform1i(this.glLocations.tex1, 1);
        this.gl.uniform2f(this.glLocations.resolution, this.size.x, this.size.y);
        this.gl.enableVertexAttribArray(this.glLocations.position);
        this.gl.vertexAttribPointer(this.glLocations.position, 2, this.gl.FLOAT, false, 0, 0);
      }
      /**
       * Updated the source texture + shader uniforms, clears the output, and renders a frame
       */

    }, {
      key: "renderCanvas",
      value: function renderCanvas() {
        this.canvas2d.clearRect(0, 0, this.size.x, this.size.y);
        this.canvas2d.drawImage(this.source, 0, 0);
      }
      /**
       * Updated the source texture + shader uniforms, clears the output, and renders a frame
       */

    }, {
      key: "renderGL",
      value: function renderGL() {
        // update
        this.textureSource.update();
        this.gl.uniform1f(this.glLocations.time, this.curTime); // clear

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT); // render

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

    }, {
      key: "onResize",
      value: function onResize() {
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

        this._scale = this.scaleMultiplier * scaleMultiplier;
        this.canvas.style.width = aw + 'px';
        this.canvas.style.height = ah + 'px';
      }
      /**
       * Dispatches a cloned MouseEvent to the source with
       * coordinates transformed from output-space to source-space
       * @param  {MouseEvent} __event The original event triggered on the output canvas
       */

    }, {
      key: "onMouseEvent",
      value: function onMouseEvent(event) {
        var elOutput = this.canvas;
        var elSource = this.source;
        var leftOutput = elOutput.offsetLeft + elOutput.scrollLeft;
        var topOutput = elOutput.offsetTop + elOutput.scrollTop;
        var leftSource = elSource.offsetLeft + elSource.scrollLeft;
        var topSource = elSource.offsetTop + elSource.scrollTop;
        var scaleMultiplier = 1 / this._scale;
        var clone = new MouseEvent(event.type, {
          screenX: (event.screenX - leftOutput) * scaleMultiplier + leftSource,
          screenY: (event.screenY - topOutput) * scaleMultiplier + topSource,
          clientX: (event.clientX - leftOutput) * scaleMultiplier + leftSource,
          clientY: (event.clientY - topOutput) * scaleMultiplier + topSource,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          button: event.button,
          buttons: event.buttons,
          relatedTarget: event.relatedTarget,
          region: event.region
        });
        elSource.dispatchEvent(clone);
      }
      /**
       * Dispatches a cloned TouchEvent to the source with
       * coordinates transformed from output-space to source-space
       * @param  {TouchEvent} event The original event triggered on the output canvas
       */

    }, {
      key: "onTouchEvent",
      value: function onTouchEvent(event) {
        var elOutput = this.canvas;
        var elSource = this.source;
        var leftOutput = elOutput.offsetLeft + elOutput.scrollLeft;
        var topOutput = elOutput.offsetTop + elOutput.scrollTop;
        var leftSource = elSource.offsetLeft + elSource.scrollLeft;
        var topSource = elSource.offsetTop + elSource.scrollTop;
        var scaleMultiplier = 1 / this._scale;

        var transformTouch = function transformTouch(touch) {
          return new Touch({
            identifier: touch.identifier,
            force: touch.force,
            rotationAngle: touch.rotationAngle,
            target: touch.target,
            radiusX: touch.radiusX,
            radiusY: touch.radiusY,
            pageX: (touch.pageX - leftOutput) * scaleMultiplier + leftSource,
            pageY: (touch.pageY - leftOutput) * scaleMultiplier + leftSource,
            screenX: (touch.screenX - leftOutput) * scaleMultiplier + leftSource,
            screenY: (touch.screenY - topOutput) * scaleMultiplier + topSource,
            clientX: (touch.clientX - leftOutput) * scaleMultiplier + leftSource,
            clientY: (touch.clientY - topOutput) * scaleMultiplier + topSource
          });
        };

        var touches = Array.from(event.touches).map(transformTouch);
        var targetTouches = Array.from(event.targetTouches).map(transformTouch);
        var changedTouches = Array.from(event.changedTouches).map(transformTouch);
        var clone = new event.constructor(event.type, {
          touches: touches,
          targetTouches: targetTouches,
          changedTouches: changedTouches,
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
       * @param  {DOMHighResTimeStamp} timestamp the time in milliseconds; default: performance.now()
       */

    }]);

    return WebGLazy;
  }();
  WebGLazy.SCALE_MODES = Object.freeze({
    'FIT': 'FIT',
    // scale to fit screen
    'COVER': 'COVER',
    // scale to cover screen
    'MULTIPLES': 'MULTIPLES',
    // scale up in multiples of original size
    'NONE': 'NONE' // don't scale

  });

  return WebGLazy;

}());
