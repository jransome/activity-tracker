const EventEmitter = require('events')
const { spawn } = require('child_process')
const logger = require('../logger')('[POWERSHELL]')

class Powershell extends EventEmitter {
  constructor(psArgs, startScript, stopScript) {
    super()
    this._isRunning = false
    this._startScript = startScript
    this._stopScript = stopScript
    this._spawn = () => spawn('powershell.exe', [...psArgs, '-File', startScript])
  }

  start() {
    if (this._isRunning) return
    this._isRunning = true
    this._psProc = this._spawn()

    this._psProc.on('error', err => {
      throw Object.assign(new Error('Error on Powershell child process'), {
        psError: err,
        script: this._startScript
      })
    })

    this._setEncoding()

    this._psProc.stderr.on('data', err => logger.error('Powershell script STDERR: ', err))

    this._psProc.stdout.on('data', data => {
      if (!this._isRunning) return
      data.split('\n').forEach(line => this.emit('data', line))
    })
  }

  end() {
    return new Promise(async resolve => {
      if (!this._isRunning) resolve()
      this._isRunning = false
      if (this._stopScript) await this._runStopScript()
      this._psProc.on('exit', resolve)
      this._psProc.kill()
    })
  }

  _runStopScript() {
    return new Promise(resolve => {
      this._psProc.stdin.end(this._stopScript, () => {
        logger.debug(`Invoked Powershell stop script for ${this._startScript.trim()}`)
        resolve()
      })
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
