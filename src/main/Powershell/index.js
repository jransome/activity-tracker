const { spawn } = require('child_process')

class Powershell {
  constructor(psArgs, startScript, stopScript, dataHandler) {
    this._isRunning = false
    this._startScript = startScript
    this._stopScript = stopScript
    this._dataHandler = dataHandler
    this._spawn = () => spawn('powershell.exe', psArgs)
  }

  start() {
    if (this._isRunning) return
    this._isRunning = true
    this._psProc = this._spawn()

    if (!this._psProc.pid) {
      throw Object.assign(new Error('Powershell child process did not start'), {
        script: startScript
      })
    }

    this._psProc.on('error', err => {
      throw Object.assign(new Error('Error on Powershell child process'), {
        psError: err,
        script: startScript
      })
    })

    this._setEncoding()

    this._psProc.stderr.on('data', (err) => {
      console.log('Error in Powershell script execution: ', err)
    })

    this._psProc.stdout.on('data', data => this._dataHandler(data))
    
    this._psProc.stdin.write(this._startScript)
  }

  stop() {
    if (!this._isRunning) return
    this._isRunning = false
    this._psProc.stdin.end(this._stopScript ? this._stopScript : null, () => {
      console.log('Stopped Powershell process for ' + this._startScript)
    })
  }

  _setEncoding() {
    const encoding = 'utf8' // encoding for strings not buffers (as is default)    
    this._psProc.stdin.setDefaultEncoding(encoding)
    this._psProc.stdout.setEncoding(encoding)
    this._psProc.stderr.setEncoding(encoding)
  }
}

module.exports = Powershell
