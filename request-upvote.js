import path from 'path';
import url from 'url';
import Promise from 'bluebird';
import sqlite from 'sqlite';
import { Command } from 'discord.js-commando';
import { Client } from 'dsteem';
import { getUnixTime } from '../../utils';
import config from '../../config';

const dsteem = new Client(config.NODE);

const dbPromise = Promise.resolve()
  .then(() => sqlite.open(path.join(config.PROJECT_ROOT, 'data/database.sqlite3'), { Promise }))
  .then(db => db.migrate({ force: false, migrationsPath: path.join(config.PROJECT_ROOT, '/migrations') }));

export default class RequestUpvoteCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'request-upvote',
      group: 'steem',
      memberName: 'request-upvote',
      description: 'Request upvote from community account and trail.',
      examples: ['request-upvote https://steemit.com/utopian-io/@reazuliqbal/mtasks-now-uses-steemconnect-for-escrow'],
      throttling: {
        usages: 2,
        duration: 10,
      },
      guildOnly: true,
      args: [
        {
          key: 'steemUrl',
          label: 'STEEMIT POST LINK',
          prompt: 'Please enter steemit.com post URL.',
          type: 'string',
          validate: (steemUrl) => {
            const sourceUrl = url.parse(steemUrl);
            if (sourceUrl.hostname !== 'steemit.com') {
              return 'we could only upvote steemit.com posts.';
            }
            return true;
          },
        },
      ],
      argsPromptLimit: 0,
    });
  }

  hasPermission(message) {
    if (!message.member.roles
      .some(role => config.ALLOWED_UPVOTE_REQUEST_ROLES.includes(role.name))) {
      return 'you do not have required permission to use this command!';
    }
    return true;
  }

  async run(message, { steemUrl }) {
    const db = await dbPromise;
    const contentURL = url.parse(steemUrl);
    const [permlink, authorWithAt] = contentURL.path.split('/').reverse();
    const author = authorWithAt.slice(1);

    const [account] = await dsteem.database.getAccounts([config.STEEM_ACCOUNT]);
    const content = await dsteem.database.call('get_content', [author, permlink]);

    if (account.voting_power <= config.VP_LIMIT) {
      return message.reply('the bot needs to regain it\'s voting power. Please try again later.');
    }

    if (content.active_votes.some(votes => [config.STEEM_ACCOUNT].includes(votes.voter))) {
      return message.reply('we already upvoted this content.');
    }

    if (content.depth !== 0 && content.root_author !== author) {
      return message.reply('sorry, we do not upvote comment.');
    }

    const date = new Date();
    const twelveHoursAgo = getUnixTime(new Date(date.setHours(date.getHours() - 12)));

    const query = `SELECT COUNT(*) as count FROM upvotes WHERE user = ? AND createdAt > datetime(${twelveHoursAgo}, 'unixepoch', 'localtime')`;
    const result = await db.get(query, author);

    if (result.count > 0) {
      return message.reply('please wait 12 hours before requesting upvote.');
    }

    const requestChannel = await message.guild.channels.find('name', 'requests-log');
    if (!requestChannel) {
      return message.channel.send('Couldn\'t find actions log channel.');
    }
    return requestChannel.send(`Upvote requested by ${message.author}. URL: ${steemUrl}`);
  }
}
