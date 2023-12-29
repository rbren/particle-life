// The wasm-pack uses wasm-bindgen to build and generate JavaScript binding file.
// Import the wasm-bindgen crate.
use wasm_bindgen::prelude::*;


#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    atoms: Vec<f32>,
}

#[wasm_bindgen]
impl Universe {
    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn num_atoms(&self) -> usize {
        self.atoms.len() / 5 as usize
    }

    pub fn atoms(&self) -> *const f32 {
        self.atoms.as_ptr()
    }

    pub fn new(width: u32, height: u32) -> Universe {
        let atoms_per_color = 100;
        let colors = 4;
        let num_atoms = colors as usize * atoms_per_color as usize;
        let mut atoms: Vec<f32> = Vec::with_capacity(num_atoms);

        for i in 0..colors {
            for _j in 0..atoms_per_color {
                let rand_x: f32 = (js_sys::Math::random() * width as f64) as f32;
                let rand_y: f32 = (js_sys::Math::random() * height as f64) as f32;
                atoms.push(rand_x);
                atoms.push(rand_y);
                atoms.push(0.0);
                atoms.push(0.0);
                atoms.push(i as f32);
            }
        }

        Universe {
            width,
            height,
            atoms,
        }
    }

    pub fn tick(&mut self) {
        for i in 0..self.num_atoms() {
            let x = 5 * i + 0;
            let y = 5 * i + 1;
            let vx = 5 * i + 2;
            let vy = 5 * i + 3;
            self.atoms[x] += self.atoms[vx];
            self.atoms[y] += self.atoms[vy];
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
