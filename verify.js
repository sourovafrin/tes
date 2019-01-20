import path from 'path';
import sqlite from 'sqlite';
import { Client } from 'dsteem';
import { Command } from 'discord.js-commando';
import config from '../../config';

const dsteem = new Client(config.NODE);
const dbPromise = Promise.resolve()
  .then(() => sqlite.open(path.join(config.PROJECT_ROOT, 'data/database.sqlite3'), { Promise }))
  .then(db => db.migrate({ force: false, migrationsPath: path.join(config.PROJECT_ROOT, '/migrations') }));

export default class VerifyCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'verify',
      group: 'user',
      memberName: 'verify',
      description: 'Verify user registration.',
      examples: ['verify reazuliqbal'],
      throttling: {
        usages: 2,
        duration: 10,
      },
      guildOnly: true,
      args: [
        {
          key: 'username',
          label: 'STEEM USERNAME',
          prompt: 'Please enter your STEEM username.',
          type: 'string',
        },
      ],
    });
  }

  async run(message, { username }) {
    const db = await dbPromise;
    const user = await db.get('SELECT * FROM users WHERE discordId = ? AND username = ?', [message.author.id, username]);

    if (!user) {
      message.reply('You are not registered.');
    } else {
      const history = await dsteem.database.call('get_account_history', [username, '-1', '100']);

      if (history.some(res => (res[1].op[0] === 'transfer' && res[1].op[1].to === config.STEEM_ACCOUNT && res[1].op[1].memo === user.code))) {
        db.run('UPDATE users SET active = 1 WHERE username = ? AND discordId = ?', [username, message.author.id])
          .then(() => {
            const registerdRole = message.guild.roles.find('name', 'Registered');
            if (registerdRole) {
              message.member.addRole(registerdRole);
            }

            message.reply('Your registration has been successful.');
          })
          .catch(err => console.log(err));
      } else {
        message.reply('We could not verify your registration at this moment.');
      }
    }
  }
}
