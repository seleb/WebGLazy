# WebGLazy
Responsive + configurable WebGL canvas replacement

![example](https://seans.site/stuff/WebGLazy/example.gif "example")

## How to Use
### Browser
1. Download [WebGLazy.min.js](WebGLazy.min.js) and add it to your project's files
1. Add `<script src='WebGLazy.min.js'></script>` to your page's `<head>`

### Node
1. `npm install WebGLazy --save`
1. `const WebGLazy = require("WebGLazy");`

### Use
Add `new WebGLazy();` somewhere in your code after your game's canvas has been initialized. If you're not sure where/when that happens, alternatively add a new tag that calls the same code after a short delay (e.g. `<script>setTimeout(function(){new WebGLazy();}, 1000);</script>`).

### Configuration
`WebGLazy` behaviour can be configured by passing an options object into the constructor; e.g.:
```js
new WebGLazy({
    background: 'white',
    scaleMode: WebGLazy.SCALE_MODES.COVER,
    source: document.getElementById('myGameCanvas')
});
```
* `source`
  : Element to treat as a source for output; default: see `sources`
* `sources`
  : If `source` isn't provided, finds the first tag from this list of possible tags; default: `['canvas', 'video', 'img']`
* `hideSource`
  : If `true`, extra CSS is used to hide everything except the output canvas; default: `true`
* `background`
  : Background CSS applied to HTML, BODY, and canvasContainer element; default: `'black'`
* `scaleMultiplier`
  : Multiplier applied to size of source canvas; default: `1`
* `scaleMode`
  : Defines the scaling behaviour of the output canvas; see [Scale Modes](#scale-modes) for possible settings; default: `WebGLazy.SCALE_MODES.FIT`
* `allowDownscaling`
  : Allow scaling the output canvas smaller than the original size * `scaleMultiplier` (only applies when scaleMode is `FIT` or `COVER`); default: `false`
* `autoInit`
  : Call `this.init` in constructor; default: `true`
* `timestep`
  : Target duration between frames (in milliseconds); default: `1 / 60 * 1000`, i.e. 60fps
* `disableFeedbackTexture`
  : Disables a second texture, which contains a copy of the WebGL output; default: `false`
* `disableMouseEvents`
  : if `true`, MouseEvents triggered on the output canvas will not be dispatched on the source element; default: `false`

### Scale Modes
Scale modes define how the output canvas is scaled in relation to the screen size. Available scale modes are:
* `WebGLazy.SCALE_MODES.FIT`
  : scale output canvas to fit screen (i.e. largest possible size with all content visible)
* `WebGLazy.SCALE_MODES.COVER`
  : scale output canvas to cover screen (i.e. smallest possible size with no background visible)
* `WebGLazy.SCALE_MODES.MULTIPLES`
  : scale up in multiples of original size (e.g. if the source's original size was 256x256 and the screen size is 1920x1080, the output canvas will be 1024x1024). This mode is particularly useful for upscaling pixel-art without artifacts.
* `WebGLazy.SCALE_MODES.NONE`
  : output canvas size doesn't scale with screen

![handy-dandy scaleMode diagram](https://seans.site/stuff/WebGLazy/scaleModes.svg "handy-dandy scaleMode diagram")

### Post-processing
Since `WebGLazy` renders to a WebGL canvas, simple post-processing shader support is made trivially easy!
Add `<script type='x-shader/x-fragment'></script>` tags with the id `'shader-vert'` or `'shader-frag'` to override the default shaders.

Available uniforms:
```glsl
uniform sampler2D tex0;  // source
uniform sampler2D tex1;  // output from last frame
uniform vec2 resolution; // size of output (uv coordinates = gl_FragCoord.xy / resolution)
uniform float time;      // milliseconds since initialization (equal to performance.now())
```

Example vertex shader:
```html
<script id='shader-vert' type='x-shader/x-fragment'>
	// pass-through vertex shader
	attribute vec4 position;
	void main(){
		gl_Position = position;
	}
</script>
```

Example fragment shader:
```html
<script id='shader-frag' type='x-shader/x-fragment'>
	// uv-wave fragment shader
	precision mediump float;
	uniform sampler2D tex0;
	uniform sampler2D tex1;
	uniform float time;
	uniform vec2 resolution;

	void main(){
		vec2 coord = gl_FragCoord.xy;
		vec2 uv = coord.xy / resolution.xy;
		uv.x += sin(uv.y * 10.0 + time / 200.0) / 60.0;
		uv.y += cos(uv.x * 10.0 + time / 200.0) / 60.0;
		vec3 col = texture2D(tex0,uv).rgb;
		gl_FragColor = vec4(col, 1.0);
	}
</script>
```

## Limitations
* Behaviour with multiple instances of `WebGLazy` on a single page is undefined
* If WebGL is not supported, `WebGLazy` will fallback to 2D canvas rendering, which does not support shaders
