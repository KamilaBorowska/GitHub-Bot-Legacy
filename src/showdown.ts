'use strict'

var MINUTE = 60000

var EventEmitter = require('events')

var WebSocketClient = require('websocket').client

var request = require('request')

function objectHas (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function copySafely (target, configuration, keys) {
  var added = 0
  for (var key in configuration) {
    if (!objectHas(configuration, key)) return
    if (!objectHas(keys, key)) {
      throw new TypeError(`Unrecognized key '${key}'`)
    }
    target[key] = configuration[key]
    added += 1
  }
  if (added !== Object.keys(keys).length) {
    throw new TypeError(`Expected ${keys.size} keys, got ${added}.`)
  }
}

class Showdown extends EventEmitter {
  queue: Promise<void>

  constructor(configuration) {
    super()
    this.queue = Promise.resolve()
    copySafely(this, configuration, Showdown.keys)
  }

  static keys = {
    server: true,
    serverport: true,
    serverid: true,
    nickname: true,
    password: true,
    room: true
  }

  static commands = new Map<string, (s: Showdown, parts: string[]) => void>([
    ['challstr', (s, parts) => s.finalize(parts)],
    ['c:', (s, parts) => s.onChatMessage(parts)]
  ])

  connect() {
    var connection = new WebSocketClient()
    connection.on('connectFailed', this.onConnectionFailure.bind(this))
    connection.on('connect', this.onConnect.bind(this))

    var connectionString = this.getConnectionString()
    connection.connect(connectionString, [])
  }

  getConnectionString() {
    return `ws://${this.server}:${this.serverport}/showdown/websocket`
  }

  onConnectionFailure(error) {
    console.error('Error occured (%s), will connect in a minute', error)
    setTimeout(this.connect.bind(this), MINUTE)
  }

  onConnect(connection) {
    this.connection = connection

    var onConnectionFailure = this.onConnectionFailure.bind(this)
    connection.on('error', onConnectionFailure)
    connection.on('close', onConnectionFailure)
    connection.on('message', this.onMessage.bind(this))
    console.info('Connected to Showdown server')
  }

  onMessage(message) {
    if (message.type !== 'utf8') return
    this.parseMessage(message.utf8Data)
  }

  parseMessage(message: string) {
    console.log(message)
    var parts = message.split('|')
    const handler = Showdown.commands.get(parts[1])
    if (handler) {
      handler(this, parts)
    }
  }

  finalize (parts: string[]) {
    var id = parts[2]
    var str = parts[3]
    var nickname = this.nickname
    var password = this.password
    request.post(
      `https://play.pokemonshowdown.com/~~${this.serverId}/action.php`,
      {
        form: {
          act: 'login',
          challengekeyid: id,
          challenge: str,
          name: nickname,
          pass: password
        }
      },
      (error: unknown, _response: unknown, body: string) => {
        if (error) {
          this.finalize(parts)
          return
        }
        var result = JSON.parse(body.replace(/^]/, ''))
        var assertion = result.assertion
        var command = `/trn ${nickname},0,${assertion}`
        this.report(command)
        this.report('/join ' + this.room)
        this.report('/join staff')
        this.report('/away')
      }
    )
  }

  onChatMessage(parts: string[]) {
    this.emit('message', parts[3], parts.slice(4).join('|'))
  }

  report(message: string) {
    this.queue = this.queue.then(() => {
      this.connection.send(`${this.room}|${message}`.replace(/\n/g, ''))
      return new Promise(resolve => {
        setTimeout(resolve, 500)
      })
    })
  }

  reportStaff(message: string) {
    this.queue = this.queue.then(() => {
      this.connection.send(`staff|${message}`.replace(/\n/g, ''))
      return new Promise(resolve => {
        setTimeout(resolve, 500)
      })
    })
  }
}

module.exports = Showdown
