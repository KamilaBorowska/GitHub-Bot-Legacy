'use strict'

const discordjs = require('discord.js')
const getRepo = require('./parser').getRepoName

var client = new discordjs.Client()
var token = process.env[`npm_package_config_token`]
var notify = process.env[`npm_package_config_discordnotify`]
var defaultNotify = process.env[`npm_package_config_discorddefault`]

if (notify) notify = JSON.parse(notify)

if (token) client.login(token);

var loggedIn = false

client.on('ready', function() {
    console.log('Successfully connected to Discord');
    loggedIn = true
})

var noLoginWarning = false
var noChanSetWarning = false

exports.report = function (message, repo) {
    if (!loggedIn && !noLoginWarning) {
        console.log('A webhook was  recieved and attempted to send to Discord, but the bot is not logged in to Discord.')
        noLoginWarning = true
        return;
    }
    if (!notify && !noChanSetWarning) {
        console.log('A webhook was recived and attempted to send to Discord, but no channels were set to be notified to Discord.')
        noChanSetWarning = true
        return;
    }
    repo = getRepo(repo)
    var channels = notify[repo];
    if (channels.length) {
        for (let chan of channels) {
            var curChan = client.channels.get(chan)
            if (curChan) curChan.send(message)
        })
    } else if (defaultNotify) {
        var defaultChannel = client.channels.get(defaultNotify)
        if (defaultChannel) defaultChannel.send(message)
    }
}
