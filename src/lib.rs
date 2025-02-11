// The wasm-pack uses wasm-bindgen to build and generate JavaScript binding file.
// Import the wasm-bindgen crate.
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};


#[wasm_bindgen]
pub struct Universe {
    atoms: Vec<f32>,
    settings: Settings,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct Settings {
    height: u32,
    width: u32,
    num_colors: u8,
    atoms_per_color: u32,
    toroid: bool,
    wall_repel: u32,
    viscosity: f32,
    rules: Vec<f32>,
    radii: Vec<f32>,
    time_scale: f32,
    real_forces: bool,
    debug: bool,
}

impl Settings {
    pub fn num_atoms(&self) -> usize {
        self.num_colors as usize * self.atoms_per_color as usize
    }
}

#[wasm_bindgen]
impl Universe {
    pub fn width(&self) -> u32 {
        self.settings.width
    }

    pub fn height(&self) -> u32 {
        self.settings.height
    }

    pub fn num_atoms(&self) -> usize {
        self.settings.num_atoms()
    }

    pub fn atoms(&self) -> *const f32 {
        self.atoms.as_ptr()
    }

    pub fn new(settings_js: JsValue) -> Universe {
        let settings: Settings = serde_wasm_bindgen::from_value(settings_js).unwrap();
        let atoms = Vec::with_capacity(settings.num_atoms());
        web_sys::console::log_1(&settings.toroid.into());

        let mut u = Universe {
            settings,
            atoms,
        };
        u.random_atoms();
        u
    }

    pub fn set_num_colors(&mut self, num_colors: u8) {
        self.settings.num_colors = num_colors;
        self.random_atoms();
    }

    pub fn set_rules(&mut self, rules: Vec<f32>) {
        self.settings.rules = rules;
    }

    pub fn set_radii(&mut self, radii: Vec<f32>) {
        self.settings.radii = radii;
    }

    pub fn set_viscosity(&mut self, viscosity: f32) {
        self.settings.viscosity = viscosity;
    }

    pub fn set_wall_repel(&mut self, wall_repel: u32) {
        self.settings.wall_repel = wall_repel;
    }

    pub fn set_toroid(&mut self, toroid: bool) {
        self.settings.toroid = toroid;
    }

    pub fn set_real_forces(&mut self, real_forces: bool) {
        self.settings.real_forces = real_forces;
    }

    pub fn set_time_scale(&mut self, time_scale: f32) {
        self.settings.time_scale = time_scale;
    }

    pub fn random_atoms(&mut self) {
        if self.settings.debug {
            self.debug_atoms();
            return
        }
        self.atoms = Vec::with_capacity(self.num_atoms());
        for i in 0..self.settings.num_colors {
            for _j in 0..self.settings.atoms_per_color {
                let rand_x: f32 = (js_sys::Math::random() * self.settings.width as f64) as f32;
                let rand_y: f32 = (js_sys::Math::random() * self.settings.height as f64) as f32;
                self.atoms.push(rand_x);
                self.atoms.push(rand_y);
                self.atoms.push(0.0);
                self.atoms.push(0.0);
                self.atoms.push(i as f32);
            }
        }
    }

    pub fn debug_atoms(&mut self) {
        self.settings.num_colors = 2;
        self.settings.atoms_per_color = 1;
        self.atoms = Vec::with_capacity(10);

        self.atoms.push(100.0);
        self.atoms.push(100.0);
        self.atoms.push(0.0);
        self.atoms.push(0.0);
        self.atoms.push(0.0);

        self.atoms.push(140.0);
        self.atoms.push(140.0);
        self.atoms.push(0.0);
        self.atoms.push(0.0);
        self.atoms.push(1.0);
    }

    fn get_distance(&self, i: usize, j: usize) -> (f32, f32) {
        let ax = 5 * i + 0;
        let ay = 5 * i + 1;
        let bx = 5 * j + 0;
        let by = 5 * j + 1;
        let mut dx = self.atoms[ax] - self.atoms[bx];
        let mut dy = self.atoms[ay] - self.atoms[by];
        if self.settings.toroid {
            let w = self.settings.width as f32;
            let h = self.settings.height as f32;
            let alt_dx = if dx > 0.0 { dx - w } else { dx + w };
            let alt_dy = if dy > 0.0 { dy - h } else { dy + h };
            if alt_dx.abs() < dx.abs() { dx = alt_dx; }
            if alt_dy.abs() < dy.abs() { dy = alt_dy; }
        }
        return (dx, dy);
    }

