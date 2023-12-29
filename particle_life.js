const FIELDS_PER_ATOM = 5;
const maxRadius = 200;
const maxClusters = 20;
const minClusterSize = 50;
const predefinedColors = ['green', 'red', 'orange', 'cyan', 'magenta', 'lavender', 'teal'];
const settings = {
    seed: 91651088029,
    fps: 0,
    atoms: {
        count: 100,  // Per Color
        radius: 1,
    },
    drawings: {  // Drawing options can be expensive on performance
        lines: false,   // draw lines between atoms that arr effecting each other
        circle: false,  // draw atoms as circles
        clusters: false,
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
    explore: false,
    explorePeriod: 100,
    rules: {},
    rulesArray: [],
    radii: {},
    radii2Array: [],
    colors: [],
    numColors: 4,
    time_scale: 1.0,
    viscosity: 0.7,  // speed-dampening (can be >1 !)
    gravity: 0.0,  // pulling downward
    pulseDuration: 10,
    wallRepel: 40,
    toroid: true,
    reset: () => {
        randomAtoms(settings.atoms.count, true)
    },
    randomRules: () => {
        settings.seed = local_seed   // last used seed is the new starting seed
        startRandom()
    },
    randomSetup: () => {
        settings.seed = local_seed   // last used seed is the new starting seed
        randomSetup();
        startRandom();
    },
    symmetricRules: false,
    gui: null,
}

const setupClicks = () => {
    canvas.addEventListener('click',
        (e) => {
            pulse = settings.pulseDuration;
            if (e.shiftKey) pulse = -pulse;
            pulse_x = e.clientX;
            pulse_y = e.clientY;
        }
    )
}
const setupKeys = () => {
    canvas.addEventListener('keydown',
        function (e) {
            console.log(e.key)
            switch (e.key) {
                case 'r':
                  settings.randomRules()
                break;
                case 't':
                  settings.drawings.clusters = !settings.drawings.clusters
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
const updateGUIDisplay = () => {
    console.log('gui', settings.gui)
    settings.gui.destroy()
    setupGUI()
}
Object.defineProperty(String.prototype, 'capitalise', {
    value: function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    },
    enumerable: false
})

// Build GUI
const setupGUI = () => {
    settings.gui = new lil.GUI()
    // Configs
    const configFolder = settings.gui.addFolder('Config')
    configFolder.add(settings, 'reset').name('Reset')
    configFolder.add(settings, 'randomRules').name('Random Rules')
    configFolder.add(settings, 'randomSetup').name('Random Setup')
    configFolder.add(settings, 'symmetricRules').name('Symmetric Rules')
    configFolder.add(settings, 'numColors', 1, 7, 1).name('Number of Colors')
        .listen().onFinishChange(v => {
            setNumberOfColors();
            startRandom();
        })
    configFolder.add(settings, 'seed').name('Seed').listen().onFinishChange(v => {
        startRandom();
    })
    configFolder.add(settings, 'fps').name('FPS - (Live)').listen().disable()
    configFolder.add(settings.atoms, 'count', 1, 1000, 1).name('Atoms per-color').listen().onFinishChange(v => {
        randomAtoms(v, true)
    })
    configFolder.add(settings, 'time_scale', 0.1, 5, 0.01).name('Time Scale').listen()
    configFolder.add(settings, 'viscosity', 0.1, 2, 0.1).name('Viscosity').listen()

    configFolder.add(settings, 'gravity', 0., 1., 0.05).name('Gravity').listen()
    configFolder.add(settings, 'pulseDuration', 1, 100, 1).name('Click Pulse Duration').listen()

    configFolder.add(settings, 'wallRepel', 0, 100, 1).name('Wall Repel').listen()
    configFolder.add(settings, 'toroid').name('Toroid').listen()
    configFolder.add(settings, 'explore').name('Random Exploration').listen()
    // Drawings
    const drawingsFolder = settings.gui.addFolder('Drawings')
    drawingsFolder.add(settings.atoms, 'radius', 1, 10, 0.5).name('Radius').listen()
    drawingsFolder.add(settings.drawings, 'circle').name('Circle Shape').listen()
    drawingsFolder.add(settings.drawings, 'clusters').name('Track Clusters').listen()
    drawingsFolder.add(settings.drawings, 'lines').name('Draw Lines').listen()
    drawingsFolder.addColor(settings.drawings, 'background_color').name('Background Color').listen()
    // Export
    const exportFolder = settings.gui.addFolder('Export')
    exportFolder.add(settings.export, 'image').name('Image')
    exportFolder.add(settings.export, 'video').name('Video: Start / stop')
    // Colors
    for (const atomColor of settings.colors) {
        const colorFolder =
            settings.gui.addFolder(`Rules: <font color=\'${atomColor}\'>${atomColor.capitalise()}</font>`)
        for (const ruleColor of settings.colors) {
            colorFolder.add(settings.rules[atomColor], ruleColor, -1, 1, 0.001)
                 .name(`<-> <font color=\'${ruleColor}\'>${ruleColor.capitalise()}</font>`)
                 .listen().onFinishChange(v => { flattenRules() }
            )
        }
        colorFolder.add(settings.radii, atomColor, 1, maxRadius, 5).name('Radius')
            .listen().onFinishChange(v => { flattenRules() }
        )
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

function randomSetup() {
    if (!isFinite(settings.seed)) settings.seed = 0xcafecafe;
    window.location.hash = "#" + settings.seed;
    document.title = "Life #" + settings.seed;
    local_seed = settings.seed;
    console.log('rand setup');
    settings.numColors = Math.floor(mulberry32() * 6 + 2); // 2 to 7
    totalAtoms = Math.floor(mulberry32() * 2500 + 500); // 500 to 3000
    settings.atoms.count = Math.floor(totalAtoms / settings.numColors);
    settings.viscosity = mulberry32() * 1.9 + 0.1; // 0.1 to 2
    settings.wallRepel = Math.floor(mulberry32() * 100); // 0 to 100
    console.log('numColors', settings.numColors);
    setNumberOfColors()
    randomRules();
}

function randomRules() {
    if (!isFinite(settings.seed)) settings.seed = 0xcafecafe;
    window.location.hash = "#" + settings.seed;
    document.title = "Life #" + settings.seed;
    local_seed = settings.seed;
    console.log("Seed=" + local_seed);
    for (const i of settings.colors) {
        settings.rules[i] = {};
        for (const j of settings.colors) {
            settings.rules[i][j] = mulberry32() * 2 - 1;
        }
        settings.radii[i] = 80;
    }
    console.log(JSON.stringify(settings.rules));
    flattenRules()
    if (settings.symmetricRules) symmetrizeRules();
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
    console.log(JSON.stringify(settings.rules));
    flattenRules()
}

function flattenRules() {
    settings.rulesArray = []
    settings.radii2Array = []
    for (const c1 of settings.colors) {
        for (const c2 of settings.colors) {
            settings.rulesArray.push(settings.rules[c1][c2])
        }
        settings.radii2Array.push(settings.radii[c1] * settings.radii[c1])
    }
}

function updateCanvasDimensions() {
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.9;
}

// Initiate Random locations for Atoms ( used when atoms created )
function randomX() {
    return mulberry32() * canvas.width;
};

function randomY() {
    return mulberry32() * canvas.height;
};

/* Create an Atom - Use matrices for x4/5 performance improvement
atom[0] = x
atom[1] = y
atom[2] = ax
atom[3] = ay
atom[4] = color (index)
*/
const create = (number, color) => {
    for (let i = 0; i < number; i++) {
        atoms.push([randomX(), randomY(), 0, 0, color])
    }
};

function randomAtoms(number_of_atoms_per_color, clear_previous) {
    atoms = life.createAtoms(null, 1, 2, 3, 4);
    console.log('create', settings.colors.length, number_of_atoms_per_color, canvas.width, canvas.height);
    atoms = life.createAtoms(null, settings.colors.length, number_of_atoms_per_color, canvas.width, canvas.height);
    console.log('created', atoms);
}

function startRandom() {
    randomRules();
    randomAtoms(settings.atoms.count, true);
    updateGUIDisplay()
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
// Draw a square
const drawSquare = (x, y, color, radius) => {
    m.fillStyle = color;
    m.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
}

// Draw a circle
function drawCircle(x, y, color, radius, fill = true) {
    m.beginPath();
    m.arc(x, y, radius, 0 * Math.PI, 2 * Math.PI);  // x, y, radius, ArcStart, ArcEnd
    m.closePath();
    m.strokeStyle = m.fillStyle = color;
    fill ? m.fill() : m.stroke()
};

// Draw a line between two atoms
function drawLineBetweenAtoms(ax, ay, bx, by, color) {
    m.beginPath();
    m.moveTo(ax, ay);
    m.lineTo(bx, by);
    m.closePath();
    m.strokeStyle = color;
    m.stroke();
};

// [position-x, position-y, radius, color]
//    /* tmp accumulators: */
//  {count, accum-x, accum-y, accum-d^2, accum-color}]
let clusters = [];
function newCluster() {
    return [randomX(), randomY(), maxRadius, 'white'];
}
function addNewClusters(num_clusters) {
    if (clusters.length < num_clusters / 2) {
        while (clusters.length < num_clusters) clusters.push(newCluster());
    }
}
function findNearestCluster(x, y) {
    let best = -1;
    let best_d2 = 1.e38;
    for (let i = 0; i < clusters.length; ++i) {
        const c = clusters[i];
        const dx = c[0] - x;
        const dy = c[1] - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best_d2) {
            best = i;
            best_d2 = d2;
        }
    }
    return [best, best_d2];
}
function moveClusters(accums) {
    let max_d = 0.;   // record max cluster displacement
    for (let i = 0; i < clusters.length; ++i) {
        let c = clusters[i];
        const a = accums[i];
        if (a[0] > minClusterSize) {
            const norm = 1. / a[0];
            const new_x = a[1] * norm;
            const new_y = a[2] * norm;
            max_d = Math.max(max_d, Math.abs(c[0] - new_x), Math.abs(c[1 ] - new_y));
            c[0] = new_x;
            c[1] = new_y;
        }
    }
    return max_d;
}
function finalizeClusters(accums) {
    for (let i = 0; i < clusters.length; ++i) {
        let c = clusters[i];
        const a = accums[i];
        if (a[0] > minClusterSize) {
            const norm = 1. / a[0];
            const new_r = 1.10 * Math.sqrt(a[3] * norm);  // with 10% extra room
            c[2] = 0.95 * c[2] + 0.05 * new_r;  // exponential smoothing
            // 'average' color
            c[3] = settings.colors[Math.floor(a[4] * norm + .5)];
        } else {
            c[2] = 0.;   // disable the weak cluster
        }
    }
    // note: if half of the particles are not within the average
    // radius of the cluster, we should probably split it in two
    // along the main axis!
}

// Canvas Dimensions
updateCanvasDimensions()


// Params for click-based pulse event
var pulse = 0;
var pulse_x = 0,
    pulse_y = 0;

var exploration_timer = 0;
function exploreParameters() {
    if (exploration_timer <= 0) {
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
        flattenRules();
        exploration_timer = settings.explorePeriod;
    }
    exploration_timer -= 1;
}

var total_v; // global velocity as a estimate of on-screen activity

const getDistance = (a, b) => {
    let dx = a[0] - b[0];
    let dy = a[1] - b[1];
    if (settings.toroid) {
        const altDx = dx > 0 ? dx - canvas.width : dx + canvas.width;
        const altDy = dy > 0 ? dy - canvas.height : dy + canvas.height;
        if (Math.abs(altDx) < Math.abs(dx)) dx = altDx;
        if (Math.abs(altDy) < Math.abs(dy)) dy = altDy;
    }
    return [dx, dy];
}

// Apply Rules ( How atoms interact with each other )
const applyRules = () => {
    total_v = 0.;
    // update velocity first
    for (const a of atoms) {
        let fx = 0;
        let fy = 0;
        const idx = a[4] * settings.numColors;
        const r2 = settings.radii2Array[a[4]]
        for (const b of atoms) {
            if (a === b) continue
            const g = settings.rulesArray[idx + b[4]];
            const [dx, dy] = getDistance(a, b);
            if (dx == 0 && dy == 0) continue;
            const d = dx * dx + dy * dy
            if (d < r2) {
                const F = g / Math.sqrt(d);
                fx += F * dx;
                fy += F * dy;

                // Draw lines between atoms that are effecting each other.
                if (settings.drawings.lines) {
                    drawLineBetweenAtoms(a[0], a[1], b[0], b[1], settings.colors[b[4]]);
                }
            }
        }
        if (pulse != 0) {
            const dx = a[0] - pulse_x;
            const dy = a[1] - pulse_y;
            const d = dx * dx + dy * dy;
            if (d > 0) {
                const F = 100. * pulse / (d * settings.time_scale);
                fx += F * dx;
                fy += F * dy;
            }
        }
        if (!settings.toroid && settings.wallRepel > 0) {
          const d = settings.wallRepel
          const strength = 0.1
          if (a[0] <                d) fx += (d -                a[0]) * strength
          if (a[0] > canvas.width - d) fx += (canvas.width - d - a[0]) * strength
          if (a[1] <                 d) fy += (d                 - a[1]) * strength
          if (a[1] > canvas.height - d) fy += (canvas.height - d - a[1]) * strength
        }
        fy += settings.gravity;
        const vmix = (1. - settings.viscosity);
        a[2] = a[2] * vmix + fx * settings.time_scale;
        a[3] = a[3] * vmix + fy * settings.time_scale;
        // record typical activity, so that we can scale the
        // time_scale later accordingly
        total_v += Math.abs(a[2]);
        total_v += Math.abs(a[3]);
    }
    // update positions now
    for (const a of atoms) {
        a[0] += a[2]
        a[1] += a[3]

        // When Atoms touch or bypass canvas borders
        if (a[0] < 0) {
            if (settings.toroid) {
                a[0] += canvas.width;
            } else {
                a[0] = -a[0];
                a[2] *= -1;
            }
        }
        if (a[0] >= canvas.width) {
            if (settings.toroid) {
                a[0] -= canvas.width;
            } else {
                a[0] = 2 * canvas.width - a[0];
                a[2] *= -1;
            }
        }
        if (a[1] < 0) {
            if (settings.toroid) {
                a[1] += canvas.height;
            } else {
                a[1] = -a[1];
                a[3] *= -1;
            }
        }
        if (a[1] >= canvas.height) {
            if (settings.toroid) {
                a[1] -= canvas.height;
            } else {
                a[1] = 2 * canvas.height - a[1];
                a[3] *= -1;
            }
        }

    }
    total_v /= atoms.length;
};


// Generate Rules
setNumberOfColors()
randomRules()

// Generate Atoms
let atoms = []


setupClicks()
setupKeys()
setupGUI()

console.log('settings', settings)

var lastT;
var univserse;
window.startLife = function() {
    console.log('start life');
    universe = window.Universe.new();
    lastT = Date.now();
    update();
}

function getX(index) {
    return atoms[index * FIELDS_PER_ATOM];
}

function getY(index) {
    return atoms[index * FIELDS_PER_ATOM + 1];
}

function getVx(index) {
    return atoms[index * FIELDS_PER_ATOM + 2];
}

function getVy(index) {
    return atoms[index * FIELDS_PER_ATOM + 3];
}

function getColor(index) {
    return Math.round(atoms[index * FIELDS_PER_ATOM + 4]);
}

function update() {
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
    console.log('got atoms', atoms.length);

    for (let i = 0; i < numAtoms; i++) {
        drawCircle(getX(i), getY(i), settings.colors[getColor(i)], settings.atoms.radius);
    }

    updateParams();

    // const inRange = (a) => 0 <= a[0] && a[0] < canvas.width && 0 <= a[1] && a[1] < canvas.height
    // console.log('inRange', atoms.filter(inRange).length)

    requestAnimationFrame(update);
};

// post-frame stats and updates
function updateParams() {
    // record FPS
    var curT = Date.now();
    if (curT > lastT) {
        const new_fps = 1000. / (curT - lastT);
        settings.fps = Math.round(settings.fps * 0.8 + new_fps * 0.2)
        lastT = curT;
    }

    // adapt time_scale based on activity
    if (total_v > 30. && settings.time_scale > 5.) settings.time_scale /= 1.1;
    if (settings.time_scale < 0.9) settings.time_scale *= 1.01;
    if (settings.time_scale > 1.1) settings.time_scale /= 1.01;

    if (pulse != 0) pulse -= (pulse > 0) ? 1 : -1;
    if (settings.explore) exploreParameters();
}



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
