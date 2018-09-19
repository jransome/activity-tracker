const path = require('path')
const PowershellProcess = require('../../PowershellProcess')

let focusListener

const psArgs = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-']
const startMonitoringScript = `${path.resolve(__dirname, './focus-monitor-start.ps1')} \n`
const stopMonitoringScript = `${path.resolve(__dirname, './focus-monitor-stop.ps1')} \n`

const parseData = data => {
  const parsed = data.split('_FOCUS_CHANGE_')
  if (parsed.length === 2) return parsed
}

const dataHandler = (data, successCb) => {
  try {
    const parsedData = parseData(data)
    if (parsedData) {
      successCb('listener-event', {
        pid: parseInt(parsedData[0]),
        path: parsedData[1].trim(),
        exeName: parsedData[1].trim().split("\\").slice(-1)[0],
        timestamp: new Date()
      })
    }
  } catch (error) {
    console.log('Error on parsing focus listener event: ', error)
  }
}

try {
  focusListener = new PowershellProcess(dataHandler, psArgs, startMonitoringScript, stopMonitoringScript)
} catch (error) {
  console.log('focusListener initialisation error', error) // TODO. throw again?
}

module.exports = focusListener
