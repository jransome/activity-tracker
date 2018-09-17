const { app, BrowserWindow } = require('electron')
const config = require('./config')
const initDb = require('./src/models')
const { MainRecorder, RECORDING_MODES } = require('./src/MainRecorder')
const exportSpreadsheet = require('./src/exportSpreadsheet')

const userDataPath = app.getPath('userData')
let dbConnection
let mainRecorder
let mainWindow

async function startup() {
  const appDir = app.getAppPath()
  dbConnection = await initDb(config, userDataPath, appDir)
  mainRecorder = new MainRecorder(dbConnection, appDir)
}

const createWindow = () => {
  mainWindow = new BrowserWindow({ width: 800, height: 600, show: false })
  mainWindow.loadFile('index.html')
  
  mainWindow.webContents.openDevTools()
  mainWindow.webContents.send('console-log', userDataPath)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainRecorder.startRecording(RECORDING_MODES.FOCUS_ONLY)
  })

  mainRecorder.on('focus-recorder-log', log => {
    if (mainWindow) mainWindow.webContents.send('log-update', log)
  })

  mainRecorder.on('console-log', log => {
    if (mainWindow) mainWindow.webContents.send('console-log', log)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', async () => {
  await startup()
  createWindow()
})

app.on('window-all-closed', async () => {
  await mainRecorder.stopRecording()
  try {
    await exportSpreadsheet(dbConnection, app.getPath('documents'))
  } catch (error) {
    console.log('Exporting spreadsheet error: ' + error)
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
