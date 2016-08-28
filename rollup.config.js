import typescript from "rollup-plugin-typescript";

export default {
    entry: "src/knockout-decorators.ts",
    dest: "dist/knockout-decorators.js",

    format: "es",
    sourceMap: true,

    external: [
        "knockout",
    ],

    plugins: [
        typescript(),
    ],
}