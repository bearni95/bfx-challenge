const { createId } = require('./utils')

class Order {
  constructor (userId, sourceCoin, targetCoin, price, amount) {
    this.id = createId('order')
    this.userId = userId
    this.sourceCoin = sourceCoin
    this.targetCoin = targetCoin
    this.price = price
    this.amount = amount
  }
}

module.exports = Order
