const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const Umzug = require('umzug')

const runMigrations = async (sequelize, appPath) => {
  const umzug = new Umzug({
    storage: 'sequelize',
    storageOptions: {
      sequelize,
    },
    migrations: {
      params: [
        sequelize.getQueryInterface(),
        sequelize.constructor,
        function () {
          throw new Error('Migration tried to use old style "done" callback. Please upgrade to "umzug" and return a promise instead.')
        }
      ],
      path: `${appPath}/db/migrations`,
      pattern: /\.js$/
    }
  })
  try {
    await umzug.up()
    console.log('Migration complete!')
  } catch (error) {
    console.log('migrations', error)
  }
}

const initDb = async (config, userDataPath, appPath) => {
  const basename = path.basename(__filename)
  const env = process.env.NODE_ENV || 'production'
  const dbConfig = config[env]
  const db = {}
  if (env === 'production') dbConfig.storage = `${userDataPath}/db.sqlite3`

  const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig)

  await runMigrations(sequelize, appPath)

  fs.readdirSync(__dirname)
    .filter(file => {
      return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js')
    })
    .forEach(file => {
      const model = sequelize['import'](path.join(__dirname, file))
      db[model.name] = model
    })

  Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) db[modelName].associate(db)
  })

  sequelize.query("PRAGMA journal_mode=WAL;") // use wal

  db.sequelize = sequelize
  db.Sequelize = Sequelize

  return db
}

module.exports = initDb
