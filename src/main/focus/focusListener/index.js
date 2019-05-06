const path = require('path')
const { EventEmitter } = require('events')
const Powershell = require('../../Powershell')

const psArgs = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-']
const startMonitoringScript = `${path.resolve(__dirname, './focus-monitor-start.ps1')} \n`
const stopMonitoringScript = `${path.resolve(__dirname, './focus-monitor-stop.ps1')} \n`

const parseData = (data) => {
  const parsed = data.split('_FOCUS_CHANGE_')
  if (parsed.length === 2) return parsed
}

const focusListenerFactory = () => {
  const focusListener = new EventEmitter()
  
  const dataHandler = (data) => {
    const parsedData = parseData(data)
    if (parsedData) {
      focusListener.emit('data' ,{
        pid: parseInt(parsedData[0]),
        path: parsedData[1].trim(),
        exeName: parsedData[1].trim().split("\\").slice(-1)[0],
        timestamp: new Date()
      })
    }
  }

  try {
    new Powershell(psArgs, startMonitoringScript, stopMonitoringScript, dataHandler)
  } catch (error) {
    console.error('Focus Listener powershell initialisation error', error) 
  }

  return focusListener
}

module.exports = focusListenerFactory
