"use strict"

var MINUTE = 60000

var format = require('python-format')
var WebSocketClient = require('websocket').client

var request = require('request')

function objectHas(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key)
}

function copySafely(target, configuration, keys) {
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
        var message = format("Expected {} keys, got {}.", keys.size, added)
        throw new TypeError(message)
    }
}

function Showdown(configuration) {
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

Showdown.prototype.connect = function connect() {
    var connection = new WebSocketClient
    connection.on('connectFailed', this.onConnectionFailure.bind(this))
    connection.on('connect', this.onConnect.bind(this))

    var connectionString = this.getConnectionString()
    connection.connect(connectionString, [])
}

Showdown.prototype.getConnectionString = function getConnectionString() {
    return format(
        'ws://{}:{}/showdown/websocket',
        this.server,
        this.serverport
    )
}

Showdown.prototype.onConnectionFailure = function onConnectionFailure(error) {
    console.error('Error occured (%s), will connect in a minute', error)
    setTimeout(this.connect.bind(this), MINUTE)
}

Showdown.prototype.onConnect = function onConnect(connection) {
    this.connection = connection

    var onConnectionFailure = this.onConnectionFailure.bind(this)
    connection.on('error', onConnectionFailure)
    connection.on('close', onConnectionFailure)
    connection.on('message', this.onMessage.bind(this))
    console.info('Connected to Showdown server')
}

Showdown.prototype.onMessage = function onMessage(message) {
    if (message.type !== 'utf8') return
    this.parseMessage(message.utf8Data)
}

Showdown.prototype.parseMessage = function parseMessage(message) {
    console.log(message)
    var parts = message.split('|')
    if (parts[1] === 'challstr') {
        this.finalize(parts)
    }
}

Showdown.prototype.finalize = function finalize(parts) {
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
        function finish(error, response, body) {
            var result = JSON.parse(body.replace(/^]/, ""))
            var assertion = result.assertion
            var command = format('|/trn {},0,{}', nickname, assertion)
            this.connection.send(command)
            this.connection.send('|/join ' + this.room)
            this.connection.send('|/away')
        }.bind(this)
    )
}

Showdown.prototype.report = function report(message) {
    this.connection.send(format('{}|{}', this.room, message))
}

module.exports = Showdown
