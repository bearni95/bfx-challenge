const { PeerRPCServer } = require('grenache-nodejs-http')
const Link = require('grenache-nodejs-link')

class Server {
  constructor () {
    this.queue = []
    this.matchQueue = []
  }

  removeFromQueue (orderId) {
    this.queue = this.queue.filter((order) => order.id !== orderId)
  }

  checkMatchingOrders (order) {
    let match
    let type
    this.queue.forEach((queuedOrder, i) => {
      if (
        queuedOrder.sourceCoin === order.targetCoin &&
                queuedOrder.targetCoin === order.sourceCoin &&
                queuedOrder.price === 1 / order.price
      ) {
        // orders match!

        const queuedAmount = queuedOrder.amount * queuedOrder.price
        const orderAmount = order.amount

        // check if order completely fulfils queuedOrder
        if (queuedAmount === orderAmount) {
          match = queuedOrder
          this.removeFromQueue(queuedOrder.id)
          type = 'full'
        }

        // if partial fulfil, update orders
        if (queuedAmount > orderAmount) {
          // order.amount -= orderAmount
          queuedOrder.amount -= orderAmount
          this.queue[i] = queuedOrder
          match = queuedOrder
          type = 'update'
        }

        if (queuedAmount < orderAmount) {
          order.amount -= queuedAmount
          this.removeFromQueue(queuedOrder.id)
          type = 'replace'
        }

        // push the matches to their queue for async polling
        this.matchQueue.push({
          type,
          queued: queuedOrder,
          match: order
        })

        // interrupt the foreach
        return false
      }
    })

    if (match === undefined) {
      this.queue.push(order)
    }

    return { match, type }
  }

  start () {
    const self = this
    this.link = new Link({
      grape: 'http://127.0.0.1:30001'
    })
    this.link.start()

    this.peer = new PeerRPCServer(this.link, {
      timeout: 300000
    })
    this.peer.init()

    this.port = 9979
    this.service = this.peer.transport('server')
    this.service.listen(this.port)

    this.service.on('request', (rid, key, message, handler) => {
      if (message.type === 'order') {
        // check if user has enough funds
        if (
          message.payload.amount >
                    self.getBalanceForUser(message.payload.sourceCoin, message.payload.userId)
        ) {
          handler.reply(null, {
            error: `Insufficient funds for ${message.payload.sourceCoin}`
          })
        }

        const { match, type } = self.checkMatchingOrders(message.payload)
        handler.reply(null, { type, match, order: message.payload })
      } else if (message.type === 'poll') {
        // get matches from matchQueue
        const matches = self.matchQueue.filter(
          ({ queued }) => queued.userId === message.payload.userId
        )
        // remove matches from matchQueue
        self.matchQueue = self.matchQueue.filter((match) => matches.indexOf(match) === -1)
        handler.reply(null, {
          type: 'poll',
          queue: self.queue,
          matches
        })
      } else {
        handler.reply(null, { error: `Unknown message type ${message.type}` })
      }
    })
    this.intervalId = setInterval(function () {
      self.link.announce('rpc_message', self.port, {})
    }, 1000)
  }

  stop () {
    clearInterval(this.intervalId)
    this.link.stop()
    this.peer.stop()
    this.service.stop()
  }

  // unimplemented methods
  getBalanceForUser (coin, userId) {
    // return balance in that coin
    return 1e10
  }
}

module.exports = Server
