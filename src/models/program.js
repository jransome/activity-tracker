module.exports = (sequelize, DataTypes) => {
  const Program = sequelize.define('Program', {
    name: DataTypes.STRING
  }, {})

  Program.associate = (models) => {
    Program.hasMany(models.ProcessSession)
  }
  
  return Program
}
