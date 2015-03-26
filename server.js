"use strict"

var format = require('python-format')
var request = require('request')

var port = +process.env.npm_package_config_webhookport
if (!port) {
    console.error("Start the bot using 'npm start'.")
    return
}

var secret = process.env.npm_package_config_secret
if (!secret) {
    console.error("Secret not defined, please use 'npm config set psdevbot:secret value'.")
    return
}

var Showdown = require('./showdown')
var parameters = {}
Object.keys(Showdown.keys).forEach(function (key) {
    parameters[key] = process.env['npm_package_config_' + key]
})
var client = new Showdown(parameters)
client.connect()

var github = require('githubhook')({
    port: port,
    secret: secret,
    logger: console
})

function shorten(url, callback) {
    function shortenCallback(error, response, body) {
        var shortenedUrl = url
        if (!error && response.headers.location) {
            shortenedUrl = response.headers.location
        }
        callback(shortenedUrl)
    }
    request.post('https://git.io', {form: {url: url}}, shortenCallback)
}

function getRepoName(repo) {
    switch (repo) {
    case 'Pokemon-Showdown':
        return 'server'
    case 'Pokemon-Showdown-Client':
        return 'client'
    default:
        return repo
    }
}

var escape = require('escape-html')

github.on('push', function push(repo, ref, result) {
    var url = result.compare
    var branch = /[^/]+$/.exec(ref)[0]
    shorten(url, function pushShortened(url) {
        var messages = []
        var message = result.commits.length === 1 ?
            "[<font color='FF00FF'>{}</font>] <font color='909090'>{}</font> pushed <b>{}</b> new commit to <font color='800080'>{}</font>: <a href=\"{4}\">{4}</a>" :
            "[<font color='FF00FF'>{}</font>] <font color='909090'>{}</font> pushed <b>{}</b> new commits to <font color='800080'>{}</font>: <a href=\"{4}\">{4}</a>"

        messages.push(format(
            message,
            escape(getRepoName(repo)),
            escape(result.pusher.name),
            escape(result.commits.length),
            escape(branch),
            escape(url)
        ))
        result.commits.forEach(function (commit) {
            messages.push(format(
                "<font color='FF00FF'>{}</font>/<font color='800080'>{}</font> <a href=\"{}\"><font color='606060'>{}</font></a> <font color='909090'>{}</font>: {}",
                escape(getRepoName(repo)),
                escape(branch),
                escape(commit.url),
                escape(commit.id.substring(0, 6)),
                escape(commit.author.name),
                escape(/.+/.exec(commit.message)[0])
            ))
        })
        client.report('!htmlbox ' + messages.join("<br>"))
    })
})

github.on('pull_request', function pullRequest(repo, ref, result) {
    var url = result.pull_request.html_url
    var action = result.action
    if (action === 'synchronize') {
        action = 'updated'
    }
    shorten(url, function pullRequestShortened(url) {
        client.report(format(
            "!htmlbox [<font color='FF00FF'>{}</font>] <font color='909090'>{}</font> {} pull request <a href=\"{}\">#{}: {}</a>",
            escape(getRepoName(repo)),
            escape(result.sender.login),
            escape(action),
            escape(url),
            escape(result.pull_request.number),
            escape(result.pull_request.title)
        ))
    })
})

github.listen()
