const { PeerRPCClient } = require('grenache-nodejs-http')
const Link = require('grenache-nodejs-link')

const { createId } = require('./utils')
const OrderBook = require('./OrderBook.class')

class Client {
  constructor (grapeAddress = 'http://127.0.0.1:30001') {
    this.id = createId('user')

    this.orderBook = new OrderBook(this.id)

    this.start(grapeAddress)
  }

  start (grapeAddress) {
    this.link = new Link({
      grape: grapeAddress
    })
    this.link.start()

    this.peer = new PeerRPCClient(this.link, {})
    this.peer.init()
  }

  sendMessage (message) {
    return new Promise((resolve, reject) => {
      this.peer.request('rpc_message', message, { timeout: 10000 }, (err, data) => {
        if (err) {
          reject(err)
        }
        resolve(data)
      })
    })
  }

  sendOrder (order) {
    return this.sendMessage({
      type: 'order',
      payload: order
    })
  }

  async poll () {
    const { queue, matches } = await this.sendMessage({
      payload: {
        userId: this.id
      },
      type: 'poll'
    })

    // append the queue to the orderBook
    queue.forEach((order) => this.orderBook.pushOrder(order))
    // process the matches against the local orderBook
    matches.forEach(({ type, queued, match }) => {
      if (type === 'replace') {
        this.orderBook.cancelOrder(queued.id)
        this.orderBook.pushOrder(match)
      } else if (type === 'update') {
        this.orderBook.cancelOrder(match.id)
        this.orderBook.pushOrder(queued)
      } else {
        this.orderBook.fulfilOrder(queued)
      }
    })

    return { queue, matches }
  }

  async createOrder (sourceCoin, targetCoin, amount) {
    // create the order locally
    if (!amount > this.getBalance(sourceCoin)) {
      throw new Error(`Insufficient balance of ${sourceCoin}`)
    }
    const order = this.orderBook.createOrder(sourceCoin, targetCoin, amount)

    // propagate the order
    const res = await this.sendOrder(order)
    this.orderBook.pushOrder(res.order)
    return { order: res.order, match: res.match }
  }

  stop () {
    this.link.stop()
    this.peer.stop()
  }

  // unimplemented methods
  getBalance (coin) {
    // return balance in that coin
    return 1e10
  }
}

module.exports = Client
