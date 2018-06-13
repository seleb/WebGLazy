// ==UserScript==
// @name         WebGLazy
// @namespace    https://seans.site/
// @version      1.1
// @description  Run `new WebGLazy()`
// @author       Sean S. LeBlanc
// @match        *://*/*
// @run-at       document-end
// @grant        GM_registerMenuCommand
// @require      https://raw.githubusercontent.com/seleb/WebGLazy/master/dist/WebGLazy.min.js
// ==/UserScript==

(function() {
    'use strict';

    GM_registerMenuCommand('WebGLazy on '+window.location, function(){
        try{
            new WebGLazy({
                sources:['canvas'],
                allowDownscaling:true,
                disableFeedbackTexture:true
            });
            document.body.webkitRequestFullscreen();
        }catch(err){
            console.error('WebGLazy failed!',err);
            alert('WebGLazy failed!\n'+err);
        }
    }, undefined);
})();
