import Discord from 'discord.js';
import { Command } from 'discord.js-commando';
import { Client } from 'dsteem';
import config from '../../config';
import { calcReputation, vestToSteem } from '../../utils';

const dsteem = new Client(config.NODE);

export default class AccountInfoCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'accountinfo',
      group: 'steem',
      memberName: 'accountinfo',
      description: 'Shows summary of a STEEM account',
      examples: ['accountinfo bdcommunity'],
      throttling: {
        usages: 2,
        duration: 10,
      },
      guildOnly: true,
      args: [
        {
          key: 'username',
          label: 'STEEM USERNAME',
          prompt: 'Please enter a steem username.',
          type: 'string',
        },
      ],
      argsPromptLimit: 0,
    });
  }

  async run(message, { username }) {
    dsteem.database.getAccounts([username])
      .then(async ([data]) => {
        if (data === undefined || data === null) {
          message.reply('I could not find this user on STEEM!');
        } else {
          const globalProps = await dsteem.database.getDynamicGlobalProperties();
          const totalSteem = Number(globalProps.total_vesting_fund_steem.split(' ')[0]);
          const totalVests = Number(globalProps.total_vesting_shares.split(' ')[0]);
          const userVests = Number(data.vesting_shares.split(' ')[0]);
          const userVestsDel = Number(data.delegated_vesting_shares.split(' ')[0]);

          const richEmbed = new Discord.RichEmbed()
            .setTitle('Account Info')
            .setColor(0x00AE86)
            .setThumbnail(message.author.defaultAvatarURL)
            .setURL(`https://steemit.com/@${data.name}`)
            .addField('Username', data.name, true)
            .addField('Voting Power', `${data.voting_power / 100}%`, true)
            .addField('Reputation', calcReputation(data.reputation), true)
            .addField('Post Count', data.post_count, true)
            .addField('STEEM', data.balance, true)
            .addField('SBD', data.sbd_balance, true)
            .addField('SP', vestToSteem(userVests, totalVests, totalSteem), true)
            .addField('Delegated', vestToSteem(userVestsDel, totalVests, totalSteem), true);

          if (data.json_metadata) {
            const meta = JSON.parse(data.json_metadata);
            if (meta.profile.profile_image) {
              richEmbed.setThumbnail(meta.profile.profile_image);
            }
          }

          message.channel.send(richEmbed);
        }
      })
      .catch(console.error);
  }
}
