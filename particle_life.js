const DEBUG = false;
const FIELDS_PER_ATOM = 5;
const MS_PER_FRAME = 1;
const maxRadius = 200;
const predefinedColors = ['green', 'red', 'orange', 'cyan', 'magenta', 'lavender', 'teal'];
const settings = {
    seed: 3762108977281,
    fps: 0,
    numColors: 6,
    atoms: {
        count: 500,  // Per Color
        radius: 1,
    },
    drawings: {  // Drawing options can be expensive on performance
        circle: false,  // draw atoms as circles
        background_color: '#000000', // Background color
    },
    export: {
        // Export a Screenshot image
        image: () => {
            const imageDataURL = canvas.toDataURL({
                format: 'png',
                quality: 1
            });
            dataURL_downloader(imageDataURL);
        },
        // Export a video recording
        video: () => {
            mediaRecorder.state == 'recording' ? mediaRecorder.stop() : mediaRecorder.start();
        },
    },
    explore: 4,
    rules: {},
    rulesArray: [],
    radii: {},
    radiiArray: [],
    colors: [],
    timeScale: 0.2,
    viscosity: 0.7,  // speed-dampening (can be >1 !)
    gravity: 0.0,  // pulling downward
    wallRepel: 40,
    realForces: true,
    toroid: true,
    reset: () => {
        startLife();
    },
    randomRules: () => {
        settings.seed = local_seed   // last used seed is the new starting seed
        randomizeRules();
    },
    randomSetup: () => {
        settings.seed = local_seed   // last used seed is the new starting seed
        randomizeSetup();
        startLife();
    },
    symmetricRules: false,
    gui: null,
}

const setupKeys = () => {
    canvas.addEventListener('keydown',
        function (e) {
            switch (e.key) {
                case 'r':
                  settings.randomRules()
                break;
                case 'o':
                  settings.reset()
                break;
                case 's':
                  settings.symmetricRules = !settings.symmetricRules
                break;
                default:
                  console.log(e.key)
            }
        })
}

// Build GUI
const setupGUI = () => {
    if (settings.gui) settings.gui.destroy();
    settings.gui = new lil.GUI();
    // Configs
    const configFolder = settings.gui.addFolder('Config')
    configFolder.add(settings, 'reset').name('Reset')
    configFolder.add(settings, 'randomRules').name('Random Rules')
    configFolder.add(settings, 'randomSetup').name('Random Setup')
    configFolder.add(settings, 'symmetricRules').name('Symmetric Rules')
    configFolder.add(settings, 'numColors', 1, 7, 1).name('Number of Colors')
        .listen().onFinishChange(v => {
            startLife();
        });
    configFolder.add(settings, 'seed').name('Seed')
        .listen().onFinishChange(v => {
            startLife();
        });
    configFolder.add(settings, 'fps').name('FPS - (Live)').listen().disable()
    configFolder.add(settings.atoms, 'count', 1, 1000, 1).name('Atoms per-color')
        .listen().onFinishChange(v => {
            startLife();
        });
    configFolder.add(settings, 'timeScale', 0.1, 5, 0.01).name('Time Scale')
        .listen().onFinishChange(t => {
            universe.set_time_scale(t);
        });
    configFolder.add(settings, 'viscosity', 0.1, 2, 0.1).name('Viscosity')
        .listen().onFinishChange(v => {
            universe.set_viscosity(v);
        });

    configFolder.add(settings, 'gravity', 0., 1., 0.05).name('Gravity').listen()

    configFolder.add(settings, 'wallRepel', 0, 100, 1).name('Wall Repel').listen()
        .listen().onFinishChange(v => {
            universe.set_wall_repel(v);
        });

    configFolder.add(settings, 'toroid').name('Toroid').listen().onFinishChange(v => {
        universe.set_toroid(v);
    });

    configFolder.add(settings, 'realForces').name('Real Forces').listen().onFinishChange(v => {
        universe.set_real_forces(v);
    });

    configFolder.add(settings, 'explore', 0, 60, 1).name('Explore (s)').listen()
    // Drawings
    const drawingsFolder = settings.gui.addFolder('Drawings')
    drawingsFolder.add(settings.atoms, 'radius', 1, 10, 0.5).name('Radius').listen()
    drawingsFolder.addColor(settings.drawings, 'background_color').name('Background Color').listen()
    // Export
    const exportFolder = settings.gui.addFolder('Export')
    exportFolder.add(settings.export, 'image').name('Image')
    exportFolder.add(settings.export, 'video').name('Video: Start / stop')
    // Colors
    for (const atomColor of settings.colors) {
        const colorFolder =
            settings.gui.addFolder(`Rules: <font color=\'${atomColor}\'>${atomColor}</font>`)
        for (const ruleColor of settings.colors) {
            colorFolder.add(settings.rules[atomColor], ruleColor, -1, 1, 0.001)
                 .name(`<-> <font color=\'${ruleColor}\'>${ruleColor}</font>`)
                 .listen().onFinishChange(v => {
                    updateRules();
                 })
        }
        colorFolder.add(settings.radii, atomColor, 1, maxRadius, 5).name('Radius')
            .listen().onFinishChange(v => {
                updateRules();
            })
    }


}


