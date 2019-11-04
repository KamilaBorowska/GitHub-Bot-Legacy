'use strict'

var discordjs = require('discord.js')
var client = new discordjs.Client()

var configPre = `npm_package_config_`
var config = {
    token: process.env[`${configPre}token`],
    notify: process.env[`${configPre}discordnotify`],
    defaultNotify: process.env[`${configPre}discorddefault`],
}
exports.misConfigured = config.token && (!config.notify && !config.defaultNotify)

if (config.notify) config.notify = new Map(Object.entries(JSON.parse(config.notify)))

var loggedIn = ''

client.on('ready', function() {
    console.log(`Successfully logged in to Discord as ${client.user.tag}`)
    loggedIn = client.user.tag
})

if (config.token) {
    client.login(config.token).then(function() {
        // Do nothing (bot reports above if login was successful)
    }).catch(function(error) {
        // Bot failed to login
        console.log(`Discord - ${error.message}`)
    })
}

exports.report = function (message, repo) {
    if (!loggedIn) return
    var channels = config.notify.get(repo)
    if (channels) {
        for (var chan of channels) {
            var curChan = client.channels.get(chan)
            if (curChan) curChan.send(message)
        }
    } else if (config.defaultNotify) {
        var defaultChannel = client.channels.get(config.defaultNotify)
        if (defaultChannel) defaultChannel.send(message)
    }
}
