require('dotenv').config();
const Discord = require('discord.js');
const fetch = require("node-fetch"); 
const client = new Discord.Client();
const fs = require('fs');

var arrigoQuotes;
fs.readFile('arrigoQuotes.json', 'utf-8', (err, data) => {
    if (err) 
        throw err;

    arrigoQuotes = JSON.parse(data.toString());
});

client.on('ready', _ => console.log(`Logged in as ${client.user.tag}!`));
client.on('message', msg => {
    if(msg.content.startsWith("!arrigo "))
        handleCommand(msg);
});

client.login(process.env.TOKEN);

function handleCommand(msg)
{
    const command = msg.content.replace("!arrigo ", "").split(" ")[0];
    switch(command)
    {
        case 'ping':
            if(checkParameters(msg, "ping"))
                replyWith(msg, "Pong!", true);
            break;
        case 'help':
            if(checkParameters(msg, "help"))
                sendHelp(msg);
            break;
        case 'quote':
            if(checkParameters(msg, "quote"))
                sendRandomQuote(msg);
            break;
        case 'allQuotes':
            if(checkParameters(msg, "allQuotes"))
                sendAllQuotes(msg);
            break;
        case 'gif':
            if(checkParameters(msg, "gif"))
                sendGif(msg);
            break;
        case 'photo':
            if(checkParameters(msg, "photo"))
                sendRandomImage(msg);
            break;
        case 'addQuote':
            addQuote(msg);
            break;
        case 'playAudio':
            playAudio(msg);
            break;
        default:
            replyWith(msg, "Comando non valido!");
    }
}

const commandList = {
    "ping": "No parameters", 
    "help": "No parameters", 
    "quote": "No parameters", 
    "allQuotes": "No parameters", 
    "gif": "No parameters", 
    "photo": "No parameters",
    "addQuote": "String : quote",
    "playAudio": "Number : audio ID, [Number : volume]",
}

function checkParameters(msg, command)
{
    if(msg.content.replace("!arrigo " + command, "") != "")
    {
        msg.channel.send("Troppi parametri!");
        return false;
    }
    return true;
}

function replyWith(trigger, message, tag = false)
{
    if(tag)
        trigger.reply(message);
    else
        trigger.channel.send(message);
}

function sendRandomQuote(trigger)
{
    const index = Math.floor(Math.random() * arrigoQuotes.length);
    replyWith(trigger, arrigoQuotes[index]);
}

async function sendGif(trigger)
{
    trigger.channel.send("", {files: ["https://media.giphy.com/media/fvywuOdycSZHJ0egV0/source.gif"]});
}

async function sendRandomImage(trigger)
{
    const picCount = 5;
    const index = Math.floor(1 + (Math.random() * (picCount - 1)));
    trigger.channel.send("", {files: [`./files/${index}.png`]});
}

function sendHelp(trigger)
{
    let manual = "\n\`\`\`JSON\nEvery command start with !arrigo\n\n";

    Object.keys(commandList).forEach((key) => 
        manual += `${key}: "${commandList[key]}"\n`
    );
    manual += "\`\`\`";
    replyWith(trigger, manual, true);
}

function sendAllQuotes(trigger)
{
    let formatMessage = "";
    for(quote of arrigoQuotes)
        formatMessage += quote + "\n";
    replyWith(trigger, formatMessage); 
}

function addQuote(trigger)
{
    const parameter = trigger.content.replace("!arrigo addQuote", "").trim();
    if(parameter == "")
    {
        replyWith(trigger, "Richiesto parametro! (frase da aggiungere)"); 
        return
    }

    arrigoQuotes.push(parameter);

    const data = JSON.stringify(arrigoQuotes);
    fs.writeFile('arrigoQuotes.json', data, (err) => {
        if (err) 
            throw err;
    });

    replyWith(trigger, `Frase aggiunta: ${parameter}`); 
}

function playAudio(trigger)
{
    const parameter = trigger.content.replace("!arrigo playAudio", "").trim().split(" ");
    const ID = parameter[0];
    let vol = parameter[1] > 5 ? 5 : parameter[1];
    if(parameter == "")
    {
        replyWith(trigger, "Richiesto parametro! (Id audio)"); 
        return
    }

    const VC = trigger.member.voice.channel;
    if (!VC)
        return trigger.reply("Devi essere in una chat vocale!")
    VC.join()
        .then(connection => {
            const dispatcher = connection.play(`./audio/${ID}.mp3`, {volume: vol});
            dispatcher.on("end", end => {VC.leave()});
        })
        .catch(console.error);
}