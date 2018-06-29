const { desktopCapturer } = require('electron')

const refreshwindows = document.querySelector('#refresh-windows-btn')
const windowList = document.querySelector('#window-list')

refreshwindows.addEventListener('click', async () => {
  const openWindows = await getOpenWindows()
  openWindows.forEach(window => {
    let windowElm = document.createElement('li')
    windowElm.textContent = window.name
    windowList.appendChild(windowElm)
  })
})

const getOpenWindows = () => {
  return new Promise((resolve, reject) => {
    desktopCapturer.getSources({ types: ['window'] }, (error, sources) => {
      if (error) reject(error)
      resolve(sources)
    })
  })
}
