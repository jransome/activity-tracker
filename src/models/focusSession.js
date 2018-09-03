export default (sequelize, DataTypes) => {
  const FocusSession = sequelize.define('FocusSession', {
    pid: DataTypes.INTEGER,
    name: DataTypes.STRING,
    isActive: DataTypes.BOOLEAN,
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE
  }, {})

  FocusSession.associate = (models) => {
    FocusSession.belongsTo(models.Program)
  }

  return FocusSession
}
