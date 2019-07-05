const listeners = []
const broadcast = (timestamp, source, ...args) => listeners.forEach(l => l({ timestamp, source, message: [...args] }))
const prefixLogArgs = (prefix, ...args) => [`[${new Date().toISOString()}]`, prefix, ...args]
const log = (level, argsArray) => console[level](...argsArray) || broadcast(...argsArray)

module.exports = (prefix) => ({
  registerListener: (listener) => listeners.push(listener),
  info: (...args) => log('info', prefixLogArgs(prefix, ...args)),
  warn: (...args) => log('warn', prefixLogArgs(prefix, ...args)),
  debug: (...args) => log('log', prefixLogArgs(prefix, ...args)), // console.debug is not a function
  error: (...args) => log('error', prefixLogArgs(prefix, ...args)),
})
