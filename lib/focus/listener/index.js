const path = require('path')
const { EventEmitter } = require('events')
const logger = require('../../logger')('[LISTENER]')
const Powershell = require('../../Powershell')

const psArgs = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-']
const startMonitoringScript = `${path.resolve(__dirname, './focus-monitor-start.ps1')} \n`
const stopMonitoringScript = `${path.resolve(__dirname, './focus-monitor-stop.ps1')} \n`

const parse = (data) => {
  const parsed = data.split('_FOCUS_CHANGE_')
  return parsed.length === 2 ? {
    pid: parseInt(parsed[0]),
    path: parsed[1].trim(),
    exeName: parsed[1].trim().split('\\').slice(-1)[0],
    startTime: new Date()
  } : null
}

const focusListenerFactory = () => {
  const focusListener = new EventEmitter()
  const psProc = new Powershell(psArgs, startMonitoringScript, stopMonitoringScript)

  psProc.on('data', (data) => {
    const parsedData = parse(data)
    if (parsedData) focusListener.emit('data', parsedData)
  })

  try {
    logger.debug('Starting up powershell child process...')
    psProc.start()
  } catch (error) {
    logger.error('Error starting focus listener:', JSON.stringify(error, null, 2))
  }

  return { listener: focusListener, end: () => psProc.end() }
}

module.exports = focusListenerFactory
