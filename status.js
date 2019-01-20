import path from 'path';
import sqlite from 'sqlite';
import Discord from 'discord.js';
import { Command } from 'discord.js-commando';
import { Client } from 'dsteem';
import config from '../../config';

const dsteem = new Client(config.NODE);
const dbPromise = Promise.resolve()
  .then(() => sqlite.open(path.join(config.PROJECT_ROOT, 'data/database.sqlite3'), { Promise }))
  .then(db => db.migrate({ force: false, migrationsPath: path.join(config.PROJECT_ROOT, '/migrations') }));

export default class TrxStatusCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'trxstatus',
      group: 'exchange',
      memberName: 'trxstatus',
      description: 'Gets the current status of escrow transaction',
      examples: ['trxstatus 11919919'],
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
        {
          key: 'sender',
          label: 'SENDER',
          prompt: 'Please enter sender of the escrow transaction.',
          type: 'string',
          default: '',
        },
      ],
    });
  }

  async run(message, { escrowId, sender }) {
    const db = await dbPromise;
    let from = '';

    if (sender.length > 0) {
      from = sender;
    } else {
      const transaction = await db.get('SELECT sender FROM transactions WHERE escrowId = ?', escrowId);
      if (transaction) from = transaction.sender;
    }

    if (!from) return message.reply('We could not able to find the escrow. It may already be fulfilled or doesn\'t exists.');

    return dsteem.database.call('get_escrow', [from, escrowId])
      .then((result) => {
        if (result === null) {
          message.reply('We could not able to find the escrow. It may already be fulfilled or doesn\'t exists.');
        } else {
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

          message.channel.send(richEmbed);
        }
      })
      .catch(err => console.error(err));
  }
}
