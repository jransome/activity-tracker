const { app, BrowserWindow } = require('electron')
const logger = require('./src/logger')('[MAIN]')
const config = require('./config')
const connectToDb = require('./database')
const startRecording = require('./src/main/focus')

const exportSpreadsheet = require('./src/main/exportSpreadsheet')

const { userDocumentsPath } = config
let isStartedUp
let database
let focusRecorder
let mainWindow

const instanceAlreadyRunning = app.makeSingleInstance(() => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

if (instanceAlreadyRunning) app.quit()

async function startup() {
  database = await connectToDb(config)
  focusRecorder = await startRecording(database)
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
    logger.registerListener((log) => {
      if (mainWindow) mainWindow.webContents.send('log-update', log)
    })
    isStartedUp = startup()
  } catch (error) {
    logger.error('Startup error: ', error)
  }
})

app.on('window-all-closed', async () => {
  logger.debug('All windows closed')
  await isStartedUp
  await focusRecorder.stopRecording()
  try {
    await exportSpreadsheet(database, userDocumentsPath)
  } catch (error) {
    logger.error('Exporting spreadsheet error: ' + error)
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
