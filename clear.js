import { Command } from 'discord.js-commando';

export default class ClearCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'clear',
      group: 'action',
      memberName: 'clear',
      description: 'Clear messages',
      examples: ['clear 10'],
      clientPermissions: ['MANAGE_MESSAGES'],
      userPermissions: ['MANAGE_MESSAGES'],
      guildOnly: true,
      args: [
        {
          key: 'howMany',
          prompt: 'Please enter steemit.com post URL.',
          type: 'integer',
          default: 50,
        },
      ],
      argsPromptLimit: 0,
    });
  }

  hasPermission(message) {
    if (!message.member.roles.some(role => ['Admin'].includes(role.name))) {
      return 'you do not have required permission to clear messages!';
    }
    return true;
  }

  async run(message, { howMany }) {
    message.delete();
    const fetched = await message.channel.fetchMessages({ limit: howMany });
    try {
      message.channel.bulkDelete(fetched);
    } catch (e) {
      console.error(e.stack);
    }
  }
}
