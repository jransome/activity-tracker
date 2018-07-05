const { app, BrowserWindow } = require('electron')
const persistence = require('./src/persistence')

let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({ width: 1200, height: 900 })

  mainWindow.loadFile('index.html')

  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
