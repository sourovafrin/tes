import axios from 'axios';
import Discord from 'discord.js';
import { Command } from 'discord.js-commando';

export default class PriceCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'price',
      group: 'steem',
      memberName: 'price',
      description: 'Returns price of STEEM and SBD',
      examples: ['price USD,BDT'],
      throttling: {
        usages: 2,
        duration: 10,
      },
      guildOnly: true,
      args: [
        {
          key: 'currencies',
          label: 'COMMA SEPERATED CURRENCIES',
          prompt: 'Please enter a fiat currency to show the conversion',
          type: 'string',
          default: 'BTC,USD,BDT',
          error: 'Please enter at least one fiat currency to show the conversion. eg. BDT or BDT,USD',
          validate: currencies => new RegExp(/^([a-zA-Z]+,?)+$/g).test(currencies),
        },
      ],
      argsPromptLimit: 0,
    });
  }

  async run(message, { currencies }) {
    axios.get('https://min-api.cryptocompare.com/data/pricemulti', {
      params: {
        fsyms: 'STEEM,SBD*',
        tsyms: currencies,
      },
    })
      .then((response) => {
        let sbdPrices = '';
        let steemPrices = '';

        Object.keys(response.data.STEEM).forEach((c) => {
          steemPrices += `${response.data.STEEM[c]} ${c}\n`;
        });

        Object.keys(response.data['SBD*']).forEach((c) => {
          sbdPrices += `${response.data['SBD*'][c]} ${c}\n`;
        });

        const richEmbed = new Discord.RichEmbed()
          .setColor('#4ba2f2')
          .addField('STEEM', steemPrices, true)
          .addField('SBD', sbdPrices, true);

        message.channel.send(richEmbed);
      })
      .catch(error => console.error(error));
  }
}
