# WASM
install tinygo and build WASM file
```
curl -L "https://github.com/tinygo-org/tinygo/releases/download/v0.30.0/tinygo_0.30.0_arm64.deb" > tinygo.deb
sudo dpkg -i tinygo.deb
cp $(tinygo env TINYGOROOT)/targets/wasm_exec.js .

tinygo build -o life.wasm -target wasm ./life.go
```
