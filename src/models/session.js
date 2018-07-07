const { Model } = require('objection')
const Program = require('./program')

class Session extends Model {
  static get tableName() {
    return 'sessions'
  }

  static get relationMappings() {
    return {
      comments: {
        relation: Model.BelongsToOneRelation,
        modelClass: Program,
        join: {
          from: 'sessions.program_id',
          to: 'program.id'
        }
      }
    }
  }
}

module.exports = Session