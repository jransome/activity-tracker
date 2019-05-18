const reset = async (db) => {
  const models = Object.keys(db).filter(key => key.toLowerCase() !== 'sequelize')
  models.forEach(async (model) => {
    await db[model].destroy({ where: {}, force: true, truncate: true })
    await db.sequelize.query(`DELETE FROM SQLITE_SEQUENCE WHERE NAME='${model}s';`)
  })
}

const getAllModels = async (db) => ({
  focusSessions: await db.FocusSession.findAll(),
  programs: await db.Program.findAll(),
})

const createFakeSession = async (db, exeName, now) => {
  const [program] = await db.Program.findCreateFind({ where: { exeName } })
  const newSession = {
    pid: 123,
    path: 'not important',
    exeName,
    isActive: true,
    startTime: now || new Date(),
    ProgramId: program.id,
  }
  await db.FocusSession.create(newSession)
}

module.exports = {
  reset,
  getAllModels,
  createFakeSession,
}
