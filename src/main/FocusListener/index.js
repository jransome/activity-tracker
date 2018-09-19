const { EventEmitter } = require('events')
const path = require('path')
const PowershellProcess = require('../PowershellProcess')

class FocusListener extends EventEmitter {
  constructor() {
    super()
    const args = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-']
    const psScriptsDir = path.resolve(__dirname, '../../powershell/focus')
    const startMonitoringScript = `${psScriptsDir}/focus-monitor-start.ps1 \n`
    const stopMonitoringScript = `${psScriptsDir}/focus-monitor-stop.ps1 \n`
    
    try {
      this._psProc = new PowershellProcess(args, startMonitoringScript, stopMonitoringScript)
      this._psProc.on('data', data => this._handleData(data))
      this.start()
    } catch (error) {
      console.log('focus listener error', error) // TODO. throw again?
    }
  }
  
  start() {
    this._psProc.executeStartScript()
  }

  stop() {
    this._psProc.executeStopScript()
  }

  _handleData(data) {
    try {
      const output = data.split('_FOCUS_CHANGE_') // TODO: refactor
      if (this._validate(output)) {
        const event = {
          pid: parseInt(output[0]),
          path: output[1].trim(),
          exeName: output[1].trim().split("\\").slice(-1)[0],
          timestamp: new Date()
        }
        this.emit('listener-event', event)
      }
    } catch (error) {
      console.log(error)
    }
  }

  _validate(event) {
    return (event.length === 2)
  }
}

module.exports = FocusListener
