// setup db
const dbConnection = require('./src/models')

// listen for processes
const processList = {}//require("process-list")
const saveSnapshot = require('./process')(processList, dbConnection)
saveSnapshot()

// app
const { app, BrowserWindow } = require('electron')

let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({ width: 800, height: 600, show: false })

  mainWindow.loadFile('index.html')

  mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    // Program.query().then((programs) => {
    //   mainWindow.webContents.send('update-programs', programs)
    // })
  })

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
