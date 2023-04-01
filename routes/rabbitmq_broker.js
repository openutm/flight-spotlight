require('dotenv').config()
const amqp = require('amqplib')
const _ = require('lodash')
class MessageBroker {
    constructor() {
        this.queues = {}
    }

    async init () {
        this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost')
        this.channel = await this.connection.createChannel()
        return this
    }

    async createEx ({ name, type, durable = true }) {
        if (!this.connection) await this.init()
        await this.channel.assertExchange(name, type, { durable })
        this.exchange = name
        return this
    }

    /**
     * Send message to an exchange
     * @param {Object} - object defining exchange and routingKey
     * @param {Object} msg Message as Buffer
     */
    async publish ({ ex, routingKey }, msg) {
        const queue = `${ex}.${routingKey}`
        await this.channel.assertQueue(queue, { durable: true })
        this.channel.bindQueue(queue, ex, routingKey)
        this.channel.publish(ex, routingKey, Buffer.from(msg))
    }

    /**
     * @param {Object} - object defining queue name and bindingKey
     * @param {Function} handler Handler that will be invoked with given message and acknowledge function (msg, ack)
     */
    async subscribe ({ exchange, bindingKey }, handler) {
        const queue = `${exchange}.${bindingKey}`
        if (!this.connection) {
            await this.init()
        }
        if (this.queues[queue]) {
            const existingHandler = _.find(this.queues[queue], h => h === handler)
            if (existingHandler) {
                return () => this.unsubscribe(queue, existingHandler)
            }
            this.queues[queue].push(handler)
            return () => this.unsubscribe(queue, handler)
        }

        await this.channel.assertQueue(queue, { durable: true })
        this.channel.bindQueue(queue, exchange, bindingKey)
        this.queues[queue] = [handler]
        this.channel.consume(
            queue,
            async (msg) => {
                const ack = _.once(() => this.channel.ack(msg))
                this.queues[queue].forEach(h => h(msg, ack))
            }
        )
        return () => this.unsubscribe(queue, handler)
    }

    async unsubscribe (queue, handler) {
        _.pull(this.queues[queue], handler)
    }
}

module.exports = MessageBroker
