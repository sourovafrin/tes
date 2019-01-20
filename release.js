import path from 'path';
import sqlite from 'sqlite';
import BitlyClient from 'bitly';
import { Command } from 'discord.js-commando';
import { Client } from 'dsteem';
import { SC2 } from '../../utils';
import config from '../../config';

const dsteem = new Client(config.NODE);
const dbPromise = Promise.resolve()
  .then(() => sqlite.open(path.join(config.PROJECT_ROOT, 'data/database.sqlite3'), { Promise }))
  .then(db => db.migrate({ force: false, migrationsPath: path.join(config.PROJECT_ROOT, '/migrations') }));

const bitly = BitlyClient(config.BITLY_TOKEN);

export default class ReleaseCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'release',
      group: 'exchange',
      memberName: 'release',
      description: 'Generate SteemConnect link for releasing escrow.',
      examples: ['release 33899032'],
      throttling: {
        usages: 2,
        duration: 10,
      },
      args: [
        {
          key: 'escrowId',
          label: 'Escrow ID',
          prompt: 'Please enter your escrow ID.',
          type: 'integer',
        },
      ],
      argsPromptLimit: 0,
    });
  }

  async run(message, { escrowId }) {
    const db = await dbPromise;
    const transaction = await db.get(
      'SELECT * FROM transactions WHERE escrowId = ? AND (senderId = ? OR receiverId = ?)',
      [escrowId, message.author.id, message.author.id],
    );
    const user = await db.get('SELECT username FROM users WHERE discordId = ?', message.author.id);

    if (transaction) {
      dsteem.database.call('get_escrow', [transaction.sender, escrowId])
        .then(async (result) => {
          if (result === null) {
            return message.reply('We could not find this transaction.');
          }

          let releaseTo = '';

          if (user.username === result.from) {
            releaseTo = result.to;
          } else {
            releaseTo = result.from;
          }

          let signUrl = SC2.sign('escrow_release', {
            from: result.sender,
            to: result.receiver,
            agent: config.STEEM_ACCOUNT,
            who: user.username,
            receiver: releaseTo,
            escrow_id: escrowId,
            sbd_amount: result.sbd_balance,
            steem_amount: result.steem_balance,
          }, '');

          signUrl = await bitly.shorten(signUrl);

          return message.channel.send(`You are about to release escrowed balance for ID: **${escrowId}**. Please click this ${signUrl.data.url} to release the fund to **${releaseTo}**`);
        })
        .catch(err => console.error(err));
    } else {
      message.reply('We could not find this transaction.');
    }
  }
}