// Seedable 'decent' random generator
var local_seed = settings.seed;
function mulberry32() {
    let t = local_seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296.;
}

function loadSeedFromUrl() {
    let hash = window.location.hash;
    if (hash != undefined && hash[0] == '#') {
        let param = Number(hash.substr(1)); // remove the leading '#'
        if (isFinite(param)) {
            settings.seed = param;
            console.log("Using seed " + settings.seed);
        }
    }
}

function randomizeSetup() {
    if (!isFinite(settings.seed)) settings.seed = 0xcafecafe;
    window.location.hash = "#" + settings.seed;
    document.title = "Life #" + settings.seed;
    local_seed = settings.seed;
    settings.numColors = Math.floor(mulberry32() * 6 + 2); // 2 to 7
    totalAtoms = Math.floor(mulberry32() * 2500 + 500); // 500 to 3000
    settings.atoms.count = Math.floor(totalAtoms / settings.numColors);
    settings.viscosity = mulberry32() * 1.9 + 0.1; // 0.1 to 2
    settings.wallRepel = Math.floor(mulberry32() * 100); // 0 to 100
    setNumberOfColors()
    randomizeRules();
}

function randomizeRules() {
    if (!isFinite(settings.seed)) settings.seed = 0xcafecafe;
    window.location.hash = "#" + settings.seed;
    document.title = "Life #" + settings.seed;
    local_seed = settings.seed;
    for (const i of settings.colors) {
        settings.rules[i] = {};
        for (const j of settings.colors) {
            settings.rules[i][j] = mulberry32() * 2 - 1;
        }
        settings.radii[i] = 80;
    }
    if (settings.symmetricRules) symmetrizeRules();
    updateRules();
}

function symmetrizeRules() {
    for (const i of settings.colors) {
        for (const j of settings.colors) {
            if (j < i) {
                let v = 0.5 * (settings.rules[i][j] + settings.rules[j][i]);
                settings.rules[i][j] = settings.rules[j][i] = v;
            }
        }
    }
}

function flattenRules() {
    settings.rulesArray = []
    settings.radiiArray = []
    for (const c1 of settings.colors) {
        for (const c2 of settings.colors) {
            settings.rulesArray.push(settings.rules[c1][c2])
        }
        settings.radiiArray.push(settings.radii[c1])
    }
}

function updateCanvasDimensions() {
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.9;
}

function setNumberOfColors() {
    settings.colors = [];
    for (let i = 0; i < settings.numColors; ++i) {
        settings.colors.push(predefinedColors[i]);
    }
}

// Run Application
loadSeedFromUrl()

// Canvas
const canvas = document.getElementById('canvas');
const m = canvas.getContext("2d");

// Draw a circle
function drawCircle(x, y, color, radius, fill = true) {
    m.beginPath();
    m.arc(x, y, radius, 0 * Math.PI, 2 * Math.PI);  // x, y, radius, ArcStart, ArcEnd
    m.closePath();
    m.strokeStyle = m.fillStyle = color;
    fill ? m.fill() : m.stroke()
};

// Canvas Dimensions
updateCanvasDimensions()


var lastExploreTime = 0;
function exploreParameters() {
    const now = Date.now();
    if (now - lastExploreTime < settings.explore * 1000) return;
    console.log('exploring!');
    let c1 = settings.colors[Math.floor(mulberry32() * settings.numColors)];
    if (mulberry32() >= 0.2) {  // 80% of the time, we change the strength
      let c2 = settings.colors[Math.floor(mulberry32() * settings.numColors)];
      let new_strength = mulberry32();
      // for better results, we force opposite-signed values
      if (settings.rules[c1][c2] > 0) new_strength = -new_strength;
      settings.rules[c1][c2] = new_strength;
    } else {  // ...otherwise, the radius
      settings.radii[c1] = 1 + Math.floor(mulberry32() * maxRadius);
    }
    lastExploreTime = now;
}

