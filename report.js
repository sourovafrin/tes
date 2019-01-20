import Discord from 'discord.js';
import { Command } from 'discord.js-commando';

export default class ReportCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'report',
      group: 'action',
      memberName: 'report',
      description: 'Report abuse on the channel or steemit.com',
      examples: ['report @reazuliqbal#1149 abusing the platform'],
      guildOnly: true,
      args: [
        {
          key: 'user',
          label: 'USER',
          prompt: 'Please mention a user you want to report.',
          type: 'member',
          error: 'Please mention a user you want to report.',
        },
        {
          key: 'reason',
          label: 'REASON',
          prompt: 'Please enter your reason of reporting.',
          type: 'string',
          error: 'Please enter your reason of reporting.',
        },
      ],
      argsPromptLimit: 0,
    });
  }

  async run(message, { user, reason }) {
    message.delete();

    const richEmbed = new Discord.RichEmbed({
      title: 'Abuse Report',
      description: 'User reported for abusing the platform',
    })
      .setColor('#EC7357')
      .addField('Reported User', user)
      .addField('Reported By', message.author)
      .addField('Time', message.createdAt)
      .addField('Reason', reason);

    const reportChannel = await message.guild.channels.find('name', 'abuse-reports');
    if (!reportChannel) {
      return message.channel.send('Couldn\'t find reports channel.');
    }
    message.reply('thank you for reporting. Our moderators will look into it.');
    return reportChannel.send(richEmbed);
  }
}
