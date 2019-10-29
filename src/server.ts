'use strict'

import * as request from 'request'
import { Response } from 'request'
import * as h from 'escape-html'
import * as usernames from './usernames.json'
import * as parser from './parser.js'

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
var showdownClient = new Showdown(parameters)
showdownClient.connect()

var discord = require('./discord')

var allowedAuthLevels = new Set('~#*&@%')

var github = require('githubhook')({
  port: port,
  secret: secret,
  logger: console
})

function shorten (url: string) {
  return new Promise(function (resolve, reject) {
    function shortenCallback (error: unknown, response: Response) {
      var shortenedUrl = url
      if (!error && response.headers.location) {
        shortenedUrl = response.headers.location
      }
      resolve(shortenedUrl)
    }
    request.post('https://git.io', {form: {url: url}}, shortenCallback)
  })
}

const reposToReportInStaff = new Set(['Pokemon-Showdown', 'Pokemon-Showdown-Client', 'Pokemon-Showdown-Dex'])

// Name can either be a login (for pull_request) or the commit author's name (for push).
// If we can't find the name in our username's map we want to return the login as is
// (logins can't contain spaces) or the author's first name part.
function toUsername (name: string) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return usernames[id] || name.split(' ')[0]
}

github.on('push', function push (repo, ref, result) {
  var branch = /[^/]+$/.exec(ref)[0]
  if (branch !== 'master') return
  var messagesPS: string[] = []
  var messagesDiscord: string[] = []
  var staffMessages: string[] = []

  Promise.all(result.commits.map(async commit => {
      commit.url = await shorten(commit.url)

      var commitMessage = commit.message
      var shortCommit = /.+/.exec(commitMessage)[0]
      if (commitMessage !== shortCommit) {
        shortCommit += '…'
      }
      // result.sender.login here is the login of user which performed the push,
      // not the original author of the commit. We don't have the GitHub login for
      // the user, the best we have for attribution is the commit's author's name.
      var username = toUsername(commit.author.name)
      const id = commit.id.substring(0, 6)
      messagesPS.push(parser.formatPush('PS', id, repo, username, commit.url, shortCommit))
      staffMessages.push(parser.formatPush('PS', id, repo, username, commit.url, shortCommit, true))
      messagesDiscord.push(parser.formatPush('DISCORD', id, repo, username, commit.url, shortCommit));
  })).then(function () {
    showdownClient.report('/addhtmlbox ' + messagesPS.join('<br>'))
    discord.report(messagesDiscord.join('\n'), repo)
    if (reposToReportInStaff.has(repo)) showdownClient.reportStaff('/addhtmlbox ' + staffMessages.join('<br>'))
  })
})


var updates = {}

github.on('pull_request', async function pullRequest (repo, ref, result) {
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

  url = await shorten(url);
  const userName = toUsername(result.sender.login)
  const title = result.pull_request.title
  const ps = parser.formatPR('PS', repo, userName, action, requestNumber, title, url)
  const dis = parser.formatPR('DISCORD', repo, userName, action, requestNumber, title, url);
  showdownClient.report(ps)
  discord.report(dis, repo)
})

var gitBans = new Set()

showdownClient.on('message', function (user, message) {
  if (allowedAuthLevels.has(user.charAt(0)) && message.charAt(0) === '.') {
    var parts = message.substring(1).split(' ')
    var command = parts[0]
    var argument = parts.slice(1).join(' ').toLowerCase().trim()
    if (command === 'gitban') {
      if (gitBans.has(argument)) {
        showdownClient.report(`/modnote '${argument}' is already banned from being reported`)
        return
      }
      gitBans.add(argument)
      showdownClient.report(`/modnote '${argument}' was banned from being reported by this bot`)
    } else if (command === 'gitunban') {
      if (!gitBans.has(argument)) {
        showdownClient.report(`/modnote '${argument}' is already allowed to be reported`)
        return
      }
      gitBans.delete(argument)
      showdownClient.report(`/modnote '${argument}' was unbanned from being reported by this bot`)
    }
  }
})

github.listen()
