import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import typescript from "rollup-plugin-typescript";

export default {
    entry: "src/knockout-decorators.ts",
    dest: "dist/knockout-decorators.js",

    format: "umd",
    moduleName: "KnockoutDecorators",

    external: [
        "knockout",
    ],

    globals: {
        "knockout": "ko",
    },

    plugins: [
        typescript(),
        nodeResolve(),
        commonjs(),
    ]
}