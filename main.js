// setup db
const Sequelize = require('sequelize')
const db = new Sequelize('database', 'username', 'password', {
  operatorsAliases: false,
  dialect: 'sqlite',
  storage: 'db/database.sqlite3'
})

db.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.')
    db.query("PRAGMA journal_mode=WAL;")
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err)
  })


// listen for processes
const saveSnapshot = require('./process')(db)

saveSnapshot()

// setTimeout(() => {
//   console.log('Saving 2nd')
//   saveSnapshot()
// }, 5000)


// app
const { app, BrowserWindow } = require('electron')

let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({ width: 1200, height: 900, show: false })

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
