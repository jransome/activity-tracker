const { EventEmitter } = require('events')
const path = require('path')
const PowershellProcess = require('../PowershellProcess')

class ProcessListener extends EventEmitter {
  constructor() {
    super()
    const args = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-']
    const startEventIdentifier = 'startevent'
    const stopEventIdentifier = 'stopevent'
    const psScriptArgs = `-StartEventIdentifier ${startEventIdentifier} -StopEventIdentifier ${stopEventIdentifier}`
    const psScriptsDir = path.resolve(__dirname, '../../powershell/process')
    const registerEventsScript = `${psScriptsDir}/register-events.ps1 ${psScriptArgs}\n`
    const unregisterEventsScript = `${psScriptsDir}/unregister-events.ps1 ${psScriptArgs}\n`

    try {
      this._psProc = new PowershellProcess(args, registerEventsScript, unregisterEventsScript)
      this._psProc.on('data', data => this._handleData(data))
      this.start()
    } catch (error) {
      console.log('process listener error', error) // TODO. throw again?
    }
  }
  
  start() {
    this._psProc.executeStartScript()
  }

  stop() {
    this._psProc.executeStopScript()
  }

  _handleData(data) {
    console.log('jkhdgaksjhsgfkjasfhg')
    try {
      const event = JSON.parse(data)
      event.timeStamp = new Date()
      this.emit('listener-event', event)
    } catch (error) {
      // console.log('Non JSON PS output handled')
    }
  }
}

module.exports = ProcessListener
