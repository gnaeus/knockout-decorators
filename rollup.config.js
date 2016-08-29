import typescript from "rollup-plugin-typescript";

export default {
    entry: "src/knockout-decorators.ts",
    dest: "dist/knockout-decorators.js",

    format: "umd",
    sourceMap: true,
    moduleName: "KnockoutDecorators",

    external: [
        "knockout",
    ],

    globals: {
        "knockout": "ko",
    },

    plugins: [
        typescript(),
    ],
}