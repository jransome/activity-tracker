module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    pid: DataTypes.INTEGER,
    isActive: DataTypes.BOOLEAN,
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE
  }, {})

  Session.associate = (models) => {
    Session.belongsTo(models.Program)
  }

  return Session
}
