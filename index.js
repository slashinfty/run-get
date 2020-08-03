const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const config = require("./config.js");
const query = require("./queries.js");

const client = new Discord.Client();
client.login(config.token);

// Time of first run at last query
let verifiedCompareTime;
let submittedCompareTime;
// Server and game information
let servers;
let verifiedGames;
let users;
let submittedGames;
let runners;
let runnerNames;

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
  verifiedGames = [...new Set(rawGames)];
  // Get file contents
  const file = path.join(__dirname, 'servers.json');
  const contents = fs.readFileSync(file);
  let serverObject = JSON.parse(contents);
  // Update with current list of servers and write
  serverObject.servers = servers;
  fs.writeFileSync(file, JSON.stringify(serverObject));
}

// Save any user changes to file
const userUpdate = () => {
  // Update games list
  const rawGames = users.map(u => u.game);
  submittedGames = [...new Set(rawGames)];
  // Get file contents
  const file = path.join(__dirname, 'users.json');
  const contents = fs.readFileSync(file);
  let userObject = JSON.parse(contents);
  // Update with current list of users and write
  userObject.users = users;
  fs.writeFileSync(file, JSON.stringify(userObject));
}

// Save any runner changes to file
const runnerUpdate = () => {
  // Update games list
  const rawGames = runners.map(r => r.runner);
  runnerNames = [...new Set(rawGames)];
  // Get file contents
  const file = path.join(__dirname, 'runners.json');
  const contents = fs.readFileSync(file);
  let runnerObject = JSON.parse(contents);
  // Update with current list of runners and write
  runnerObject.runners = runners;
  fs.writeFileSync(file, JSON.stringify(runnerObject));
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
  const serverFile = path.join(__dirname, 'servers.json');
  // Create file if it doesn't exist
  if (!fs.existsSync(serverFile)) {
    const newServerObj = {
      "servers": []
    };
    fs.writeFileSync(serverFile, JSON.stringify(newServerObj));
  }
  const serverContents = fs.readFileSync(serverFile);
  servers = JSON.parse(serverContents).servers;
  const rawServerGames = servers.map(s => s.game);
  verifiedGames = [...new Set(rawServerGames)];
  // Fill users and games
  const userFile = path.join(__dirname, 'users.json');
  // Create file if it doesn't exist
  if (!fs.existsSync(userFile)) {
    const newUserObj = {
      "users": []
    };
    fs.writeFileSync(userFile, JSON.stringify(newUserObj));
  }
  const userContents = fs.readFileSync(userFile);
  users = JSON.parse(userContents).users;
  const rawUserGames = users.map(u => u.game);
  submittedGames = [...new Set(rawUserGames)];

  // Fill runners and games
  const runnerFile = path.join(__dirname, 'runners.json');
  // Create file if it doesn't exist
  if (!fs.existsSync(runnerFile)) {
    const newRunnerObj = {
      "runners": []
    };
    fs.writeFileSync(runnerFile, JSON.stringify(newRunnerObj));
  }
  const runnerContents = fs.readFileSync(runnerFile);
  runners = JSON.parse(runnerContents).runners;
  const rawrunnerNames = runners.map(r => r.runner);
  runnerNames = [...new Set(rawrunnerNames)];
});

