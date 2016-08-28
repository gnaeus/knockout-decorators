var ts = require("typescript");
var fs = require("fs");

var tsconfig = JSON.parse(fs.readFileSync("./tsconfig.json"));

module.exports = {
    process: function(src, filename) {
        if (filename.indexOf("node_modules") === -1) {
            if (filename.indexOf(".ts") === filename.length - 3) {
                src = ts.transpile(src, tsconfig);
            }
        }
        return src;
    }
};