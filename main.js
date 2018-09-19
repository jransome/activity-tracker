const { app, BrowserWindow } = require('electron')
const config = require('./config')
const initDb = require('./db')
const { MainRecorder, RECORDING_MODES } = require('./src/main/MainRecorder')
const exportSpreadsheet = require('./src/main/exportSpreadsheet')

const { userDocumentsPath } = config
let models
let mainRecorder
let mainWindow

const instanceAlreadyRunning = app.makeSingleInstance(() => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

if (instanceAlreadyRunning) app.quit()

async function startup() {
  models = await initDb(config)
  mainRecorder = new MainRecorder(models)
  mainRecorder.startRecording(RECORDING_MODES.FOCUS_ONLY)
  
  mainRecorder.on('focus-recorder-log', log => {
    if (mainWindow) mainWindow.webContents.send('log-update', log)
  })
}

const createWindow = () => {
  mainWindow = new BrowserWindow({ width: 800, height: 600, show: false })
  mainWindow.loadFile('index.html')

  mainWindow.webContents.openDevTools()
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
  
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', () => {
  try {
    createWindow()
    startup()
  } catch (error) {
    console.log('Startup error: ', error)
  }
})

app.on('window-all-closed', async () => {
  await mainRecorder.stopRecording()
  try {
    await exportSpreadsheet(models, userDocumentsPath)
  } catch (error) {
    console.log('Exporting spreadsheet error: ' + error)
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
