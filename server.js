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

var escape = require('escape-html')

github.on('push', function push(repo, ref, result) {
    var url = result.compare
    var branch = /[^/]+$/.exec(ref)[0]
    shorten(url, function pushShortened(url) {
        var messages = []
        var message = result.commits.length === 1 ?
            "[{}] <font color='C0C0C0'>{}</font> pushed <b>{}</b> new commit to <font color='800080'>{}</font>: <a href='{4}'>{4}</a>" :
            "[{}] <font color='C0C0C0'>{}</font> pushed <b>{}</b> new commits to <font color='800080'>{}</font>: <a href='{4}'>{4}</a>"

        messages.push(format(
            message,
            escape(repo),
            escape(result.pusher.name),
            escape(result.commits.length),
            escape(branch),
            escape(url)
        ))
        result.commits.forEach(function (commit) {
            messages.push(format(
                "{}/<font color='800080'>{}</font> <font color='A0A0A0'>{}</font> <font color='C0C0C0'>{}</font>: {}",
                escape(repo),
                escape(branch),
                escape(commit.id.substring(0, 8)),
                escape(commit.author.name),
                escape(/.+/.exec(commit.message)[0])
            ))
        })
        client.report('!htmlbox ' + messages.join("<br>"))
    })
})

github.on('pull_request', function pullRequest(repo, ref, result) {
    var url = result.pull_request.html_url
    shorten(url, function pullRequestShortened(url) {
        client.report(format(
            "!htmlbox [<font color='FFC0CB'>{}</font>] <font color='C0C0C0'>{}</font> {} pull request #{}: {} {}",
            escape(repo),
            escape(result.pull_request.user.login),
            escape(result.action),
            escape(result.pull_request.number),
            escape(result.pull_request.title),
            escape(url)
        ))
    })
})

github.listen()
