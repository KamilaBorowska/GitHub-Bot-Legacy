'use strict'

const discordjs = require('discord.js')
const getRepo = require('./parser').getRepoName

var client = new discordjs.Client()
var token = process.env[`npm_package_config_token`]
var notify = process.env[`npm_package_config_discordnotify`]
var default = process.env[`npm_package_config_discorddefault`]

if (!notify) return;
notify = JSON.parse(notify)

if (token) {
    client.login(token);
}

var loggedIn = false;

client.on('ready', function() {
    console.log('Successfully connected to Discord');
    loggedIn = true;
})

if (!loggedIn) console.log('The bot has not successfully logged in to Discord.')

exports.report = function (message, repo) {
    if (!notify || !loggedIn) return;
    repo = getRepo(repo)
    var channels = notify[repo];
    if (channels.length) {
        channels.forEach(function(chan) {
            var curChan = client.channels.get(chan)
            if (curChan) curChan.send(message)
        })
    } else if (default) {
        var defaultChannel = client.channels.get(default)
        if (defaultChannel) defaultChannel.send(message)
    }
}
