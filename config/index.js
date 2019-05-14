const { app } = require('electron')
const isDev = require('electron-is-dev')
const logger = require('../src/logger')('[CONFIG]')

const config = {
  development: {
    username: "root",
    password: null,
    name: "database_development",
    storage: "./directory-stubs/userData/db_dev.sqlite3",
    dialect: "sqlite",
    operatorsAliases: false,
    logging: false,
    userDocumentsPath: "./directory-stubs/documents",
  },
  test: {
    username: "root",
    password: null,
    name: "database_test",
    storage: "./directory-stubs/userData/db_test.sqlite3",
    dialect: "sqlite",
    operatorsAliases: false,
    logging: false,
    userDocumentsPath: "./directory-stubs/documents",
  },
  // production: {
  //   username: "root",
  //   password: null,
  //   name: "database_production",
  //   storage: `${app.getPath('userData')}/db.sqlite3`,
  //   dialect: "sqlite",
  //   operatorsAliases: false,
  //   logging: false,
  //   userDocumentsPath: app.getPath('documents'),
  // }
}

const getConfig = () => {
  // if (!isDev) return config.production
  return config[process.env.NODE_ENV.trim()]
}

const exportedConfig = getConfig()
logger.info('Using config:', exportedConfig)

module.exports = exportedConfig
