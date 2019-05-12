const fs = require('fs')
const config = require('../../config')

const TEST_DATABASE_FILENAMES = [
  config.storage,
  `${config.storage}-shm`,
  `${config.storage}-wal`,
]

const purge = async (db) => {
  const models = Object.keys(db)
  models.forEach(async (key) => {
    if (key.toLowerCase() === 'sequelize') return null
    await db[key].destroy({ where: {}, force: true, truncate: true })
    await db.sequelize.query(`DELETE FROM SQLITE_SEQUENCE WHERE NAME='${key}s';`)
  })
}

const destroy = () => TEST_DATABASE_FILENAMES.forEach((file) => {
  if (fs.existsSync(file)) fs.unlinkSync(file)
})

const getAllModels = () => ({
  focusSessions: await db.FocusSession.findAll(),
  programs: await db.Program.findAll(),
})

module.exports = {
  purge,
  destroy,
  getAllModels,
}
