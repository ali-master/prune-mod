import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import { terser } from "rollup-plugin-terser";
import typescript from "@rollup/plugin-typescript";

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/another-package.cjs.js",
      format: "cjs",
      sourcemap: true,
    },
    {
      file: "dist/another-package.esm.js",
      format: "es",
      sourcemap: true,
    },
    {
      file: "dist/another-package.umd.js",
      format: "umd",
      name: "AnotherPackage",
      sourcemap: true,
    },
  ],
  plugins: [
    resolve({
      browser: true,
    }),
    commonjs(),
    typescript({
      sourceMap: !production,
      inlineSources: !production,
    }),
    babel({
      exclude: "node_modules/**",
      babelHelpers: "bundled",
    }),
    production && terser(),
  ],
  external: ["lodash"],
};
