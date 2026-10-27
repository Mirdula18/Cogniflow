// plotly.js-dist-min ships no types. It is only passed to react-plotly.js's
// factory, which accepts `unknown`, so no wider surface is declared.
declare module "plotly.js-dist-min" {
  const Plotly: object;
  export default Plotly;
}
