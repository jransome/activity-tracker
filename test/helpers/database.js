const fs = require('fs')
const config = require('../../config')

const TEST_DATABASE_FILENAMES = [
  config.storage,
  `${config.storage}-shm`,
  `${config.storage}-wal`,
]

const destroy = () => TEST_DATABASE_FILENAMES.forEach((file) => {
  if (fs.existsSync(file)) fs.unlinkSync(file)
})

const getAllModels = async (db) => ({
  focusSessions: await db.FocusSession.findAll(),
  programs: await db.Program.findAll(),
})

module.exports = {
  destroy,
  getAllModels,
}
