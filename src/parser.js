// This is the parser to handle formatting messages to PS 
// or GitHub, depending on which is  called

'use strict'

var escape = require('escape-html')

function getRepoName (repo) {
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
exports.getRepoName = getRepoName

exports.showdown = {
    pullReq(repo, author, action, num, title, url) {
        repo = getRepoName(repo)
        var buff = `/addhtmlbox [<font color='FF00FF'>${escape(repo)}</font>] <font color='909090'>${author}</font> ` +
        `${action} <a href=\"${url}\">PR#${num}</a>: ${title}`
        return buff
    },
    push(hash, repo, author, url, message, staff) {
        repo = getRepoName(repo)
        var buff = '';
        var formattedRepo = `[<font color='FF00FF'>${escape(repo)}</font>]`
        var formattedUsername = `<font color='909090'>(${escape(author)})</font>`
        buff += `${formattedRepo} <a href=\"${escape(url)}\">`
        if (staff) {
            buff += `${escape(url)}</a> ${formattedUsername}`
        } else {
            buff += `<font color='606060'>${escape(hash)}</font></a> ${escape(message)} ${formattedUsername}`
        }
        return buff
    }
}

exports.discord = {
    pullReq(repo, author, action, num, title, url) {
        repo = getRepoName(repo)
        var buff = `[${repo}] ${author} ${action} PR#${num}: ${title} (${url})`
        return buff
    },
    push(hash, repo, author, url, message) {
        repo = getRepoName(repo)
        var buff = `[${repo}] ${hash}: ${message} (By: ${author}, ${url})`
        return buff
    }
}
