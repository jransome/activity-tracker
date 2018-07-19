import fs from 'fs'
import path from 'path'
import Sequelize from 'sequelize'
import config from '../../config/database.json'

const basename = path.basename(__filename)
const env = process.env.NODE_ENV || 'development'
const dbConfig = config[env]
const db = {}

if (dbConfig.use_env_variable) {
  var sequelize = new Sequelize(process.env[dbConfig.use_env_variable], dbConfig)
} else {
  var sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig)
}

fs
  .readdirSync(__dirname)
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

export default db
