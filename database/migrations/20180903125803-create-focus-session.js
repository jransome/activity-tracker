'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('FocusSessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ProgramId: {
        type: Sequelize.INTEGER,
        references: {
          allowNull: false,
          model: 'Programs', 
          key: 'id', 
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      pid: {
        type: Sequelize.INTEGER
      },
      exeName: {
        type: Sequelize.STRING
      },
      startTime: {
        type: Sequelize.DATE
      },
      duration: {
        type: Sequelize.BIGINT.UNSIGNED
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('FocusSessions')
  }
}