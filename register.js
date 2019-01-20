import path from 'path';
import sqlite from 'sqlite';
import nanoid from 'nanoid/generate';
import { Client } from 'dsteem';
import { Command } from 'discord.js-commando';
import config from '../../config';

const dsteem = new Client(config.NODE);
const dbPromise = Promise.resolve()
  .then(() => sqlite.open(path.join(config.PROJECT_ROOT, 'data/database.sqlite3'), { Promise }))
  .then(db => db.migrate({ force: false, migrationsPath: path.join(config.PROJECT_ROOT, '/migrations') }));

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default class RegisterCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'register',
      group: 'user',
      memberName: 'register',
      description: 'Registers new users.',
      examples: ['register reazuliqbal'],
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
          validate: async (user) => {
            const [account] = await dsteem.database.getAccounts([user]);

            if (account === undefined) {
              return false;
            }
            return true;
          },
        },
      ],
    });
  }

  async run(message, { username }) {
    const db = await dbPromise;

    const user = await db.get('SELECT * FROM users WHERE discordId = ?', [message.author.id]);

    if (!user) {
      const code = nanoid(alphabet, 16);

      db.run(
        'INSERT INTO users (discordId, username, code, active) VALUES(?, ?, ?, ?)',
        [message.author.id, username, code, false],
      )
        .then(() => {
          message.channel.send(`To register **${username}** with <@${message.author.id}>, please send 0.001 SBD to **\`${config.STEEM_ACCOUNT}\`** with **\`${code}\`** as memo.`);
        })
        .catch((err) => {
          if (err.code === 'SQLITE_CONSTRAINT') {
            message.reply(`**${username}** is already registred.`);
          } else {
            console.log(err);
          }
        });
    } else if (user.username !== username && !user.active) {
      const code = nanoid(alphabet, 16);

      db.run('UPDATE users SET username = ?, code = ? WHERE discordId = ?', [username, code, message.author.id])
        .then(() => {
          message.channel.send(`To register **${username}** with <@${message.author.id}>, please send 0.001 SBD to **\`${config.STEEM_ACCOUNT}\`** with **\`${code}\`** as memo.`);
        })
        .catch(err => console.log(err.stack));
    } else if (!user.active) {
      message.reply(`To confirm your registration please send 0.001 SBD to **\`${config.STEEM_ACCOUNT}\`** with **\`${user.uuid}\`** as memo from **${user.username}**.`);
    } else {
      const registerdRole = message.guild.roles.find('name', 'Registered');
      if (registerdRole) {
        message.member.addRole(registerdRole);
      }

      message.reply(`You are already registred with **${user.username}**.`);
    }
  }
}
