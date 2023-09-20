import { createGameLoop, createStage, createViewport } from "gdxts";
import { FireRenderer } from "./utils/FireRenderer";
// import dimensions from "./client/data-general/dimension";
// import { getGame } from "./util/gameUtil";

const init = async () => {
  const stage = createStage();
  const canvas = stage.getCanvas();

  const viewport = createViewport(canvas, 1000, 1000, {
    crop: true,

    contextOption: {
      antialias: false,
    },
  });
  const gl = viewport.getContext();
  const camera = viewport.getCamera();

  camera.setYDown(true);

  const fire = new FireRenderer(gl);

  let time = 0;
  gl.clearColor(1, 1, 1, 1);
  createGameLoop((delta) => {
    time += delta;
    gl.clear(gl.COLOR_BUFFER_BIT);

    fire.setProjection(camera.combined);
    fire.begin(time);

    // fire.shader.setUniform3fv("iResolution", [
    //   viewport.getViewportInfo().width,
    //   viewport.getViewportInfo().height,
    //   viewport.getViewportInfo().width,
    // ]);
    // fire.shader.setUniformf("iTimeDelta", delta);
    // fire.shader.setUniformf("iTime", time);
    // fire.shader.setUniformf("iFrameRate", loop.getFps());
    fire.draw(10, 10, 100, 100);
    fire.end();
  });
};

init();
