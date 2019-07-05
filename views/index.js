const { ipcRenderer } = require('electron')

const logTable = document.querySelector('#logs')

const constructLogRow = ({ timestamp, source, message }) =>
  `<tr>
    <td>${timestamp}</td><td>${source}</td><td>${message.join(' ')}</td>
  </tr>`

ipcRenderer.on('log-update', (event, data) => {
  logTable.innerHTML += constructLogRow(data)
})
