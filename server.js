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

github.on('push', function push(repo, ref, result) {
    var url = result.compare
    var branch = /[^/]+$/.exec(ref)[0]
    shorten(url, function pushShortened(url) {
        var message = result.commits.length === 1 ?
            "[{}] {} pushed **{}** new commit to {}: {}" :
            "[{}] {} pushed **{}** new commits to {}: {}"

        client.report(format(
            message,
            repo,
            result.pusher.name,
            result.commits.length,
            branch,
            url
        ))
        result.commits.forEach(function (commit) {
            client.report(format(
                "{}/{} {} {}: {}",
                repo,
                branch,
                commit.id.substring(0, 8),
                commit.author.name,
                /.+/.exec(commit.message)[0]
            ))
        })
    })
})

github.on('pull_request', function pullRequest(repo, ref, result) {
    var url = result.pull_request.html_url
    shorten(url, function pullRequestShortened(url) {
        client.report(format(
            "[{}] {} {} pull request #{}: {} {}",
            repo,
            result.pull_request.user.login,
            result.action,
            result.pull_request.number,
            result.pull_request.title,
            url
        ))
    })
})

github.listen()
