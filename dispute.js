import path from 'path';
import sqlite from 'sqlite';
import BitlyClient from 'bitly';
import Discord from 'discord.js';
import { Command } from 'discord.js-commando';
import { Client } from 'dsteem';
import { SC2 } from '../../utils';
import config from '../../config';

const dsteem = new Client(config.NODE);
const dbPromise = Promise.resolve()
  .then(() => sqlite.open(path.join(config.PROJECT_ROOT, 'data/database.sqlite3'), { Promise }))
  .then(db => db.migrate({ force: false, migrationsPath: path.join(config.PROJECT_ROOT, '/migrations') }));

const bitly = BitlyClient(config.BITLY_TOKEN);

export default class ExchangeCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'dispute',
      group: 'exchange',
      memberName: 'dispute',
      description: 'Generate SteemConnect link for disputing transaction.',
      examples: ['dispute 33899032'],
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

          if (result.disputed) return message.reply('This escrow transaction is already disputed.');

          let signUrl = SC2.sign('escrow_dispute', {
            from: transaction.sender,
            to: transaction.receiver,
            agent: config.STEEM_ACCOUNT,
            who: user.username,
            escrow_id: escrowId,
          }, '');

          signUrl = await bitly.shorten(signUrl);


          const richEmbed = new Discord.RichEmbed()
            .setTitle('Transaction Status')
            .setColor(0x00AE86)
            .addField('Escrow ID', result.escrow_id, true)
            .addField('STEEM', result.steem_balance, true)
            .addField('SBD', result.sbd_balance, true)
            .addField('Sender', result.from, true)
            .addField('Receiver', result.to, true)
            .addBlankField(true)
            .addField('Deadline', result.ratification_deadline, true)
            .addField('Expiration', result.escrow_expiration, true)
            .addBlankField(true)
            .addField('Receiver Approved', (result.to_approved) ? 'Yes' : 'No', true)
            .addField('Agent Approved', (result.agent_approved) ? 'Yes' : 'No', true)
            .addField('Disputed', (result.disputed) ? 'Yes' : 'No', true);

          return message.channel.send(`To dispute please hot sign the transaction on SteemConnect ${signUrl.data.url}.`, richEmbed);
        })
        .catch(err => console.error(err));
    } else {
      message.reply('We could not find this transaction.');
    }
  }
}
