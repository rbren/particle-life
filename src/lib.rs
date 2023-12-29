// The wasm-pack uses wasm-bindgen to build and generate JavaScript binding file.
// Import the wasm-bindgen crate.
use wasm_bindgen::prelude::*;


#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    atoms: Vec<Vec<f32>>,
}

#[wasm_bindgen]
impl Universe {
    fn get_index(&self, row: u32, column: u32) -> usize {
        (row * self.width + column) as usize
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn num_atoms(&self) -> usize {
        self.atoms.len()
    }

    pub fn atoms(&self) -> *const f32 {
        self.atoms[0].as_ptr()
    }

    pub fn new() -> Universe {
        let width = 64;
        let height = 64;
        let atoms_per_color = 100;
        let colors = 4;
        let num_atoms = colors as usize * atoms_per_color as usize;
        let mut atoms: Vec<Vec<f32>> = Vec::with_capacity(num_atoms);

        for i in 0..colors {
            for _j in 0..atoms_per_color {
                atoms.push(vec![
                   js_sys::Math::random() as f32 * width as f32,
                   js_sys::Math::random() as f32 * height as f32,
                   0.0, 0.0, i as f32]);
            }
        }

        Universe {
            width,
            height,
            atoms,
        }
    }

    pub fn tick(&mut self) {
        for atom in self.atoms.iter_mut() {
            atom[0] += atom[2];
            atom[2] += atom[3];
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
