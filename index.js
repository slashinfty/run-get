const fs = require('fs');
const path = require('path');
const qs = require('querystring');
const fetch = require('node-fetch');
const Discord = require('discord.js');
const config = require("./config.js");

const client = new Discord.Client();
client.login(config.token);

// Time of first run at last query
let compareTime;
// Server and game information
let servers;
let games;

// Convert times to a readable format
const convert = time => {
  let hr, min, sec, ms;
  let parts = time.toString().split('.');
  ms = parts.length > 1 ? parseInt((parts[1] + '00').substr(0,3)) : undefined;
  sec = parseInt(parts[0]);
  if (sec >= 60) {min = Math.floor(sec / 60); sec = sec < 10 ? '0' + (sec % 60) : sec % 60}
  if (min >= 60) {hr = Math.floor(min / 60); min = min < 10 ? '0' + (min % 60) : min % 60}
  ms = ms < 10 ? '00' + ms : ms < 100 ? '0' + ms : ms;
  if (min === undefined) return ms === undefined ? sec.toString() + 's' : sec.toString() + 's ' + ms.toString() + 'ms';
  else if (hr === undefined) return ms === undefined ? min.toString() + 'm ' + sec.toString() + 's' : min.toString() + 'm ' + sec.toString() + 's ' + ms.toString() + 'ms';
  else return ms === undefined ? hr.toString() + 'h ' + min.toString() + 'm ' + sec.toString() + 's' : hr.toString() + 'h ' + min.toString() + 'm ' + sec.toString() + 's ' + ms.toString() + 'ms';
}

// Save any server changes to file
const serverUpdate = () => {
  // Update games list
  const rawGames = servers.map(s => s.game);
  games = [...new Set(rawGames)];
  // Get file contents
  const file = path.join(__dirname, 'servers.json');
  const contents = fs.readFileSync(file);
  let serverObject = JSON.parse(contents);
  // Update with current list of servers and write
  serverObject.servers = servers;
  fs.writeFileSync(file, JSON.stringify(serverObject));
}

// Bot is on
client.once('ready', () => {
  console.log('RUN GET is online!');
  // Set Discord status
  client.user.setPresence({
    activity: {
      name: '?rungethelp',
      type: 'LISTENING'
    },
    status: 'dnd'
  });
  // Fill servers and games
  const file = path.join(__dirname, 'servers.json');
  // Create file if it doesn't exist
  if (!fs.existsSync(file)) {
    const newObj = {
      "servers": []
    };
    fs.writeFileSync(file, JSON.stringify(newObj));
  }
  const contents = fs.readFileSync(file);
  servers = JSON.parse(contents).servers;
  const rawGames = servers.map(s => s.game);
  games = [...new Set(rawGames)];
});

