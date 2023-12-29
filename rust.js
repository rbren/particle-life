import init from "./pkg/particle_life.js";
import { Universe, Atom } from "./pkg/particle_life.js";


const runWasm = async () => {
  // Instantiate our wasm module
  const helloWorld = await init("./pkg/particle_life_bg.wasm");

  // Call the Add function export from wasm, save the result
  const addResult = helloWorld.add(24, 24);

  console.log('add', addResult);
  console.log('hw', helloWorld);
  console.log('init', init);
  const uni = Universe.new();

  console.log('uni', uni);
  uni.tick();
  console.log('ticked');
};
runWasm();
