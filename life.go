package main

import (
	"math/rand"
	"syscall/js"
)
// Declare a main function, this is the entrypoint into our go module
// That will be run. In our example, we won't need this
func main() {
	println("Hello TinyGo from WasmEdge!")
}

//export atoms
var atoms = "foo"

func randomX(width int) float32 {
	return rand.Float32() * float32(width)
}

func randomY(height int) float32 {
	return rand.Float32() * float32(height)
}

//export createAtoms
func createAtoms(colors int, atomsPerColor int, width int, height int) interface{} {
	println("create", colors, " ", atomsPerColor, " ", width, " ", height)
	atoms := make([]interface{}, colors * atomsPerColor)
	for i := 0; i < colors; i++ {
		println("col", i)
		for j := 0; j < atomsPerColor; j++ {
			atom := []interface{}{
				js.ValueOf(randomX(width)),
				js.ValueOf(randomY(height)),
				js.ValueOf(0),
				js.ValueOf(0),
				js.ValueOf(i),
			}
			atoms[i * atomsPerColor + j] = js.ValueOf(atom)
		}
	}
	return js.ValueOf(atoms)
}

// This exports an add function.
// It takes in two 32-bit integer values
// And returns a 32-bit integer value.
// To make this function callable from JavaScript,
// we need to add the: "export add" comment above the function
//export add
func add(x int, y int) int {
	println("add", x, " ", y)
	return x + y;
}
