const path = require('path')
const PowershellProcess = require('../../PowershellProcess')

let processListener

const psArgs = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-']
const psScriptArgs = '-StartEventIdentifier startevent -StopEventIdentifier stopevent'
const registerEventsScript = `${path.resolve(__dirname, './register-events.ps1')} ${psScriptArgs}\n`
const unregisterEventsScript = `${path.resolve(__dirname, './unregister-events.ps1')} ${psScriptArgs}\n`

const dataHandler = (data, successCb) => {
  console.log(data)
  try {
    const event = JSON.parse(data)
    event.timeStamp = new Date()
    successCb('listener-event', event)
  } catch (error) {
    // console.log('Non JSON PS output handled')
  }
}

try {
  processListener = new PowershellProcess(dataHandler, psArgs, registerEventsScript, unregisterEventsScript)
} catch (error) {
  console.log('processListener initialisation error', error) // TODO. throw again?
}

module.exports = processListener
