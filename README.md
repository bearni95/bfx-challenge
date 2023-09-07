# BFX Challenge

## Requirements
- [x] Code in Javascript
- [x] Use Grenache for communication between nodes
- [x] Simple order matching engine
- [x] You don't need to create a UI or HTTP API

## How to run
Ensure that you have Grenache installed:
```
npm i -g grenache-grape
```

And that you have two nodes running:
```
grape --dp 20001 --aph 30001 --bn '127.0.0.1:20002'
grape --dp 20002 --aph 40001 --bn '127.0.0.1:20001'
```

Then you can exercise the code found on the [test folder](test) by running:
```
npm run test
```

## The code

### Server
The code for the server can be found in [src/Server.class.js](src/Server.class.js)

A server instance can be started with:
```javascript
const { Server } = require('src')

const server = new Server()
server.start()

```

Once a server instance is running, clients can connect to it, and the server will start to broadcast their order book actions to all connected clients.

### Client
Similarly, the code for the client can be found in [src/Client.class.js](src/Client.class.js)

A client instance can be started with:
```javascript
const { Client } = require('src')

const client = new Client()

```

In order to create and propagate an order the client must call the `createOrder` async method:
```javascript
    const order = await clientB.createOrder(
        sourceCoin,
        targetCoin,
        amount
    )

/* order = {
        id: 'order-88b2...44ee',
        userId: 'user-926b...7a96',
        sourceCoin: 'ETH',
        targetCoin: 'BTC',
        price: 10,
        amount: 1.2000000000000002
      }
*/
```

The server will automatically propagate the new orders to the clients via polling (`client.poll()`), which updates the local status on each client instance.

When a new order would fill an existing order, the server will automatically close the existing order and create a new one with the remaining amount, if any. If the order perfectly fulfills an existing order, the existing order will be closed and no new order will be created.

#### OrderBook
The code for the order book can be found in [src/OrderBook.class.js](src/OrderBook.class.js)

The order book is a simple class that holds the current state of the order book, and provides methods to update it locally.

#### Order
The code for the order can be found in [src/Order.class.js](src/Order.class.js)

The order is a simple class that holds the current state of an order.
