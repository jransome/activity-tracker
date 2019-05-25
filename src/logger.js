const listeners = []
const broadcast = (...args) => listeners.forEach(l => l([...args].join(' ')))

module.exports = (prefix) => ({
  registerListener: (cb) => listeners.push(cb),
  info: (...args) => console.log(prefix, ...args) || broadcast(prefix, ...args),
  warn: (...args) => console.warn(prefix, ...args) || broadcast(prefix, ...args),
  debug: (...args) => console.log(prefix, ...args) || broadcast(prefix, ...args), // console.debug is not a function
  error: (...args) => console.error(prefix, ...args) || broadcast(prefix, ...args),
})
