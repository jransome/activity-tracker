const originalDate = Date

const stubDate = (fixedDate) => {
  Date = class extends Date {
    constructor() {
      super()
      return fixedDate
    }
  }
}

const restoreDate = () => {
  Date = originalDate
}

export default {
  stubDate,
  restoreDate
}
