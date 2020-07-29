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
    var url = `https://play.pokemonshowdown.com/~~${this.serverid}/action.php`
    const getCallback = (mapper: (body: string) => string) => {
      return (error: unknown, _response: unknown, body: string) => {
        if (error) {
          this.finalize(parts)
          return
        }
        const assertion = mapper(body)
        var command = `trn ${nickname},0,${assertion}`
        this.globalCommand(command)
        this.globalCommand('join ' + this.room)
        this.globalCommand('join staff')
        this.globalCommand('away')
      }
    }
    if (password) {
      request.post(
        url,
        {
          form: {
            act: 'login',
            challengekeyid: id,
            challenge: str,
            name: nickname,
            pass: password
          },
        },
        getCallback(body => JSON.parse(body.replace(/^]/, '')).assertion)
      )
    } else {
      request.post(
        url,
        {
          form: {
            act: 'getassertion',
            challstr: `${id}|${str}`,
            userid: nickname,
          },
        },
        getCallback(body => body)
      )
    }
  }

  onChatMessage(parts: string[]) {
    this.emit('message', parts[3], parts.slice(4).join('|'))
  }

  globalCommand(command: string) {
    this._send(`|/${command}`)
  }

  report(message: string) {
    this._send(`${this.room}|${message}`.replace(/\n/g, ''))
  }

  reportStaff(message: string) {
    this._send(`staff|${message}`.replace(/\n/g, ''))
  }

  private _send(message: string) {
    this.queue = this.queue.then(() => {
      this.connection.send(message)
      return new Promise(resolve => {
        setTimeout(resolve, 500)
      })
    })
  }
}

module.exports = Showdown
