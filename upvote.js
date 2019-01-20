import path from 'path';
import url from 'url';
import Promise from 'bluebird';
import sqlite from 'sqlite';
import { Command } from 'discord.js-commando';
import { Client, PrivateKey } from 'dsteem';
import { doComment } from '../../utils';
import config from '../../config';

const dsteem = new Client(config.NODE);

const dbPromise = Promise.resolve()
  .then(() => sqlite.open(path.join(config.PROJECT_ROOT, 'data/database.sqlite3'), { Promise }))
  .then(db => db.migrate({ force: false, migrationsPath: path.join(config.PROJECT_ROOT, '/migrations') }));

export default class UpvoteCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'upvote',
      group: 'steem',
      memberName: 'upvote',
      description: 'Upvote steemit.com contents.',
      examples: ['upvote https://steemit.com/utopian-io/@reazuliqbal/mtasks-now-uses-steemconnect-for-escrow'],
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
        },
      ],
      argsPromptLimit: 0,
    });
  }

  hasPermission(message) {
    if (!message.member.roles.some(role => config.ALLOWED_UPVOTE_ROLES.includes(role.name))) {
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

    if (account.voting_power <= config.VP_LIMIT) {
      return message.reply('the bot needs to regain it\'s voting power. Please try again later.');
    }

    return dsteem.broadcast.vote({
      voter: config.STEEM_ACCOUNT,
      author,
      permlink,
      weight: config.VOTING_WEIGHT,
    }, PrivateKey.from(config.POSTING_WIF))
      .then(() => {
        doComment(author, permlink);

        db.run('INSERT OR REPLACE INTO upvotes (user, link) VALUES (?, ?)', [author, contentURL.href]);
        message.reply(`successfully upvoted ${contentURL.href}.`);
      })
      .catch(() => {
        message.reply(`sorry, we could not upvote ${contentURL.href} at this moment.`);
      });
  }
}
