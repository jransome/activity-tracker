const reset = (db) => {
  const models = Object.keys(db.models)
  return Promise.all(models.reduce((acc, model) => acc.concat([
    db.models[model].destroy({ where: {}, force: true }),
    db.query(`DELETE FROM SQLITE_SEQUENCE WHERE NAME='${model}s';`)
  ]), []))
}

const getAllModels = async ({ models }) => ({
  focusSessions: await models.FocusSession.findAll(),
  programs: await models.Program.findAll(),
})

module.exports = {
  reset,
  getAllModels,
}
