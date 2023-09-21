import { createGameLoop, createStage, createViewport } from "gdxts";
import { FireRenderer } from "./components/FireRenderer";
import { GradientRenderer } from "./components/GradientFlow";
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
  const gradient = new GradientRenderer(gl);

  let time = 0;
  gl.clearColor(1, 1, 1, 1);
  createGameLoop((delta) => {
    time += delta;
    gl.clear(gl.COLOR_BUFFER_BIT);

    fire.setProjection(camera.combined);
    fire.begin(time);
    fire.draw(10, 10, 100, 100);
    fire.end();

    gradient.setProjection(camera.combined);
    gradient.begin(time);
    gradient.draw(10, 100, 500, 500);
    gradient.end();
  });
};

init();
