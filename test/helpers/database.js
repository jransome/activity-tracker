const reset = (db) => {
  const models = Object.keys(db).filter(key => key.toLowerCase() !== 'sequelize')
  return Promise.all(models.reduce((acc, model) => acc.concat([
    db[model].destroy({ where: {}, force: true }),
    db.sequelize.query(`DELETE FROM SQLITE_SEQUENCE WHERE NAME='${model}s';`)
  ]), []))
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
