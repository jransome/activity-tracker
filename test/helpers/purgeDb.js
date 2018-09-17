module.exports = async (db) => {
  const models = Object.keys(db)
  models.forEach(async (key) => {
    if (key.toLowerCase() === 'sequelize') return null
    await db[key].destroy({ where: {}, force: true, truncate: true })
    await db.sequelize.query(`DELETE FROM SQLITE_SEQUENCE WHERE NAME='${key}s';`)
  })
}
