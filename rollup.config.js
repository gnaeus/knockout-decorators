import typescript from "rollup-plugin-typescript2";
import uglify from "rollup-plugin-uglify";
import filesize from "rollup-plugin-filesize";
import deepmerge from "deepmerge";
import pkg from "./package.json";

const typescriptPlugin = target => typescript({
    tsconfigOverride: {
        compilerOptions: { target },
        include: ["src"]
    },
    include: ["src/**/*.ts"]
});

const uglifyPlugin = uglify({
    mangle: {
        toplevel: true,
        properties: {
            regex: /^_.*/
        }
    }
});

const filesizePlugin = filesize();

const es6 = {
    input: "src/knockout-decorators.ts",
    external: ["knockout"],
    output: {
        file: pkg.module,
        format: "es",
        sourcemap: true
    },
    plugins: [typescriptPlugin("es5")]
};

const umd = {
    input: "src/knockout-decorators.ts",
    external: ["knockout"],
    output: {
        file: pkg.main,
        format: "umd",
        name: "KnockoutDecorators",
        globals: {
            knockout: "ko"
        },
        sourcemap: true
    },
    plugins: [typescriptPlugin("es5")]
};

const es6Min = deepmerge(es6, {
    output: {
        file: es6.output.file.replace(".js", ".min.js")
    },
    plugins: [uglifyPlugin, filesizePlugin]
});

const umdMin = deepmerge(umd, {
    output: {
        file: umd.output.file.replace(".js", ".min.js")
    },
    plugins: [uglifyPlugin, filesizePlugin]
});

export default [es6, umd, es6Min, umdMin];
