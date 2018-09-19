const { ipcRenderer } = require('electron')

const logList = document.querySelector('#logs')

ipcRenderer.on('log-update', (event, log) => {
  const newLog = document.createElement('li')
  newLog.textContent = log
  logList.appendChild(newLog)
})