// Messages to add game watch to a server
client.on('message', async message => {
  // Help reply
  if (message.content === '?rungethelp') message.reply('Need help with RUN GET? https://slashinfty.github.io/run-get');
  
  if (message.content === '?rungetgames' || message.content === '?rungetgames!') {
    const lengthCheck = (existing, next, msg) => {
      const content = existing + next;
      if (content.length >= 2000) {
        msg.reply(existing);
        return 'Currently watching:';
      } else {
        return existing;
      }
    }
    if (message.channel.type === 'dm') {
      const gamesArray = users.filter(u => u.channel === message.author.id);
      if (gamesArray.length === 0) {
        message.reply('Not currently watching any games.');
        return;
      }
      let replyString = 'Currently watching:';
      gamesArray.forEach(g => {
        replyString = lengthCheck(replyString, g.gameName, message);
        replyString += '\n' + g.gameName;
      });
      message.reply(replyString);
      return;
    } else {
      const gamesArray = servers.filter(s => s.server === message.guild.id);
      const runnersArray = runners.filter(r => r.server === message.guild.id);
      if (gamesArray.length === 0 && runnersArray.length === 0) {
        message.reply('Not currently watching any games.');
        return;
      }
      let replyString = 'Currently watching:';
      gamesArray.forEach(s => {
        const nextMsg = message.content.endsWith('!') ? '\n' + s.gameName + ' in ' + s.channelName : '\n' + s.gameName;
        replyString = lengthCheck(replyString, nextMsg, message)
        replyString += nextMsg;
      });
      runnersArray.forEach(s => {
        const nextMsg = message.content.endsWith('!') ? '\n' + s.runnerName + ' in ' + s.channelName : '\n' + s.runnerName;
        replyString = lengthCheck(replyString, nextMsg, message)
        replyString += nextMsg;
      });
      message.reply(replyString);
    }
  }
  
  // Message must mention the bot and the user
  if (message.channel.type === 'dm' && message.author.id != client.user.id) {
    const submittedGamesArray = message.content.match(/\!?\b(?<!\<)\w+(?!\>)\b\*?/g);
    if (submittedGamesArray === null) {
      message.author.send('No game/user submitted.');
      return;
    }
    if (submittedGamesArray.length === 1 && submittedGamesArray[0].endsWith('*')) {
      const submittedName = submittedGamesArray[0].slice(0, -1);
      let userName, userID;
      const twitchResult = await query.twitchUser(submittedName);
      if (twitchResult !== undefined) {
        userName = twitchResult.name;
        userId = twitchResult.id
      } else {
        const srcResult = await query.srcUser(submittedName);
        if (typeof srcResult === 'string') {
          message.author.send(srcResult);
          return;
        }
        userName = srcResult.user;
        userId = srcResult.id;
      }
      message.author.send('Found user named ' + userName);
      const moderateArray = await query.moderatedGames(userId);
      for (let i = 0; i < moderateArray.length; i++) {
        const existing = users.find(u => u.channel === message.author.id && u.game === gameID);
        if (existing !== undefined) {
          message.author.send('I am already watching for ' + moderateArray[i].names.international + ' for you');
          continue;
        }
        const newUser = {
          "game": moderateArray[i].id,
          "gameName": moderateArray[i].names.international,
          "channel": message.author.id
        }
        users.push(newUser);
        message.author.send('Now watching ' + moderateArray[i].names.international);
        userUpdate();
      }
      return;
    }
    if (submittedGamesArray.length === 0) {
      message.reply('No games specified in message.');
      return;
    }
    for (let i = 0; i < submittedGamesArray.length; i++) {
      // Get game ID from abbreviation
      const abbr = submittedGamesArray[i].startsWith('!') ? submittedGamesArray[i].slice(1) : submittedGamesArray[i];
      const gameResult = await query.game(abbr);
      // If no game is found
      if (gameResult === undefined) {
        message.reply('No game found. Are you sure https://www.speedrun.com/' + submittedGamesArray[i] + ' exists?');
        continue;
      }
      const gameID = gameResult.id;
      const gameName = gameResult.names.international;
      // Grabbing user information if already watching for the game
      const foundUser = users.find(u => u.channel === message.author.id && u.game === gameID);
      // Check if removing
      if (submittedGamesArray[i].startsWith('!')) {
        if (foundUser === undefined) {
          message.author.send('I am not currently watching games for you');
          continue;
        }
        users.splice(users.indexOf(foundUser), 1);
        message.author.send('No longer watching ' + gameName);
        userUpdate();
      } else {
        if (foundUser !== undefined) {
          message.author.send('I am already watching for ' + gameName + ' for you');
          continue;
        }
        // User information
        const newUser = {
          "game": gameID,
          "gameName": gameName,
          "channel": message.author.id
        }
        users.push(newUser);
        message.author.send('Now watching ' + gameName);
        userUpdate();
      }
    }
    return;
  }
  
  // Message must mention the bot, be from the server owner, and mention exactly 1 channel
  if (message.mentions.users.has(client.user.id) && message.member.id === message.guild.ownerID && message.mentions.channels.size === 1) {
    // The game abbreviations included in the message
    const gameAbbreviationArray = message.content.match(/\!?\b(?<!\<)\w+(?!\>)\b\*?/g);
    if (gameAbbreviationArray === null) {
      message.reply('Missing parameters.');
      return;
    }
    // The mentioned channel
    let channelObj = message.mentions.channels.first();
    // Loop through all games
    for (let i = 0; i < gameAbbreviationArray.length; i++) {
      if (gameAbbreviationArray[i].endsWith('*')) {
        const name = gameAbbreviationArray[i].startsWith('!') ? gameAbbreviationArray[i].slice(1) : gameAbbreviationArray[i];
        const submittedName = name.slice(0, -1);
        let userName, userID;
        const twitchResult = await query.twitchUser(submittedName);
        if (twitchResult !== undefined) {
          userName = twitchResult.name;
          userId = twitchResult.id
        } else {
          const srcResult = await query.srcUser(submittedName);
          if (typeof srcResult === 'string') {
            message.reply(srcResult);
            return;
          }
          userName = srcResult.name;
          userId = srcResult.id;
        }
        // Grabbing runner information if already watching for the runner
        const foundRunner = runners.find(r => r.server === message.guild.id && r.channel === channelObj.id && r.runner === userId);
        // Check if removing
        if (gameAbbreviationArray[i].startsWith('!')) {
          // If not watching for the runner in the channel
          if (foundRunner === undefined) {
            message.reply('I am not currently watching for ' + userName + ' in ' + channelObj.name);
            continue;
          }
          // Remove runner from list
          runners.splice(runners.indexOf(foundRunner), 1);
          message.reply('No longer watching for ' + userName + ' in ' + channelObj.name);
          // Update list of runners
          runnerUpdate();
        } else {
          // If trying to add duplicate
          if (foundRunner !== undefined) {
            message.reply('I am already watching for ' + userName + ' in ' + channelObj.name);
            continue;
          }
          // Runner information
          const newRunner = {
            "server": message.guild.id,
            "serverName": message.guild.name,
            "channel": channelObj.id,
            "channelName": channelObj.name,
            "runner": userId,
            "runnerName": userName
          }
          // Add to runners and update the list
          runners.push(newRunner);
          message.reply('Now watching for ' + userName + ' in ' + channelObj.name);
          runnerUpdate();
        }
      } else {
        // Get game ID from abbreviation
        const abbr = gameAbbreviationArray[i].startsWith('!') ? gameAbbreviationArray[i].slice(1) : gameAbbreviationArray[i];
        const gameResult = await query.game(abbr);
        // If no game is found
        if (gameResult === undefined) {
          message.reply('No game found. Are you sure https://www.speedrun.com/' + gameAbbreviationArray[i] + ' exists?');
          continue;
        }
        const gameID = gameResult.id;
        const gameName = gameResult.names.international;
        // Grabbing server information if already watching for the game
        const foundServer = servers.find(s => s.server === message.guild.id && s.channel === channelObj.id && s.game === gameID);
        // Check if removing
        if (gameAbbreviationArray[i].startsWith('!')) {
          // If not watching for the game in the channel
          if (foundServer === undefined) {
            message.reply('I am not currently watching for ' + gameName + ' in ' + channelObj.name);
            continue;
          }
          // Remove server from list
          servers.splice(servers.indexOf(foundServer), 1);
          message.reply('No longer watching for ' + gameName + ' in ' + channelObj.name);
          // Update list of servers
          serverUpdate();
        } else {
          // If trying to add duplicate
          if (foundServer !== undefined) {
            message.reply('I am already watching for ' + gameName + ' in ' + channelObj.name);
            continue;
          }
          // Server information
          const newServer = {
            "server": message.guild.id,
            "serverName": message.guild.name,
            "channel": channelObj.id,
            "channelName": channelObj.name,
            "game": gameID,
            "gameName": gameName
          }
          // Add to servers and update the list
          servers.push(newServer);
          message.reply('Now watching for ' + gameName + ' in ' + channelObj.name);
          serverUpdate();
        }
      }
    }
  }
});

