const CoinPrices = {
  BTC: {
    ETH: 0.1,
    LTC: 0.2
  },
  ETH: {
    BTC: 10,
    LTC: 2
  },
  LTC: {
    BTC: 5,
    ETH: 0.5
  }
}

function uuidV4 () {
  const uuid = new Array(36)
  for (let i = 0; i < 36; i++) {
    uuid[i] = Math.floor(Math.random() * 16)
  }
  uuid[14] = 4 // set bits 12-15 of time-high-and-version to 0100
  uuid[19] = uuid[19] &= ~(1 << 2) // set bit 6 of clock-seq-and-reserved to zero
  uuid[19] = uuid[19] |= 1 << 3 // set bit 7 of clock-seq-and-reserved to one
  uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-'
  return uuid.map((x) => x.toString(16)).join('')
}

function createId (prefix) {
  return `${prefix}-${uuidV4()}`
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

module.exports = {
  CoinPrices,
  createId,
  wait
}
