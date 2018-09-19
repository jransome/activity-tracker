const { spawn } = require('child_process')
const { EventEmitter } = require('events')

class Powershell extends EventEmitter {
  constructor(dataHandler, psArgs, startScript, stopScript) {
    super()
    this.isRunning = false
    this.startScript = startScript
    this.stopScript = stopScript
    this.spawn = () => spawn('powershell.exe', psArgs)
    const successCb = (...args) => this.emit(...args)
    this.dataHandler = data => dataHandler(data, successCb)
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this._psProc = this.spawn()

    if (!this._psProc.pid) {
      throw Object.assign(new Error("Powershell child process did not start"), {
        startScript
      })
    }

    this._psProc.on('error', err => {
      throw Object.assign(new Error("Error on Powershell child process"), {
        psError: err,
        startScript
      })
    })

    this._setEncoding()

    this._psProc.stderr.on('data', (err) => {
      console.log('Error in Powershell script execution: ', err)
    })

    this._psProc.stdout.on('data', this.dataHandler)
    
    this._psProc.stdin.write(this.startScript)
  }

  stop() {
    if (!this.isRunning) return
    this.isRunning = false
    this._psProc.stdin.write(this.stopScript, () => {
      this.close()
      console.log('Stopped Powershell process for ' + this.startScript)
    })
  }

  close() {
    this._psProc.stdin.end()
  }

  _setEncoding() {
    const encoding = 'utf8' // encoding for strings not buffers (as is default)    
    this._psProc.stdin.setDefaultEncoding(encoding)
    this._psProc.stdout.setEncoding(encoding)
    this._psProc.stderr.setEncoding(encoding)
  }
}

module.exports = Powershell
