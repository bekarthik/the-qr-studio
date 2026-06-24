// wrangler turns a .wasm import into a WebAssembly.Module at build time.
declare module '*.wasm' {
  const mod: WebAssembly.Module;
  export default mod;
}
