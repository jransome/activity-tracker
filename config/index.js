const logger = require('../lib/logger')('[CONFIG]')

const defaults = {
  username: 'root',
  password: null,
  name: 'database',
  dialect: 'sqlite',
  logging: false,
  userDocumentsPath: './directory-stubs/documents',
}

module.exports = (appInstance) => {
  const environment = process.env.ENVIRONMENT ? process.env.ENVIRONMENT : 'production'
  const config = environment !== 'production' ?
    {
      ...defaults,
      storage: `./directory-stubs/userData/db_${environment}.sqlite3`
    }
    :
    {
      ...defaults,
      storage: `${appInstance.getPath('userData')}/db.sqlite3`,
      userDocumentsPath: appInstance.getPath('documents'),
    }

  logger.debug(`Using ${environment} config:`, config)
  return config
}
