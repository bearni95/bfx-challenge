const { Server, Client, utils } = require('../src')
const { wait, CoinPrices } = utils

describe('FullOrder', () => {
  const sourceCoin = 'BTC'
  const targetCoin = 'ETH'
  const sourceAmount = 12
  const targetAmount = sourceAmount * CoinPrices[sourceCoin][targetCoin]

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

  it('should poll clientA and ensure it contains the right data', async () => {
    await clientA.poll()
  })

  it('should totally fulfill the order with clientB', async () => {
    const { order } = await clientB.createOrder(targetCoin, sourceCoin, targetAmount)

    expect(order).toBeDefined()
    expect(order.sourceCoin).toBe(targetCoin)
    expect(order.targetCoin).toBe(sourceCoin)
    expect(order.amount).toBe(targetAmount)
  })

  it('should exercise the `poll` method to trigger async updates', async () => {
    // await clientB.poll()
    const resA = await clientA.poll()

    // clientA should have a pending matching order for the full amount
    expect(resA.queue.length).toBe(0)
    expect(resA.matches.length).toBe(1)
    expect(resA.matches[0].queued.amount).toBe(sourceAmount)

    // if we poll clientA it should show clear
    const resA2 = await clientA.poll()
    expect(resA2.queue.length).toBe(0)
    expect(resA2.matches.length).toBe(0)

    // clientB should have no pending orders

    const resB = await clientB.poll()
    expect(resB.queue.length).toBe(0)
    expect(resB.matches.length).toBe(0)
  })
})
