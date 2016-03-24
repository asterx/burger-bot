'use strict';
const fs = require('fs');
const path = require('path');
const ask = require('vow-asker');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
const UA = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36';
const CHECK_TIMEOUT = 60000;
const INVITE_HOUR = 14;
const halo = [ 'Обед?', 'Кушать?', 'Го в лето?' ];
const help = `
/menu - показать меню Лето на поляне
/source - ссылка на исходники
/help - хелп
`;

let config = process.env.CONFIG || path.resolve(__dirname, 'config.json');
let flag;

if ( ! fs.existsSync(config)) {
    console.error(`Config ${config} not found`);
    process.exit(1);
}

config = require(config);

const bot = new TelegramBot(config.token, { polling: true });

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function checkTime() {
    const now = new Date();
    const day = now.getDay();

    // Mon-Fri
    if ( ! day || day > 5) {
        return;
    }

    const hours = now.getHours();

    if (hours === INVITE_HOUR) {
        if ( ! flag) {
            flag = true;

            invite(config.chat_id);
        }
    } else {
        flag = false;
    }
}

function sendMenu(to) {
    ask({
        host: 'menu.poliyana.ru',
        timeout: 60000,
        headers: { 'User-Agent': UA },
    })
    .then(res => {
        const $ = cheerio.load(res.data.toString());
        const titles = [ 'Первые блюда', 'Горячие блюда', 'Гарниры' ];

        let menu = '';

        $('.box')
            .filter((i, elem) => {
                const title = $(elem).find('.boxTitle').text();

                return titles.indexOf(title) !== -1;
            })
            .each((i, elem) => {
                menu += $(elem).find('.boxTitle').text() + ':\n' +
                    $(elem).find('.itemName').map((i, el) => { return '  ' + $(el).text() + '\n' }).get().join('') + '\n';
            });

        if (menu) {
            menu = '*Сегодня в Лето*\n' + menu;
            bot.sendMessage(to, menu, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(to, 'Увы, меню недоступно');
        }
    })
    .fail(err => {
        bot.sendMessage(to, 'Увы, меню недоступно');
    });
}

function invite(to) {
    bot.sendMessage(to, halo[rand(0, halo.length - 1)]);
    sendMenu(to);
}

bot.onText(/^\/menu$/, (msg, match) => {
    sendMenu(msg.chat.id);
});

bot.onText(/^\/help$/, (msg, match) => {
    bot.sendMessage(msg.chat.id, help);
});

bot.onText(/^\/source$/, (msg, match) => {
    bot.sendMessage(msg.chat.id, 'https://github.com/asterx/burger-bot');
});

setInterval(checkTime, CHECK_TIMEOUT);
