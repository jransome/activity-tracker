export default (sequelize, DataTypes) => {
  const Program = sequelize.define('Program', {
    exeName: DataTypes.STRING,
    upTime: DataTypes.INTEGER,
    focusTime: DataTypes.BIGINT.UNSIGNED,
  }, {})

  Program.associate = (models) => {
    Program.hasMany(models.FocusSession)
    Program.hasMany(models.ProgramSession)
    Program.hasMany(models.ProcessSession)
  }
  
  return Program
}
