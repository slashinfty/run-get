const fetch = require('node-fetch');
module.exports = {
  twitchUser: async name => {
    const response = await fetch(`https://www.speedrun.com/api/v1/users?twitch=${name}`);
    const object = await response.json();
    return object.data.length === 0 ? undefined : {"name": object.data[0].names.international, "id": object.data[0].id};
  },
  srcUser: async name => {
    const response = await fetch(`https://www.speedrun.com/api/v1/users?name=${name}&max=2`);
    const object = await response.json();
    return object.data.length === 0 ? 'No user found with name ' + name : object.data.length > 1 ? 'Too many users found. Try connecting your Twitch account to speedrun.com and use that.' : {"name": object.data[0].names.international, "id": object.data[0].id};
  },
  moderatedGames: async id => {
    const response = await fetch(`https://www.speedrun.com/api/v1/games?moderator=${id}&max=200`);
    const object = await response.json();
    return object.data;
  },
  game: async abbr => {
    const response = await fetch(`https://www.speedrun.com/api/v1/games?abbreviation=${abbr}`);
    const object = await response.json();
    return object.data.length === 0 ? undefined : object.data[0];
  },
  verifiedRuns: async page => {
    const offset = page === 0 ? '' : '&offset=' + (20 * page).toString();
    const response = await fetch(`https://www.speedrun.com/api/v1/runs?status=verified&orderby=verify-date&direction=desc&embed=game,category.variables,players,level${offset}`);
    const object = await response.json();
    return object.data;
  },
  levelLB: async (game, level, category, subcategory) => {
    const response = await fetch(`https://www.speedrun.com/api/v1/leaderboards/${game}/level/${level}/${category}${subcategory}`);
    const object = await response.json();
    return object.data.runs;
  },
  gameLB: async (game, category, subcategory) => {
    const response = await fetch(`https://www.speedrun.com/api/v1/leaderboards/${game}/category/${category}${subcategory}`);
    const object = await response.json();
    return object.data.runs;
  },
  submittedRuns: async page => {
    const offset = page === 0 ? '' : '&offset=' + (20 * page).toString();
    const response = await fetch(`https://www.speedrun.com/api/v1/runs?status=new&orderby=submitted&direction=desc&embed=game,category.variables,players,level${offset}`);
    const object = await response.json();
    return object.data;
  }
}
