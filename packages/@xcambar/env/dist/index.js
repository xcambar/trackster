export function getEnvironment(k) {
    if (!Object.keys(process.env).includes(k)) {
        throw new Error(`Environment variable ${k} is not set`);
    }
    return process.env[k];
}
