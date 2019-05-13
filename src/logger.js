module.exports = (prefix) => ({
    info: (...args) => console.log(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    debug: (...args) => console.log(prefix, ...args), // console.debug is not a function
    error: (...args) => console.error(prefix, ...args),
})
