const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");
const { verifyCommandPermission } = require("./VerifyCommandPermission.js");

const client = new Discord.Client();

const queue = new Map();

var loop = 0;
var songQueue = 0;

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

    if (message.content.startsWith(`${prefix}p`)) {
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
    } else if (message.content.startsWith(`${prefix}loop`)) {
        loopQueue(message, serverQueue);
        console.log(`Loop Acionado! condition: ${loop}`);
        return;
    } else if (message.content.startsWith(`${prefix}test`)) {
        test(message, serverQueue);
        console.log("Test Acionado!");
        return;
    } else if (message.content.startsWith(`${prefix}queue`)) {
        queueList(message, serverQueue);
        console.log("Queue Acionado!");
        return;
    } else if (message.content.startsWith(`${prefix}clear`)) {
        if (serverQueue != null) {
            loop = 0
            serverQueue.songs = [];
            message.channel.send("Lista de reprodução limpa!");
        } else {
            message.channel.send("Não há lista de reprodução!");
        }
        console.log("Clear Acionado!");
        return;
    } else if (message.content.startsWith(`${prefix}jump to`)) {
        jumpTo(message, serverQueue);
        console.log("JumpTo Acionado!");
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
    if (loop == 0 && !song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {

            switch (loop) {
                case 0:
                    songQueue++;
                    try {
                        play(guild, serverQueue.songs[songQueue]);
                    } catch (Exception) {
                        // Desconectar o bot
                        // Limpa o queue
                        // serverQueue.songs = [];
                        serverQueue.connection.dispatcher.end();
                    }
                    break;
                case 1:
                    songQueue++;
                    try {
                        play(guild, serverQueue.songs[songQueue]);
                    } catch (Exception) {
                        songQueue = 0
                        play(guild, serverQueue.songs[songQueue]);
                    }
                    break;
                case 2:
                    // TODO Repetir o som atual
                    play(guild, serverQueue.songs[songQueue]);
                    break;
            }

        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Reproduzindo: **${song.title}**`);
}

function loopQueue(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Você precisa estar em um canal de voz para usar esse comando!"
        );
    if (!serverQueue)
        return message.channel.send("Não tem música para repetir...");

    // TODO Orientar a objetos
    // VerifyCommandPermission verifyCommandPermission = new VerifyCommandPermission();
    // verifyCommandPermission.canUseCommand(serverQueue);

    var loopMessage = "";
    switch (loop) {
        case 0:
            loop = 1;
            loopMessage = "Repetindo a lista de reprodução!";
            break;
        case 1:
            loop = 2;
            loopMessage = "Repetindo o som atual!";
            break;
        case 2:
            loop = 0;
            loopMessage = "Repetir desativado!";
            break;
    }
    serverQueue.textChannel.send(loopMessage);
}

function test(message, serverQueue) {
    serverQueue.voiceChannel.loop;
    console.log(`serverQueue: ${serverQueue}`);
    console.log(serverQueue);
    console.log(`serverQueue.voiceChannel: ${serverQueue.voiceChannel}`);
    console.log(serverQueue.voiceChannel);
    console.log(`message: ${message}`);
    console.log(message);
    return message.channel.send("Em desenvolvimento...");
}

function queueList(message, serverQueue) {

    if (!message.member.voice.channel)
        return message.channel.send(
            "Você precisa estar em um canal de voz para ver a lista de reprodução!"
        );
    if (!serverQueue)
        return message.channel.send("Nenhuma lista de reprodução...");

    var queueList = "";
    var songNumber = 0;
    serverQueue.songs.forEach(song => {
        songNumber++;
        song.title
        if (songQueue == songNumber - 1) {
            queueList += `**${songNumber}** - **${song.title}**\n`;
        } else {
            queueList += `**${songNumber}** - ${song.title}\n`;
        }

    });
    return message.channel.send(`**Lista de Reprodução**\n ${queueList}`);
}

function jumpTo(message, serverQueue) {

    if (!message.member.voice.channel)
        return message.channel.send(
            "Você precisa estar em um canal de voz para utilizar esse comando"
        );
    if (!serverQueue)
        return message.channel.send("Nenhuma lista de reprodução...");

    var songNumber = message.content.trim().slice(-1);

    console.log("songNumber");
    console.log(songNumber);
    console.log("serverQueue.songs.length");
    console.log(serverQueue.songs.length);

    if (serverQueue.songs.length < songNumber || songNumber <= 0)
        return message.channel.send("Índice não encontrado na lista de reprodução.");

    songQueue = songNumber - 1;

    var test = serverQueue.songs[songQueue];
    console.log(test);

    return play(message.guild, serverQueue.songs[songQueue]);
}

client.login(token);