export default (sequelize, DataTypes) => {
  const Snapshot = sequelize.define('Snapshot', {
    takenAt: DataTypes.DATE
  }, {})
  Snapshot.associate = (models) => {
    // associations can be defined here
  }
  return Snapshot
}
