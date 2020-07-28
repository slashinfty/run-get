[Invite](https://discordapp.com/oauth2/authorize?client_id=731961127239680051&scope=bot) the bot to your Discord server.

## What It Does

It sends information on recently verified speedruns for any game or runner (on speedrun.com) that you pick.

![Screenshot of embed](static/screenshot2.png)

Additionally, it can DM you recent submissions for any game.

## Setting Up Verified Runs

Once RUN GET is in your server, you need to assign it a channel to send messages to, and tell it one or more games or runners to watch. Simply send a message mentioning RUN GET, mention the channel you want RUN GET to post in, and any number of games or runners you want it to watch.

![Screenshot of setup](static/screenshot1.png)

In order to identify a game, send the game abbreviation from speedrun.com. For instance, if you want RUN GET to watch for new The Legend of Zelda: A Link to the Past runs, and you know the leaderboard is `https://www.speedrun.com/alttp`, then you'd use `alttp`.

In order to identify a runner, send the speedrun.com user name (or Twitch user name, if you've linked it to speedrun.com) with an `*` at the end, such as `dadinfinitum*`.

You must only mention one channel in your message. However, you can include more than one game or runner. If you want to remove a game, add a `!` before the game abbreviation, like `!alttp`.

If you want to know what games are being watched by RUN GET, just type `?rungetgames`. If you want the list to include the channels, add a `!` to the end: `?rungetgames!`.

**Important Note:** Only server owners can set up RUN GET. Additionally, make sure the bot has permission to send embeds.

## Setting up Submitted Runs

There are two ways to have RUN GET send you new submissions for any particular game.

You can DM the bot with game abbreviations, just as you would to get verified runs. This includes using `!` to remove a game.

You can DM the bot your speedrun.com user name (or Twitch user name, if you've linked it to speedrun.com) with an `*` at the end, such as `dadinfinitum*`. The bot will search for your name on speedrun.com, then add all games that you are a moderator for.

The `?rungetgames` command works via DM, and will return all games that are being watched by RUN GET.

## Running the Bot Yourself

You will need Node.js (nvm is recommended) and yarn. Clone the repository, run `yarn install`, add your Discord API token to `config.js`, then `node index.js` to start the bot.

## Problems?

Submit an issue on [GitHub](https://github.com/slashinfty/run-get/issues/new). If the bot is down for an extended time, reach out to [dad infinitum](https://twitter.com/_dadinfinitum) on Twitter.

## Related Bot

Want to be able to look up speedrunning world records and personal bests in your Discord server? Maybe get a list of categories or category rules? Check out [srcom-bot](https://slashinfty.github.io/srcom-bot).

## Changelog

25 July 2020 - Bot can now DM newly submitted runs.

17 July 2020 - Runs now have a leaderboard rank in the embed.

13 July 2020 - Added `?rungetgames` command. Adding multiple games doesn't short circuit if there's a duplicate.

12 July 2020 - Initial release.