// Messages to add game watch to a server
client.on('message', async message => {
  // Help reply
  if (message.content === '?rungethelp') message.reply('Need help with RUN GET? https://slashinfty.github.io/run-get');
  
  if (message.content === '?rungetgames' || message.content === '?rungetgames!') {
    const gamesArray = servers.filter(s => s.server === message.guild.id);
    if (gamesArray.length === 0) {
      message.reply('Not currently watching any games.');
      return;
    }
    let replyString = 'Currently watching:\n';
    gamesArray.forEach((g, i) => {
      replyString += i === 0 ? g.gameName : '\n' + g.gameName;
      replyString += message.content.endsWith('!') ? ' in ' + g.channelName : '';
    });
    message.reply(replyString);
  }
  
  // Message must mention the bot, be from the server owner, and mention exactly 1 channel
  if (message.mentions.users.has(client.user.id) && message.member.id === message.guild.ownerID && message.mentions.channels.size === 1) {
    // The game abbreviations included in the message
    const gameAbbreviationArray = message.content.match(/\!?\b(?<!\<)\w+(?!\>)\b/g);
    if (gameAbbreviationArray.length === 0) message.reply('No game abbreviation in message.');
    else {
      // The mentioned channel
      let channelObj = message.mentions.channels.first();
      // Loop through all games
      for (let i = 0; i < gameAbbreviationArray.length; i++) {
        // Get game ID from abbreviation
        const abbr = gameAbbreviationArray[i].startsWith('!') ? gameAbbreviationArray[i].slice(1) : gameAbbreviationArray[i];
        const abbreviation = qs.stringify({ abbreviation: abbr });
        const gameQuery = await fetch(`https://www.speedrun.com/api/v1/games?${abbreviation}`);
        const gameObject = await gameQuery.json();
        // If no game is found
        if (gameObject.data.length === 0) {
          message.reply('No game found. Are you sure https://www.speedrun.com/' + gameAbbreviationArray[i] + ' exists?');
          return;
        }
        const gameID = gameObject.data[0].id;
        // Grabbing server information if already watching for the game
        const foundServer = servers.find(s => s.server === message.guild.id && s.channel === channelObj.id && s.game === gameID);
        // Check if removing
        if (gameAbbreviationArray[i].startsWith('!')) {
          // If not watching for the game in the channel
          if (foundServer === undefined) {
            message.reply('I am not currently watching for ' + gameObject.data[0].names.international + ' in ' + channelObj.name);
            continue;
          }
          // Remove server from list
          servers.splice(servers.indexOf(foundServer), 1);
          message.reply('No longer watching for ' + gameObject.data[0].names.international + ' in ' + channelObj.name);
          // Update list of servers
          serverUpdate();
        } else {
          // If trying to add duplicate
          if (foundServer !== undefined) {
            message.reply('I am already watching for ' + gameObject.data[0].names.international + ' in ' + channelObj.name);
            continue;
          }
          // Server information
          const newServer = {
            "server": message.guild.id,
            "serverName": message.guild.name,
            "channel": channelObj.id,
            "channelName": channelObj.name,
            "game": gameID,
            "gameName": gameObject.data[0].names.international
          }
          // Add to servers and update the list
          servers.push(newServer);
          message.reply('Now watching for ' + gameObject.data[0].names.international + ' in ' + channelObj.name);
          serverUpdate();
        }
      }
    }
  }
});

// Remove servers when kicked
client.on('guildDelete', guild => {
  const guildArray = servers.filter(s => s.server === guild.id);
  guildArray.forEach(g => servers.splice(servers.indexOf(g), 1));
  serverUpdate();
});

// The core function - 6e4 for timeout
client.setInterval(async () => {
  // Get 20 most recent verified runs
  const recentRunsResponse = await fetch(`https://www.speedrun.com/api/v1/runs?status=verified&orderby=verify-date&direction=desc&embed=game,category.variables,players`);
  const recentRunsObject = await recentRunsResponse.json();
  const recentRuns = recentRunsObject.data;
  let newCompareTime;
  for (let i = 0; i < recentRuns.length; i++) {
    const thisRun = recentRuns[i];
    // When run was verified
    const verifyTime = await new Date(thisRun.status['verify-date']);
    // Update time to check if it's the first run
    if (i === 0) {
      if (compareTime === undefined) compareTime = verifyTime;
      newCompareTime = verifyTime;
    }
    // If the run was before last first checked run, quit (but update time!)
    if (verifyTime - compareTime <= 0) {
      compareTime = newCompareTime;
      return;
    }
    // If this game isn't being watched, skip
    if (!games.includes(thisRun.game.data.id)) continue;
    // Name of the runner
    const runnerName = thisRun.players.data[0].rel === 'user' ? thisRun.players.data[0].names.international : thisRun.players.data[0].name;
    // Subcategory information
    const subCategoryObject = thisRun.category.data.variables.data.find(v => v['is-subcategory']);
    let subCategory = subCategoryObject !== undefined ? ' (' + subCategoryObject.values.values[thisRun.values[subCategoryObject.id]].label + ')' : '';
    // Create Discord embed
    const embed = new Discord.MessageEmbed()
      .setColor('#2A89E7')
      .setTitle(convert(thisRun.times.primary_t) + ' by ' + runnerName)
      .setThumbnail(thisRun.game.data.assets['cover-medium'].uri)
      .setURL(thisRun.weblink)
      .setAuthor(thisRun.game.data.names.international + ' - ' + thisRun.category.data.name + subCategory)
      .addField('Date Played:', thisRun.date)
      .setTimestamp();
    // Get all channels watching this game
    let channels = servers.filter(s => s.game === thisRun.game.data.id).map(c => c.channel);
    // Send message
    for (let j = 0; j < channels.length; j++) {
      const thisChannel = await client.channels.fetch(channels[j]);
      await thisChannel.send(embed).then(msg => compareTime = newCompareTime);
    }
  }
  // Update time to check
  compareTime = newCompareTime;
}, 6e4); // 60 seconds
