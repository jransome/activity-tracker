export default (sequelize, DataTypes) => {
  const ProcessSession = sequelize.define('ProcessSession', {
    pid: DataTypes.INTEGER,
    pidName: DataTypes.STRING,
    isActive: DataTypes.BOOLEAN,
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE
  }, {})

  ProcessSession.associate = (models) => {
    ProcessSession.belongsTo(models.Program)
    ProcessSession.belongsTo(models.ProgramSession)
  }

  return ProcessSession
}
