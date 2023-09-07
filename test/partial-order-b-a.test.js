const { Server, Client, utils } = require('../src')
const { wait, CoinPrices } = utils

describe('Partial Order: B > A', () => {
  const sourceCoin = 'BTC'
  const targetCoin = 'ETH'

  const sourceAmount = 5
  const targetAmount = 12 * CoinPrices[sourceCoin][targetCoin]

  const amountDiff = targetAmount - sourceAmount * CoinPrices[sourceCoin][targetCoin]

  const server = new Server()

  const clientA = new Client('http://127.0.0.1:30001')
  const clientB = new Client('http://127.0.0.1:40001')

  beforeAll(async () => {
    server.start()
    await wait(3000)
  })

  afterAll(() => {
    server.stop()
    clientA.stop()
    clientB.stop()
  })

  it('should create an order with clientA', async () => {
    const { order } = await clientA.createOrder(sourceCoin, targetCoin, sourceAmount)

    expect(order).toBeDefined()
    expect(order.sourceCoin).toBe(sourceCoin)
    expect(order.targetCoin).toBe(targetCoin)
    expect(order.amount).toBe(sourceAmount)
    expect(order.price).toBeDefined()
    expect(order.price).toBeGreaterThan(0)
  })

  it('should partially fulfill the order with clientB', async () => {
    const { order } = await clientB.createOrder(targetCoin, sourceCoin, targetAmount)

    expect(order).toBeDefined()
    expect(order.sourceCoin).toBe(targetCoin)
    expect(order.targetCoin).toBe(sourceCoin)
    expect(order.amount).toBe(amountDiff)
  })

  it('should exercise the `poll` method to trigger async updates', async () => {
    const resA = await clientA.poll()

    // clientA should have a pending matching order for the full amount
    expect(resA.queue.length).toBe(1)
    expect(resA.queue[0].userId).toBe(clientB.id)
    expect(resA.queue[0].sourceCoin).toBe(targetCoin)
    expect(resA.queue[0].targetCoin).toBe(sourceCoin)
    expect(resA.queue[0].amount).toBe(amountDiff)
    expect(resA.matches.length).toBe(1)
    expect(resA.matches[0].queued.amount).toBe(sourceAmount)

    // clientA should reflect the changes
    expect(clientA.orderBook.orders.length).toBe(1)
    expect(clientA.orderBook.orders[0].sourceCoin).toBe(targetCoin)
    expect(clientA.orderBook.orders[0].targetCoin).toBe(sourceCoin)
    expect(clientA.orderBook.orders[0].amount).toBe(amountDiff)

    // if we poll clientA it should show clear matches, and an item in queue
    const resA2 = await clientA.poll()
    expect(resA2.queue.length).toBe(1)
    expect(resA2.matches.length).toBe(0)

    const resB = await clientB.poll()
    // clientB should see their leftover pending order
    expect(resB.queue.length).toBe(1)
    expect(resB.queue[0].userId).toBe(clientB.id)
    expect(resB.queue[0].sourceCoin).toBe(targetCoin)
    expect(resB.queue[0].targetCoin).toBe(sourceCoin)
    expect(resB.queue[0].amount).toBe(amountDiff)
    // clientB should have no matches
    expect(resB.matches.length).toBe(0)
  })
})
