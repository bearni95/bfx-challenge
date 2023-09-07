const { Server, Client, utils } = require('../src')
const { wait, CoinPrices } = utils

describe('Partial Order: A > B', () => {
  const sourceCoin = 'BTC'
  const targetCoin = 'ETH'

  const sourceAmount = 12
  const targetAmount = 5 * CoinPrices[sourceCoin][targetCoin]

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
    const { order, match } = await clientB.createOrder(targetCoin, sourceCoin, targetAmount)

    expect(match.id).not.toBe(order.id)
    expect(match.sourceCoin).toBe(order.targetCoin)
    expect(match.targetCoin).toBe(order.sourceCoin)
    expect(match.amount).toBe(sourceAmount - targetAmount)
    expect(match.price).toBe(1 / order.price)
  })

  it('should exercise the `poll` method to trigger async updates', async () => {
    const resA = await clientA.poll()

    // clientA should have a pending matching order for the full amount
    expect(resA.queue.length).toBe(1)
    expect(resA.queue[0].userId).toBe(clientA.id)
    expect(resA.queue[0].sourceCoin).toBe(sourceCoin)
    expect(resA.queue[0].targetCoin).toBe(targetCoin)
    expect(resA.queue[0].amount).toBe(sourceAmount - targetAmount)
    expect(resA.matches.length).toBe(1)
    expect(resA.matches[0].queued.amount).toBe(sourceAmount - targetAmount)

    // clientA should reflect the changes
    expect(clientA.orderBook.orders.length).toBe(1)
    expect(clientA.orderBook.orders[0].sourceCoin).toBe(sourceCoin)
    expect(clientA.orderBook.orders[0].targetCoin).toBe(targetCoin)
    expect(clientA.orderBook.orders[0].amount).toBe(sourceAmount - targetAmount)

    // if we poll clientA it should show clear matches, and an item in queue
    const resA2 = await clientA.poll()
    expect(resA2.queue.length).toBe(1)
    expect(resA2.matches.length).toBe(0)

    const resB = await clientB.poll()
    // clientB should see their leftover pending order
    expect(resB.queue.length).toBe(1)
    expect(resB.queue[0].userId).toBe(clientA.id)
    expect(resB.queue[0].sourceCoin).toBe(sourceCoin)
    expect(resB.queue[0].targetCoin).toBe(targetCoin)
    expect(resB.queue[0].amount).toBe(sourceAmount - targetAmount)
    // clientB should have no matches
    expect(resB.matches.length).toBe(0)
  })
})
