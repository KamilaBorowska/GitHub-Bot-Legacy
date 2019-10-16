// This is the parser to handle formatting messages to PS 
// or GitHub, depending on which is  called

'use strict'

var escape = require('escape-html')

exports.getRepoName = function (repo) {
    switch (repo) {
        case 'Pokemon-Showdown':
            return 'server'
        case 'Pokemon-Showdown-Client':
            return 'client'
        case 'Pokemon-Showdown-Dex':
            return 'dex'
        default:
            return repo.toLowerCase()
      }
}

exports.formatPR = function (location, repo, author, action, num, title, url) {
    var buff = ''
    repo = this.getRepoName(repo)
    if (location === 'PS') {
        buff = `/addhtmlbox [<font color='FF00FF'>${escape(repo)}</font>] <font color='909090'>${author}</font> ` +
        `${action} <a href=\"${url}\">PR#${num}</a>: ${title}`
        return buff
    } else if (location === 'DISCORD') {
        buff = `[${repo}] ${author} ${action} PR#${num}: ${title} (${url})`
        return buff
    }
}

exports.formatPush = function (location, hash, repo, author, url, message, staff) {
    var buff = ''
    repo = this.getRepoName(repo);
    if (location === 'PS') {
        var formattedRepo = `[<font color='FF00FF'>${h(repoName)}</font>]`
        var formattedUsername = `<font color='909090'>(${h(author)})</font>`
        buff += `${formattedRepo} <a href=\"${escape(url)}\">`
        if (staff) {
            buff += `${escape(url)}</a> ${formattedUsername}`
        } else {
            buff += `<font color='606060'>${escape(hash)}</font></a> ${escape(message)} ${formattedUsername}`
        }
        return buff
    } else if (location === 'DISCORD') {
        buff += `[${repo}] ${hash}: ${message} (By: ${author}, ${url})`
        return buff
    }
}
