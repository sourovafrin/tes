import Commando from 'discord.js-commando';
import path from 'path';
import sqlite from 'sqlite';
import config from './config';

const client = new Commando.Client({
  owner: config.BOT_OWNER_ID,
  commandPrefix: config.COMMAND_PREFIX,
  disableEveryone: true,
  unknownCommandResponse: false,
  commandEditableDuration: 0,
  nonCommandEditable: false,
});
client.setProvider(sqlite.open(path.join(config.PROJECT_ROOT, 'data/settings.sqlite3'))
  .then(db => new Commando.SQLiteProvider(db)))
  .catch(console.error);

client.registry
  .registerGroups([
    ['steem', 'Steem Blockchain related commands'],
    ['action', 'Moderator actions'],
    ['exchange', 'STEEM/SBD exchange related commands'],
    ['user', 'User management related commands'],
  ])
  .registerDefaults()
  .registerCommandsIn(path.join(__dirname, 'commands'));

client.on('ready', () => {
  console.log(`${new Date().toLocaleString()}: ${client.user.username} bot is ready.`);
});

client.on('messageReactionAdd', (reaction) => {
  if (reaction.message.channel.name !== 'requests-log') return false;

  if (!reaction.message.member.roles
    .some(role => config.ALLOWED_UPVOTE_ROLES.includes(role.name))) {
    return reaction.message.channel.send('You do not have required permission to use this command!');
  }

  if (reaction.emoji.name !== '✅') return false;

  const url = reaction.message.cleanContent.match(/\bhttps?:\/\/\S+/gi);
  if (url === null) return false;

  const [command] = client.registry.findCommands('upvote', true);
  return command.run(reaction.message, { steemUrl: url.shift() });
});

client.login(config.BOT_TOKEN);
