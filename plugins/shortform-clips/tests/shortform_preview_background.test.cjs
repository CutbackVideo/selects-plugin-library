"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const modules = process.env.SBS_PANEL_TEST_MODULES;

test("async preview image loading preserves full-canvas background placement", {skip: !modules}, async () => {
  const dep = createRequire(path.resolve(modules, "../package.json"));
  const { JSDOM } = dep("jsdom");
  const dom = new JSDOM('<div id="root"></div>');
  const previous = {window: global.window, document: global.document, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT};
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = dep("react");
  const {createRoot} = dep("react-dom/client");
  const source = fs.readFileSync(path.join(__dirname, "../panel.tsx"), "utf8");
  const start = source.indexOf("const RadioPreviewFrame:");
  const end = source.indexOf("const RadioPreviewCaption:", start);
  const mod = {exports: {}};
  const code = dep("esbuild").transformSync('const React=require("react");\n' + source.slice(start, end) + '\nmodule.exports=RadioPreviewFrame;', {loader:"tsx", format:"cjs"}).code;
  new Function("require", "module", "exports", code)(dep, mod, mod.exports);
  const root = createRoot(document.getElementById("root"));
  const data = {designElement:"background", windowTop:394, windowBottom:1500, background:"#abc", backgroundCanvasAligned:true};
  const render = async image => React.act(async () => root.render(React.createElement(mod.exports, {data:{...data, backgroundImage:image}})));
  try {
    // The hook initially returns an empty URL, then resolves the resized image.
    // Repeat the transition to cover changing templates/images as well.
    for (let i=0; i<2; i++) {
      await render("");
      await render("data:image/png;base64,AA==");
      const bands = [...document.querySelectorAll("div")].filter(n => n.style.backgroundImage);
      assert.equal(bands.length, 2);
      assert.equal(bands[0].style.backgroundPosition, "0px 0px");
      assert.equal(bands[1].style.backgroundPosition, "0px -1500px");
      for (const band of bands) assert.equal(band.style.backgroundSize, "1080px 1920px");
    }
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
    Object.assign(global, previous);
  }
});