    pub fn tick(&mut self) {
        for i in 0..self.num_atoms() {
            let ax = 5 * i + 0;
            let ay = 5 * i + 1;
            let avx = 5 * i + 2;
            let avy = 5 * i + 3;
            let acol = 5 * i + 4;
            let mut fx = 0.0;
            let mut fy = 0.0;
            let r = self.settings.radii[self.atoms[acol] as usize];
            let r2 = r * r;
            for j in 0..self.num_atoms() {
                if i == j {
                    continue;
                }
                let bcol = 5 * j + 4;
                let (dx, dy) = self.get_distance(i, j);
                if dx == 0.0 && dy == 0.0 {
                    continue;
                }
                if dx.abs() > r || dy.abs() > r {
                    continue;
                }
                let d = dx * dx + dy * dy;
                let rule_idx = self.atoms[acol] as u8 * self.settings.num_colors + self.atoms[bcol] as u8;
                let g = self.settings.rules[rule_idx as usize];
                if d < r2 && d > 0.0 {
                    if self.settings.real_forces {
                        let f = g * (1.0 - d.sqrt() / r);
                        if g > 0.0 || d > 1.0 {
                            let theta = -(-dy).atan2(dx);
                            fx += f * theta.cos();
                            fy += f * theta.sin();
                        }
                    } else {
                        let f = g / d.sqrt();
                        fx += f * dx;
                        fy += f * dy;
                    }
                }
            }
            if !self.settings.toroid && self.settings.wall_repel > 0 {
                let d = self.settings.wall_repel as f32;
                let w = self.settings.width as f32;
                let h = self.settings.height as f32;
                let strength = 0.1;
                if self.atoms[ax] < d {
                    fx += (d - self.atoms[ax]) * strength
                }
                if self.atoms[ax] > w - d {
                    fx += (w - d - self.atoms[ax]) * strength
                }
                if self.atoms[ay] < d {
                    fy += (d - self.atoms[ay]) * strength
                }
                if self.atoms[ay] > h - d {
                    fy += (h - d - self.atoms[ay]) * strength
                }
            }
            let vmix = 1.0 - self.settings.viscosity;
            self.atoms[avx] = self.atoms[avx] * vmix + fx * self.settings.time_scale;
            self.atoms[avy] = self.atoms[avy] * vmix + fy * self.settings.time_scale;
        }
        for i in 0..self.num_atoms() {
            let x = 5 * i + 0;
            let y = 5 * i + 1;
            let vx = 5 * i + 2;
            let vy = 5 * i + 3;
            self.atoms[x] += self.atoms[vx];
            self.atoms[y] += self.atoms[vy];
            if self.settings.toroid {
                if self.atoms[x] < 0.0 {
                    self.atoms[x] += self.settings.width as f32;
                } else if self.atoms[x] > self.settings.width as f32 {
                    self.atoms[x] -= self.settings.width as f32;
                }
                if self.atoms[y] < 0.0 {
                    self.atoms[y] += self.settings.height as f32;
                } else if self.atoms[y] > self.settings.height as f32 {
                    self.atoms[y] -= self.settings.height as f32;
                }
            } else {
                if self.atoms[x] < 0.0 {
                    self.atoms[x] = self.atoms[x] * -1.0;
                    self.atoms[vx] = -self.atoms[vx];
                } else if self.atoms[x] > self.settings.width as f32 {
                    self.atoms[x] = self.settings.width as f32 - (self.atoms[x] - self.settings.width as f32);
                    self.atoms[vx] = -self.atoms[vx];
                } else if self.atoms[y] < 0.0 {
                    self.atoms[y] = self.atoms[y] * -1.0;
                    self.atoms[vy] = -self.atoms[vy];
                } else if self.atoms[y] > self.settings.height as f32 {
                    self.atoms[y] = self.settings.height as f32 - (self.atoms[y] - self.settings.height as f32);
                    self.atoms[vy] = -self.atoms[vy];
                }
            }
        }
    }
}

// Our Add function
// wasm-pack requires "exported" functions
// to include #[wasm_bindgen]
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
  return a + b;
}
