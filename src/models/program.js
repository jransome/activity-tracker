const { Model } = require('objection')
const Session = require('./session')

class Program extends Model {
  static get tableName() {
    return 'programs'
  }

  static get relationMappings() {
    return {
      comments: {
        relation: Model.HasManyRelation,
        modelClass: Session,
        join: {
          from: 'programs.id',
          to: 'sessions.program_id'
        }
      }
    }
  }
}

module.exports = Program