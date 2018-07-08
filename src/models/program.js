module.exports = (sequelize, DataTypes) => {
  const Program = sequelize.define('Program', {
    name: DataTypes.STRING
  }, {})
  Program.associate = function (models) {
    // associations can be defined here
  }
  return Program
}
