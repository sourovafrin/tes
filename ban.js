import Discord from 'discord.js';
import { Command } from 'discord.js-commando';

export default class BanCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'ban',
      group: 'action',
      memberName: 'ban',
      description: 'Baning user for abusing the platform.',
      examples: ['ban @reazuliqbal#1149 abusing the platform'],
      guildOnly: true,
      args: [
        {
          key: 'user',
          label: 'USER',
          prompt: 'Please mention a user you want to ban.',
          type: 'member',
          error: 'Please mention a user you want to ban.',
        },
        {
          key: 'reason',
          label: 'REASON',
          prompt: 'Please enter your reason of baning.',
          type: 'string',
          error: 'Please enter your reason of baning.',
        },
      ],
      argsPromptLimit: 0,
    });
  }

  hasPermission(message) {
    if (!message.member.roles.some(role => ['Admin', 'Moderator'].includes(role.name))) {
      return 'you do not have required permission to use this command!';
    }
    return true;
  }

  async run(message, { user, reason }) {
    const richEmbed = new Discord.RichEmbed({
      title: 'Banned User',
      description: 'User banned for abusing the platform',
    })
      .setColor('#EC7357')
      .addField('Banned User', user)
      .addField('Banned By', message.author)
      .addField('Time', message.createdAt)
      .addField('Reason', reason);

    user.ban({ reason }).then(async () => {
      message.delete();

      const reportChannel = await message.guild.channels.find('name', 'actions-log');
      if (!reportChannel) {
        return message.channel.send('Couldn\'t find actions log channel.');
      }
      return reportChannel.send(richEmbed);
    }).catch(console.error);
  }
}
