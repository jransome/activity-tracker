const { app, BrowserWindow } = require('electron')
const config = require('./config')(app)
const logger = require('./lib/logger')('[MAIN]')
const connectToDb = require('./database')
const startRecording = require('./lib/focus')
const exportSpreadsheet = require('./lib/exportSpreadsheet')

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
  mainWindow.loadFile('views/index.html')

  // mainWindow.webContents.openDevTools()

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
    logger.registerListener((logObject) => {
      if (mainWindow) mainWindow.webContents.send('log-update', logObject)
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
    await exportSpreadsheet(database, config.userDocumentsPath)
  } catch (error) {
    logger.error('Exporting spreadsheet error: ' + error)
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
