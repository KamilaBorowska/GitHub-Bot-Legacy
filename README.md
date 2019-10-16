GitHub Bot
==========

This bot receives commit data from GitHub, and posts in the Showdown chat, with the option of a Discord server.

It can be configured using `npm config set psdevbot:PROPERTY_NAME`. There are
properties that can be configured for a bot.

-   `nickname` - specifies nickname used for the bot on Showdown
-   `password` - specifies password of given account
-   `room` - specifies room to join
-   `secret` - secret specified during webhook creation. To generate one, use
    `ruby -rsecurerandom -e 'puts SecureRandom.hex(20)'` command.
-   `webhookport` - port on which bot listens (default 3420)
-   `server` - server address (default sim.smogon.com)
-   `serverport` - server port (default 8000)
-   `serverid` - server identifier used for logins (default showdown)
-   `token` - token used to login to discord


To set repository to trigger bot, access settings panel, pick "Webhooks
& Services", select "Add webhook", set payload URL to
`http://bot-hosting-url.example:3420/github/callback`, leave content type as
`application/json`, set secret to specified value, and pick "Push" and
"Pull Request" events as events to react to.

To run the bot, use `npm start`.
