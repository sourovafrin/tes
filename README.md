# BDCommunity Discord Bot

STEEM.com.bd Community or [@bdcommunity](https://steemit.com/@bdcommunity) is a discovery, support, and curation project for Bangladeshi STEEM Blockchain users. The community runs a Discord bot using this project for managing the server and giving upvotes to worthy contents.

## Features

- Steem account information
- STEEM and SBD price in multiple currencies
- Report, Ban, Kick abusers
- Clear messages by count
- Request and approval of upvote from the community bot and trail.
- Default commands from Discord.js Commando.

## Usage

`$accountinfo <STEEM USERNAME>`

Shows SP, reputation, post count, voting power, steem and sbd balances, delegation, and profile picture.

`$price <CURRENCIES>`

Returns STEEM and SBD prices in requested currencies. Default is BTC,USD,BDT.

`$request-upvote <STEEMIT CONTENT LINK>`

Make a request for upvote from the community bot and trail by saving the link in a specific channel from which Admins and moderators can approve for upvoting.

`$upvote <STEEMIT CONTENT LINK>`

Upvote content. Can be used by Admins and Moderators but runs internally by approving using `white-check-mark` emoji (✅) in `requests-log` channel.

`$report <MEMBER> <REASON>`

Report specified user to the moderators and saves a report on `abuse-reports` channel.

`$ban <MEMBER> <REASON>`

Ban specified user and saves a log in `actions-log` channel.

`$kick <MEMBER> <REASON>`

Kick specified user and saves a log in `actions-log` channel.

`$clear <NUMBER OF MESSAGES>`

Deletes previous 50 messages if no count is delivered.

## Technology

- Node JS
- SQLite3
- Discord.js
- Discord.js Commando
- dsteem

## Installation

Create a Discord app, make it a bot, and grab it's Token by following this [link](https://discordapp.com/developers/applications/me).

Make these channels (names can be changed in source code) along with your other channels:

- abuse-reports
- requests-log
- actions-log

Also make these roles (can be changed in `src/config.js`) for members:

- Admin
- Moderator
- Explorer
- Creator

Make required changes in `src/config.js` and in `.env.example` then rename it to `.env`. Don't for get to change `BOT_OWNER_ID` to your discord user ID. This will give you admin access to the bot. In production set environment variables with `PM2` or others.

Use `npm start` in development, `npm run build` to compile the source code with Babel, then run `npm run serve` in production.


## Roadmap

This project is in its infancy. I am planning to add more commands and improve existing ones specially to help moderators do their job easily.

## Contributing

When contributing to this repository, please first discuss the change you wish to make via issue or any other method with the (owner) of this repository. But you are free to make your own copy and use it.