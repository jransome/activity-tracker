module.exports = (sequelize, DataTypes) => {
  const FocusSession = sequelize.define('FocusSession', {
    pid: DataTypes.INTEGER,
    exeName: DataTypes.STRING,
    startTime: DataTypes.DATE,
    duration: DataTypes.BIGINT.UNSIGNED,
  }, {})

  FocusSession.associate = (models) => {
    FocusSession.belongsTo(models.Program)
  }

  return FocusSession
}
