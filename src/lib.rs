// The wasm-pack uses wasm-bindgen to build and generate JavaScript binding file.
// Import the wasm-bindgen crate.
use wasm_bindgen::prelude::*;


#[wasm_bindgen]
pub struct Atom {
    color: u8,
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
}

#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    atoms: Vec<Atom>,
}

#[wasm_bindgen]
impl Universe {
    fn get_index(&self, row: u32, column: u32) -> usize {
        (row * self.width + column) as usize
    }

    pub fn new() -> Universe {
        let width = 64;
        let height = 64;
        let atoms_per_color = 100;
        let colors = 4;
        let num_atoms = colors as usize * atoms_per_color as usize;
        let mut atoms: Vec<Atom> = Vec::with_capacity(num_atoms);

        for i in 0..colors {
            for _j in 0..atoms_per_color {
                atoms.push(Atom {
                    color: i,
                    x: 0.5 * width as f32,
                    y: 0.5 * height as f32,
                    vx: 0.1,
                    vy: 0.1,
                });
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
            atom.x += atom.vx;
            atom.y += atom.vy;
            if atom.x < 0.0 || atom.x > 1.0 {
                atom.vx *= -1.0;
            }
            if atom.y < 0.0 || atom.y > 1.0 {
                atom.vy *= -1.0;
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
