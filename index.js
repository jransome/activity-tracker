var { ipcRenderer } = require('electron')

const processList = document.querySelector('#process-list')

ipcRenderer.on('update-programs', (event, programs) => {
    console.log('receiving', event)
    programs.forEach(program => {
      let processElm = document.createElement('li')
      processElm.textContent = JSON.stringify(program)
      processList.appendChild(processElm)
    })
})
