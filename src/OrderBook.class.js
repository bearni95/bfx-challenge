const Order = require('./Order.class.js')
const { CoinPrices } = require('./utils.js')

class OrderBook {
  constructor (userId) {
    this.userId = userId
    this.orders = []
  }

  createOrder (sourceCoin, targetCoin, amount) {
    const price = CoinPrices[sourceCoin][targetCoin]
    const order = new Order(this.userId, sourceCoin, targetCoin, price, amount)
    this.orders.push(order)
    return order
  }

  cancelOrder (id) {
    this.orders = this.orders.filter((order) => order.id !== id)
  }

  contains (id) {
    return Boolean(this.orders.find((order) => order.id === id))
  }

  fulfilOrder (fulfilledOrder) {
    const order = this.orders.find((order) => order.id === fulfilledOrder.id)

    if (!order) {
      throw new Error(`Order with id ${fulfilledOrder.id} not found`)
    }
    if (order.amount === fulfilledOrder.amount) {
      this.cancelOrder(order.id)
    } else {
      this.pushOrder(fulfilledOrder)
    }
    return order
  }

  pushOrder (order) {
    if (this.orders.find((o) => o.id === order.id)) {
      // if exists, update it
      this.orders = this.orders.map((o) => {
        if (o.id === order.id) {
          return order
        }
        return o
      })
    } else {
      // if not, push it
      this.orders.push(order)
    }
  }
}

module.exports = OrderBook
