'use strict'

const discordjs = require('discord.js')
const getRepo = require('./parser').getRepoName

var client = new discordjs.Client()
var token = process.env[`npm_package_config_token`]

var loggedIn = false;
if (token) client.login(token).then(loggedIn = true).catch(console.error);
if (!loggedIn) return;

client.on('ready', function() {
    console.log('Successfully connected to Discord');
})

var SIM_DEV = client.channels.get('630845310033330206') // #sim-dev
var OTHER_DEV = client.channels.get('630839273070788619') // #other-dev

exports.report = function (message, repo) {
    repo = getRepo(repo)
    if (repo === 'server' || repo === 'client' || repo === 'dex') {
        SIM_DEV.send(message)
    } else {
        OTHER_DEV.send(message)
    }
}
