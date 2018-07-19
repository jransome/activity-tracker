export default (sequelize, DataTypes) => {
  const ProgramSession = sequelize.define('ProgramSession', {
    startTime: DataTypes.DATE,
    isActive: DataTypes.BOOLEAN,
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE,
    duration: DataTypes.INTEGER
  }, {})
  ProgramSession.associate = (models) => {
    ProgramSession.belongsTo(models.Program)
    ProgramSession.hasMany(models.ProcessSession)
  }
  return ProgramSession
}
