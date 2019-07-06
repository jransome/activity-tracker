const path = require('path')
const { EventEmitter } = require('events')
const logger = require('../../logger')('[LISTENER]')
const Powershell = require('../../Powershell')

const psArgs = ['-NoLogo', '-NoExit']
const startMonitoringScript = `${path.resolve(__dirname, './focus-monitor-start.ps1')} \n`
const stopMonitoringScript = `${path.resolve(__dirname, './focus-monitor-stop.ps1')} \n`

const createFocusEvent = (pid, path, exeName) => ({
  startTime: new Date(),
  pid,
  path,
  exeName,
})

const parse = (data) => {
  const parsed = data.split('_FOCUS_CHANGE_')
  return parsed.length === 2 ?
    createFocusEvent(parseInt(parsed[0]), parsed[1].trim(), parsed[1].trim().split('\\').slice(-1)[0]) :
    null
}

const focusListenerFactory = (powerMonitor) => {
  const focusListener = new EventEmitter()
  const psProc = new Powershell(psArgs, startMonitoringScript, stopMonitoringScript)

  psProc.on('data', (data) => {
    const parsedData = parse(data)
    if (parsedData) focusListener.emit('data', parsedData)
  })

  powerMonitor.on('suspend', () => {
    logger.info('Detected system going to sleep...')
    focusListener.emit('data', createFocusEvent(-1, 'System sleep', 'System sleep'))
  })

  try {
    logger.debug('Starting up powershell child process...')
    psProc.start()
  } catch (error) {
    logger.error('Error starting focus listener:', JSON.stringify(error, null, 2))
  }

  return {
    listener: focusListener,
    end: () => psProc.end().then(() => logger.debug('Powershell process exited'))
  }
}

module.exports = focusListenerFactory
