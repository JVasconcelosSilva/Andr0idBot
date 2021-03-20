const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");

const client = new Discord.Client();

const queue = new Map();

const repeat = false;

client.once("ready", () => {
    console.log("Pronto!");
});

client.once("reconnecting", () => {
    console.log("Reconectado!");
});

client.once("disconnect", () => {
    console.log("Desconectado!");
});

client.on("message", async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue);
        console.log("Play acionado!");
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        console.log("Skip acionado!");
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        console.log("Stop Acionado!");
        return;
    } else if (message.content.startsWith(`${prefix}repeat`)) {
        repeat(message, serverQueue);
        console.log("Repeat Acionado!");
        return;
    } else {
        message.channel.send("Que?");
        console.log(`Código não existe: ${message}`);
    }
});

async function execute(message, serverQueue) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "Você precisa estar em um canal de voz para tocar musica!"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "Eu preciso das permissões para entrar e falar no seu canal de voz."
        );
    }

    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`**${song.title}** foi adicionado a lista de reprodução!`);
    }
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Você precisa estar em um canal de voz para parar a musica!"
        );
    if (!serverQueue)
        return message.channel.send("Não tem música pra parar...");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Você precisa estar em um canal de voz para parar musica!"
        );

    if (!serverQueue)
        return message.channel.send("Não tem música pra parar...");

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Reproduzindo: **${song.title}**`);
}

function repeat(message, serverQueue) {
    return message.channel.send("Em desenvolvimento...");
    if (!message.member.voice.channel)
        return message.channel.send(
            "Você precisa estar em um canal de voz para usar esse comando!"
        );
    if (!serverQueue)
        return message.channel.send("Não tem música para repetir...");
    //serverQueue.connection.dispatcher.end();
    repeat = true;
}

client.login(token);