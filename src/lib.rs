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
    rules: Vec<f32>,
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
        let mut u = Universe {
            settings,
            atoms,
        };
        u.random_atoms();
        u
    }

    pub fn random_atoms(&mut self) {
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

    pub fn tick(&mut self) {
        for i in 0..self.num_atoms() {
            let ax = 5 * i + 0;
            let ay = 5 * i + 1;
            let avx = 5 * i + 2;
            let avy = 5 * i + 3;
            let acol = 5 * i + 4;
            let mut fx = 0.0;
            let mut fy = 0.0;
            for j in 0..self.num_atoms() {
                let bx = 5 * j + 0;
                let by = 5 * j + 1;
                let bcol = 5 * j + 4;
                let dx = self.atoms[bx] - self.atoms[ax];
                let dy = self.atoms[by] - self.atoms[ay];
                //web_sys::console::log_2(&dx.into(), &dy.into());
                if dx == 0.0 && dy == 0.0 {
                    continue;
                }
                let d = dx * dx + dy * dy;
                let ruleIdx = self.atoms[acol] as u8 * self.settings.num_colors + self.atoms[bcol] as u8;
                let g = self.settings.rules[ruleIdx as usize];
                if d < 800.0  && d > 0.0 {
                    let f = g / d.sqrt();
                    fx += f * dx;
                    fy += f * dy;
                }
            }
            self.atoms[avx] += fx;
            self.atoms[avy] += fy;
        }
        for i in 0..self.num_atoms() {
            let x = 5 * i + 0;
            let y = 5 * i + 1;
            let vx = 5 * i + 2;
            let vy = 5 * i + 3;
            self.atoms[x] += self.atoms[vx];
            self.atoms[y] += self.atoms[vy];
            if self.settings.toroid {
                self.atoms[x] = (self.atoms[x] + self.settings.width as f32) % self.settings.width as f32;
                self.atoms[y] = (self.atoms[y] + self.settings.height as f32) % self.settings.height as f32;
            } else {
                self.atoms[x] = self.atoms[x].max(0.0).min(self.settings.width as f32);
                self.atoms[y] = self.atoms[y].max(0.0).min(self.settings.height as f32);
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
