const cds = require('@sap/cds')

module.exports = class HelloService extends cds.ApplicationService {
  init () {
    this.on('hello', req => {
      const input = typeof req?.data?.name === 'string' ? req.data.name.trim() : ''
      const name = input || 'world'
      return `Hello, ${name}!`
    })

    return super.init()
  }
}
