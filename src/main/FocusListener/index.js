const { spawn } = require('child_process')
const { EventEmitter } = require('events')
const path = require('path')

class FocusListener extends EventEmitter {
  constructor() {
    super()
    const encoding = 'utf8' // encoding for strings not buffers (as is default)
    const psScriptsDir = path.resolve(__dirname, '../../powershell/focus')
    const startMonitoringScript = `${psScriptsDir}/focus-monitor-start.ps1 \n`
    this._stopMonitoringScript = `${psScriptsDir}/focus-monitor-stop.ps1 \n`

    const args = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-']
    this._psProc = spawn('powershell.exe', args)

    if (!this._psProc.pid) throw new Error("Powershell child process did not start")

    this._psProc.on('error', error => {
      throw new Error("ERROR on Powershell child process: " + error)
    })

    this._psProc.stdin.setDefaultEncoding(encoding)
    this._psProc.stdout.setEncoding(encoding)
    this._psProc.stderr.setEncoding(encoding)

    this._psProc.stdin.write(startMonitoringScript, () => this.emit('ready'))

    this._psProc.stdout.on('data', (data) => {
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
    })

    this._psProc.stderr.on('data', (data) => {
      this.emit('powershell-error', data)
    })
  }

  stop() {
    this._psProc.stdin.write(this._stopMonitoringScript, () => {
      this._psProc.stdin.end()
      console.log('Stopped listening')
    })
  }

  _validate(event) {
    return (event.length === 2)
  }
}

module.exports = FocusListener
