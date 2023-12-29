import init from "./pkg/particle_life.js";
import { Universe } from "./pkg/particle_life.js";

const runWasm = async () => {
  const pkg = await init("./pkg/particle_life_bg.wasm");
  console.log('pkg', pkg);
  window.Universe = Universe;
  window.memory = pkg.memory;
  window.startLife();
};
runWasm();
