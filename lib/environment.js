"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvironment = getEnvironment;
function getEnvironment(k) {
    if (!Object.keys(process.env).includes(k)) {
        throw new Error("Environment variable ".concat(k, " is not set"));
    }
    return process.env[k];
}
