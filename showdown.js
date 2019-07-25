'use strict'

var MINUTE = 60000

var EventEmitter = require('events')

var format = require('python-format')
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
      throw new TypeError(format("Unrecognized key '{}'", key))
    }
    target[key] = configuration[key]
    added += 1
  }
  if (added !== Object.keys(keys).length) {
    var message = format('Expected {} keys, got {}.', keys.size, added)
    throw new TypeError(message)
  }
}

function Showdown (configuration) {
  this.queue = Promise.resolve()
  copySafely(this, configuration, Showdown.keys)
}

Showdown.keys = {
  server: true,
  serverport: true,
  serverid: true,
  nickname: true,
  password: true,
  room: true
}

Showdown.commands = new Map([
  ['challstr', 'finalize'],
  ['c:', 'onChatMessage']
])

Showdown.prototype = new EventEmitter()

Showdown.prototype.connect = function connect () {
  var connection = new WebSocketClient()
  connection.on('connectFailed', this.onConnectionFailure.bind(this))
  connection.on('connect', this.onConnect.bind(this))

  var connectionString = this.getConnectionString()
  connection.connect(connectionString, [])
}

Showdown.prototype.getConnectionString = function getConnectionString () {
  return format(
    'ws://{}:{}/showdown/websocket',
    this.server,
    this.serverport
  )
}

Showdown.prototype.onConnectionFailure = function onConnectionFailure (error) {
  console.error('Error occured (%s), will connect in a minute', error)
  setTimeout(this.connect.bind(this), MINUTE)
}

Showdown.prototype.onConnect = function onConnect (connection) {
  this.connection = connection

  var onConnectionFailure = this.onConnectionFailure.bind(this)
  connection.on('error', onConnectionFailure)
  connection.on('close', onConnectionFailure)
  connection.on('message', this.onMessage.bind(this))
  console.info('Connected to Showdown server')
}

Showdown.prototype.onMessage = function onMessage (message) {
  if (message.type !== 'utf8') return
  this.parseMessage(message.utf8Data)
}

Showdown.prototype.parseMessage = function parseMessage (message) {
  console.log(message)
  var parts = message.split('|')
  if (Showdown.commands.has(parts[1])) {
    this[Showdown.commands.get(parts[1])](parts)
  }
}

Showdown.prototype.finalize = function finalize (parts) {
  var id = parts[2]
  var str = parts[3]
  var nickname = this.nickname
  var password = this.password
  request.post(
    format('https://play.pokemonshowdown.com/~~{}/action.php', this.serverid),
    {
      form: {
        act: 'login',
        challengekeyid: id,
        challenge: str,
        name: nickname,
        pass: password
      }
    },
    function finish (error, response, body) {
      if (error) {
        this.finalize(parts)
        return
      }
      var result = JSON.parse(body.replace(/^]/, ''))
      var assertion = result.assertion
      var command = format('/trn {},0,{}', nickname, assertion)
      this.report(command)
      this.report('/join ' + this.room)
      this.report('/join staff')
      this.report('/away')
    }.bind(this)
  )
}

Showdown.prototype.onChatMessage = function onChatMessage (parts) {
  this.emit('message', parts[3], parts.slice(4).join('|'))
}

Showdown.prototype.report = function report (message) {
  this.queue = this.queue.then(() => {
    this.connection.send(`${this.room}|${message}`.replace(/\n/g, ''))
    return new Promise(resolve => {
      setTimeout(resolve, 500)
    })
  })
}

Showdown.prototype.reportStaff = function report (message) {
  this.queue = this.queue.then(() => {
    this.connection.send(`staff|${message}`.replace(/\n/g, ''))
    return new Promise(resolve => {
      setTimeout(resolve, 500)
    })
  })
}

module.exports = Showdown
