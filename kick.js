import Discord from 'discord.js';
import { Command } from 'discord.js-commando';

export default class KickCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'kick',
      group: 'action',
      memberName: 'kick',
      description: 'Kicking user for abusing the platform.',
      examples: ['kick @reazuliqbal#1149 abusing the platform'],
      guildOnly: true,
      args: [
        {
          key: 'user',
          label: 'USER',
          prompt: 'Please mention a user you want to kick.',
          type: 'member',
          error: 'Please mention a user you want to kick.',
        },
        {
          key: 'reason',
          label: 'REASON',
          prompt: 'Please enter your reason of kicking.',
          type: 'string',
          error: 'Please enter your reason of kicking.',
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
      title: 'Kicked User',
      description: 'User kicked for abusing the platform',
    })
      .setColor('#EC7357')
      .addField('Kicked User', user)
      .addField('Kicked By', message.author)
      .addField('Time', message.createdAt)
      .addField('Reason', reason);

    user.kick(reason).then(async () => {
      message.delete();

      const reportChannel = await message.guild.channels.find('name', 'actions-log');
      if (!reportChannel) {
        return message.channel.send('Couldn\'t find actions log channel.');
      }
      return reportChannel.send(richEmbed);
    }).catch(console.error);
  }
}
