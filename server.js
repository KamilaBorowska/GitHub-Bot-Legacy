'use strict'

var format = require('python-format')
var request = require('request')

var port = +process.env.npm_package_config_webhookport
if (!port) {
  console.error("Start the bot using 'npm start'.")
  process.exit(1)
}

var secret = process.env.npm_package_config_secret
if (secret === undefined) {
  console.error("Secret not defined, please use 'npm config set psdevbot:secret value'.")
  process.exit(1)
}

var Showdown = require('./showdown')
var parameters = {}
Object.keys(Showdown.keys).forEach(function (key) {
  parameters[key] = process.env[`npm_package_config_${key}`]
})
var client = new Showdown(parameters)
client.connect()

var allowedAuthLevels = new Set('~#*&@%')

var github = require('githubhook')({
  port: port,
  secret: secret,
  logger: console
})

function shorten (url, callback) {
  function shortenCallback (error, response, body) {
    var shortenedUrl = url
    if (!error && response.headers.location) {
      shortenedUrl = response.headers.location
    }
    callback(shortenedUrl)
  }
  request.post('https://git.io', {form: {url: url}}, shortenCallback)
}

function getRepoName (repo) {
  switch (repo) {
    case 'Pokemon-Showdown':
      return 'server'
    case 'Pokemon-Showdown-Client':
      return 'client'
    case 'Pokemon-Showdown-Dex':
      return 'dex'
    default:
      return repo
  }
}

var escape = require('escape-html')

github.on('push', function push (repo, ref, result) {
  var url = result.compare
  var branch = /[^/]+$/.exec(ref)[0]
  shorten(url, function pushShortened (url) {
    if (branch !== 'master') return
    var messages = []
    var staffMessages = []

    result.commits.forEach(function (commit) {
      var commitMessage = commit.message
      var shortCommit = /.+/.exec(commitMessage)[0]
      if (commitMessage !== shortCommit) {
        shortCommit += '…'
      }
      messages.push(format(
        "[<font color='FF00FF'>{}</font>] <a href=\"{}\"><font color='606060'>{}</font></a> {} <font color='909090'>({})</font>",
        escape(getRepoName(repo)),
        escape(commit.url),
        escape(commit.id.substring(0, 6)),
        escape(shortCommit),
        escape(commit.author.name.split(' ')[0])
      ))
      staffMessages.push(format(
        "[<font color='FF00FF'>{}</font>] <a href=\"{}\">{}</a> <font color='909090'>({})</font>",
        escape(getRepoName(repo)),
        escape(commit.url),
        escape(shortCommit),
        escape(commit.author.name.split(' ')[0])
      ))
    })
    client.report('/addhtmlbox ' + messages.join('<br>'))
    client.reportStaff('/addhtmlbox ' + staffMessages.join('<br>'))
  })
})

var updates = {}

github.on('pull_request', function pullRequest (repo, ref, result) {
  if (gitBans.has(result.sender.login.toLowerCase()) || gitBans.has(result.pull_request.user.login.toLowerCase())) {
    return
  }
  var COOLDOWN = 10 * 60 * 1000
  var requestNumber = result.pull_request.number
  var url = result.pull_request.html_url
  var action = result.action
  if (action === 'synchronize') {
    action = 'updated'
  }
  if (action === 'review_requested') {
    action = 'requested a review for'
  }
  // Nobody cares about labels
  if (action === 'labeled' || action === 'unlabeled') {
    return
  }
  var now = +new Date()
  if (updates[requestNumber] && updates[requestNumber] + COOLDOWN > now) {
    return
  }
  updates[requestNumber] = now
  shorten(url, function pullRequestShortened (url) {
    client.report(format(
      "/addhtmlbox [<font color='FF00FF'>{}</font>] <font color='909090'>{}</font> {} <a href=\"{}\">PR#{}</a>: {}",
      escape(getRepoName(repo)),
      escape(result.sender.login),
      escape(action),
      escape(url),
      escape(requestNumber),
      escape(result.pull_request.title)
    ))
  })
})

var gitBans = new Set()

client.on('message', function (user, message) {
  if (allowedAuthLevels.has(user.charAt(0)) && message.charAt(0) === '.') {
    var parts = message.substring(1).split(' ')
    var command = parts[0]
    var argument = parts.slice(1).join(' ').toLowerCase().trim()
    if (command === 'gitban') {
      if (gitBans.has(argument)) {
        client.report(`/modnote '${argument}' is already banned from being reported`)
        return
      }
      gitBans.add(argument)
      client.report(`/modnote '${argument}' was banned from being reported by this bot`)
    } else if (command === 'gitunban') {
      if (!gitBans.has(argument)) {
        client.report(`/modnote '${argument}' is already allowed to be reported`)
        return
      }
      gitBans.delete(argument)
      client.report(`/modnote '${argument}' was unbanned from being reported by this bot`)
    }
  }
})

github.listen()
