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
      name: 'exchange',
      group: 'exchange',
      memberName: 'exchange',
      description: 'Generate SteemConnect link for escrow transaction',
      examples: ['exchange 10 SBD SENDER_USERNAME RECEIVER_USERNAME'],
      throttling: {
        usages: 2,
        duration: 10,
      },
      guildOnly: true,
      args: [
        {
          key: 'amount',
          label: 'AMOUNT',
          prompt: 'Please enter the amount you want to exchange.',
          type: 'float',
          min: 1.0,
        },
        {
          key: 'currency',
          label: 'STEEM or SBD',
          prompt: 'Please enter a currency, can be SBD or STEEM.',
          type: 'string',
        },
        {
          key: 'beneficiary',
          label: 'RECEIVER',
          prompt: 'Please mention the user who will receive the fund.',
          type: 'member',
        },
        {
          key: 'expiration',
          label: 'EXPIRATION',
          prompt: 'Please enter in how many days this transaction should expire.',
          type: 'integer',
        },
      ],
      argsPromptLimit: 0,
    });
  }

  hasPermission(message) {
    if (!message.member.roles.some(role => ['Registered'].includes(role.name))) {
      return 'Please register to use this command.';
    }
    return true;
  }

  async run(message, {
    amount,
    currency,
    expiration,
    beneficiary,
  }) {
    const chainProps = await dsteem.database.getDynamicGlobalProperties();
    const chainTime = new Date(`${chainProps.time}Z`);
    const ratificationDeadline = new Date(chainTime.getTime() + (86400 * 1000 * 3));
    const escrowExpiration = new Date(chainTime.getTime() + (86400 * 1000 * expiration));

    const escrowId = parseInt((Math.random() * (99999999 - 10000000)) + 10000000, 10);
    let sbdAmount = '0.000 SBD';
    let steemAmount = '0.000 STEEM';

    if (currency === 'SBD') {
      sbdAmount = `${parseFloat(amount).toFixed(3)} SBD`;
    } else {
      steemAmount = `${parseFloat(amount).toFixed(3)} STEEM`;
    }
    const jsonMeta = {
      app: message.client.user.username,
    };

    const db = await dbPromise;
    const sql = `SELECT
      a.username AS sender,
      b.username AS receiver
      FROM main.users a
      INNER JOIN
      users b on (a.discordId = ? AND b.discordId = ?)`;

    db.get(sql, [message.author.id, beneficiary.user.id])
      .then(async (result) => {
        const fee = `${parseFloat(config.ESCROW_FEE).toFixed(3)} ${currency}`;

        let signUrl = SC2.sign('escrow_transfer', {
          from: result.sender,
          to: result.receiver,
          agent: config.STEEM_ACCOUNT,
          escrow_id: escrowId,
          sbd_amount: sbdAmount,
          steem_amount: steemAmount,
          fee,
          ratification_deadline: ratificationDeadline.toISOString().slice(0, -5),
          escrow_expiration: escrowExpiration.toISOString().slice(0, -5),
          json_meta: JSON.stringify(jsonMeta),
        }, '');

        signUrl = await bitly.shorten(signUrl);

        let approveUrl = SC2.sign('escrow_approve', {
          from: result.sender,
          to: result.receiver,
          agent: config.STEEM_ACCOUNT,
          who: result.receiver,
          escrow_id: escrowId,
          approve: 1,
        }, '');

        approveUrl = await bitly.shorten(approveUrl);

        db.run(
          'INSERT INTO transactions (escrowId, sender, senderId, receiver, receiverId, amount, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            escrowId, result.sender, message.author.id, result.receiver,
            beneficiary.user.id, parseFloat(amount).toFixed(3), currency,
          ],
        );

        const RichEmbed = new Discord.RichEmbed()
          .setTitle('Escrow Transaction')
          .setColor(0xe74c3c)
          .addField('Escrow ID', escrowId)
          .addField('STEEM', steemAmount, true)
          .addField('SBD', sbdAmount, true)
          .addField('Fee', fee, true)
          .addField('Sender', result.sender, true)
          .addField('Receiver', result.receiver, true)
          .addBlankField(true)
          .addField('Deadline', ratificationDeadline, true)
          .addField('Expiration', escrowExpiration, true);

        message.author.send(
          `Please hot sign the transaction on SteemConnect ${signUrl.data.url}, then type **\`${config.COMMAND_PREFIX}txrstatus ${escrowId}\`**`,
          RichEmbed.setURL(signUrl.data.url),
        );

        beneficiary.send(
          `Congratulations, You are the benificiary of an escrow transaction. Please type **\`${config.COMMAND_PREFIX}txrstatus ${escrowId}\`** to check and click ${approveUrl.data.url} to approve using SteemConnect.`,
          RichEmbed.setURL(approveUrl.data.url),
        );
      })
      .catch(err => console.log(err));
  }
}