// Remove servers when kicked
client.on('guildDelete', guild => {
  const serverArray = servers.filter(s => s.server === guild.id);
  if (serverArray.length > 0) {
    serverArray.forEach(g => servers.splice(servers.indexOf(g), 1));
    serverUpdate();
  }
  const runnerArray = runners.filter(r => r.server === guild.id);
  if (runnerArray.length > 0) {
    runnerArray.forEach(r => runners.splice(runners.indexOf(r), 1));
    runnerUpdate();
  }
});

// Core function
client.setInterval(async () => {
  // Get 20 most recent verified runs
  const recentVerified = await query.verifiedRuns();
  let newVerifyTime;
  for (let i = 0; i < recentVerified.length; i++) {
    const thisRun = recentVerified[i];
    // When run was verified
    const verifyTime = await new Date(thisRun.status['verify-date']);
    // Update time to check if it's the first run
    if (i === 0) {
      if (verifiedCompareTime === undefined) verifiedCompareTime = verifyTime;
      newVerifyTime = verifyTime;
    }
    // If the run was before last first checked run, quit (but update time!)
    if (verifyTime - verifiedCompareTime <= 0) break;
    // If this game isn't being watched, skip
    let thisRunner;
    try {
      thisRunner = runnerNames.includes(thisRun.players.data[0].id);
    } catch (err) {
      thisRunner = false;
    }
    if (!verifiedGames.includes(thisRun.game.data.id) && !thisRunner) continue;
    // Name of the runner
    const runnerName = thisRun.players.data[0].rel === 'user' ? thisRun.players.data[0].names.international : thisRun.players.data[0].name;
    // Subcategory information
    const runVariables = Object.entries(thisRun.values);
    let subcategoryName = '';
    let subcategoryQuery = '';
    runVariables.forEach(v => {
      const foundVariable = thisRun.category.data.variables.data.find(c => c.id === v[0]);
      if (foundVariable['is-subcategory'] === true) {
        subcategoryName += subcategoryName === '' ? foundVariable.values.values[v[1]].label : ', ' + foundVariable.values.values[v[1]].label;
        subcategoryQuery += subcategoryQuery === '' ? '?var-' + v[0] + '=' + v[1] : '&var-' + v[0] + '=' + v[1];
      }
    });
    subcategoryName = subcategoryName === '' ? '' : ' - ' + subcategoryName;
    let categoryName, foundRun;
    if (thisRun.category.data.type === 'per-level') {
      categoryName = thisRun.level.data.name + ': ' + thisRun.category.data.name;
      const levelLeaderboard = await query.levelLB(thisRun.game.data.id, thisRun.level.data.id, thisRun.category.data.id, subcategoryQuery);
      foundRun = levelLeaderboard.find(r => r.run.id === thisRun.id);
    } else {
      categoryName = thisRun.category.data.name;
      const gameLeaderboard = await query.gameLB(thisRun.game.data.id, thisRun.category.data.id, subcategoryQuery);
      foundRun = gameLeaderboard.find(r => r.run.id === thisRun.id);
    }
    const runRank = foundRun === undefined ? 'N/A' : foundRun.place;
    // Create Discord embed
    const embed = new Discord.MessageEmbed()
      .setColor('#2A89E7')
      .setTitle(convert(thisRun.times.primary_t) + ' by ' + runnerName)
      .setThumbnail(thisRun.game.data.assets['cover-medium'].uri)
      .setURL(thisRun.weblink)
      .setAuthor(thisRun.game.data.names.international + ' - ' + categoryName + subcategoryName)
      .addField('Leaderboard Rank:', runRank)
      .addField('Date Played:', thisRun.date)
      .setTimestamp();
    // Get all channels watching this game
    let serverChannels = servers.filter(s => s.game === thisRun.game.data.id).map(c => c.channel);
    let runnerChannels = runners.filter(r => r.runner === thisRun.players.data[0].id).map(c => c.channel);
    let channels = serverChannels.concat(runnerChannels);
    // Send message
    for (let j = 0; j < channels.length; j++) {
      const thisChannel = await client.channels.fetch(channels[j]);
      await thisChannel.send(embed).then(msg => verifiedCompareTime = newVerifyTime);
    }
  }
  // Update time to check
  verifiedCompareTime = newVerifyTime;
  // Get 20 most recent submitted runs
  const recentSubmit = await query.submittedRuns();
  let newSubmitTime;
  for (let i = 0; i < recentSubmit.length; i++) {
    const thisRun = recentSubmit[i];
    // When run was submitted
    const submitTime = await new Date(thisRun.submitted);
    // Update time to check if it's the first run
    if (i === 0) {
      if (submittedCompareTime === undefined) submittedCompareTime = submitTime;
      newSubmitTime = submitTime;
    }
    // If the run was before last first checked run, quit (but update time!)
    if (submitTime - submittedCompareTime <= 0) break;
    if (!submittedGames.includes(thisRun.game.data.id)) continue;
    // Name of the runner
    const runnerName = thisRun.players.data[0].rel === 'user' ? thisRun.players.data[0].names.international : thisRun.players.data[0].name;
    // Subcategory information
    const runVariables = Object.entries(thisRun.values);
    let subcategoryName = '';
    runVariables.forEach(v => {
      const foundVariable = thisRun.category.data.variables.data.find(c => c.id === v[0]);
      if (foundVariable['is-subcategory'] === true) subcategoryName += subcategoryName === '' ? foundVariable.values.values[v[1]].label : ', ' + foundVariable.values.values[v[1]].label;
    });
    subcategoryName = subcategoryName === '' ? '' : ' - ' + subcategoryName;
    // Per-level information
    let categoryName = thisRun.category.data.type === 'per-level' ? thisRun.level.data.name + ': ' + thisRun.category.data.name : thisRun.category.data.name;
    // Create Discord embed
    const embed = new Discord.MessageEmbed()
      .setColor('#2A89E7')
      .setTitle(convert(thisRun.times.primary_t) + ' by ' + runnerName)
      .setThumbnail(thisRun.game.data.assets['cover-medium'].uri)
      .setURL(thisRun.weblink)
      .setAuthor(thisRun.game.data.names.international + ' - ' + categoryName + subcategoryName)
      .addField('Date Played:', thisRun.date)
      .setTimestamp();
    // Get all users watching this game
    let usersWatching = users.filter(u => u.game === thisRun.game.data.id).map(u => u.channel);
    // Send message
    for (let j = 0; j < usersWatching.length; j++) {
      const thisUser = await client.users.fetch(usersWatching[j]);
      await thisUser.send(embed).then(msg => submittedCompareTime = newSubmitTime);
    }
  }
  // Update time to check
  submittedCompareTime = newSubmitTime;
}, 6e4); // 60 seconds
