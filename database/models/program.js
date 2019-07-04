module.exports = (sequelize, DataTypes) => {
  const Program = sequelize.define('Program', {
    exeName: DataTypes.STRING,
    focusTime: DataTypes.BIGINT,
  }, {})

  Program.associate = (models) => {
    Program.hasMany(models.FocusSession)
  }
  
  return Program
}
