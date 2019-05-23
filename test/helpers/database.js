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

module.exports = {
  reset,
  getAllModels,
}