function reset() {
    if (DEBUG) {
        settings.numColors = 2;
        settings.atoms.count = 1;
        settings.atoms.radius = 10;
        settings.explore = 0;
    }
    setNumberOfColors();
    randomizeRules();
    if (DEBUG) {
        const attr = -0.5;
        settings.rules[settings.colors[0]][settings.colors[0]] = attr;
        settings.rules[settings.colors[0]][settings.colors[1]] = attr;
        settings.rules[settings.colors[1]][settings.colors[0]] = attr;
        settings.rules[settings.colors[1]][settings.colors[1]] = attr;
        settings.radii[settings.colors[0]] = 110;
        settings.radii[settings.colors[1]] = 110;
        updateRules();
    }
    setupGUI()
}

// Generate Atoms
let atoms = []
let universe = null;

function updateRules() {
    flattenRules();
    if (universe) {
        universe.set_rules(settings.rulesArray);
        universe.set_radii(settings.radiiArray);
        console.log('set rules and rads', settings.radiiArray);
    }
}


setupKeys()

var lastUpdateEnd;
var lastMsDuration;
var univserse;
window.startLife = function() {
    if (window.animFrame) cancelAnimationFrame(window.animFrame);
    reset();
    universe = window.Universe.new({
        width: canvas.width,
        height: canvas.height,
        num_colors: settings.numColors,
        atoms_per_color: settings.atoms.count,
        toroid: settings.toroid,
        rules: settings.rulesArray,
        radii: settings.radiiArray,
        wall_repel: settings.wallRepel,
        viscosity: settings.viscosity,
        time_scale: settings.timeScale,
        real_forces: settings.realForces,
        debug: DEBUG,
    });
    lastUpdateEnd = Date.now();
    lastMsDuration = 0;
    update();
}

function getX(index) {
    return atoms[index * FIELDS_PER_ATOM];
}

function getY(index) {
    return atoms[index * FIELDS_PER_ATOM + 1];
}

function getColor(index) {
    return Math.round(atoms[index * FIELDS_PER_ATOM + 4]);
}

function update() {
    const updateStart = Date.now();
    // Update Canvas Dimensions - if screen size changed
    updateCanvasDimensions()
    // Background color
    m.fillStyle = settings.drawings.background_color;
    m.fillRect(0, 0, canvas.width, canvas.height);
    // Appy Rules
    universe.tick();
    // Draw Atoms
    const numAtoms = universe.num_atoms();
    const atomsPtr = universe.atoms();
    atoms = new Float32Array(memory.buffer, atomsPtr, numAtoms * FIELDS_PER_ATOM);

    for (let i = 0; i < numAtoms; i++) {
        drawCircle(getX(i), getY(i), settings.colors[getColor(i)], settings.atoms.radius);
    }

    if (settings.explore) exploreParameters();

    const updateEnd = Date.now();
    lastMsDuration = updateEnd - lastUpdateEnd;
    const new_fps = 1000. / lastMsDuration;
    settings.fps = settings.fps * 0.8 + new_fps * 0.2;

    const timeLeft = MS_PER_FRAME - (updateEnd - updateStart);
    setTimeout(() => {
        window.animFrame = requestAnimationFrame(update);
    }, Math.max(0, timeLeft));
    lastUpdateEnd = updateEnd;
};

// Download DataURL
function dataURL_downloader(dataURL, name = `particle_life_${settings.seed}`) {
    const hyperlink = document.createElement("a");
    // document.body.appendChild(hyperlink);
    hyperlink.download = name;
    hyperlink.target = '_blank';
    hyperlink.href = dataURL;
    hyperlink.click();
    hyperlink.remove();
};


// Recorde a video ----------------------------------
// Stream
const videoStream = canvas.captureStream();
// Video Recorder
const mediaRecorder = new MediaRecorder(videoStream);
// temp chunks
let chunks = [];
// Store chanks
mediaRecorder.ondataavailable = function (e) {
    chunks.push(e.data);
};
// Download video after recording is stopped
mediaRecorder.onstop = function (e) {
    // Chunks ---> Blob
    const blob = new Blob(chunks, { 'type': 'video/mp4' });
    // Blob -----> DataURL
    const videoDataURL = URL.createObjectURL(blob);

    // Download video
    dataURL_downloader(videoDataURL);

    // Reset Chunks
    chunks = [];
};

// mediaRecorder.start(); // Start recording
// mediaRecorder.stop(); // Stop recording
// --------------------------------------------------
