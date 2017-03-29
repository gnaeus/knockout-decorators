import { default as typescriptPlugin} from "rollup-plugin-typescript";
import typescript from "typescript";

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
        typescriptPlugin({
            typescript: typescript,
        }),
    ],
}
