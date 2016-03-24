'use strict';
const fs = require('fs');
const path = require('path');
const ask = require('vow-asker');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
const CHECK_TIMEOUT = 30000;

let config = process.env.CONFIG || path.resolve(__dirname, 'config.json');
let flag;

if ( ! fs.existsSync(config)) {
    console.error(`Config ${config} not found`);
    process.exit(1);
}

config = require(config);

const bot = new TelegramBot(config.token, { polling: true });

function checkTime() {
    const hours = new Date().getHours();

    if (hours === 14) {
        if ( ! flag) {
            flag = true;

            invite();
        }
    } else {
        flag = false;
    }
}

function sendMenu(to) {
    ask({
        host: 'menu.poliyana.ru',
        timeout: 60000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
        }
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

function invite() {
    bot.sendMessage(config.chat_id, 'Обед?');
    sendMenu(config.chat_id);
}

bot.onText(/^\/menu$/, (msg, match) => {
    sendMenu(config.chat_id);
    //sendMenu(msg.from.id);
});

bot.onText(/^\/source$/, (msg, match) => {
    bot.sendMessage(config.chat_id, 'https://github.com/asterx/burger-bot');
});

setInterval(checkTime, CHECK_TIMEOUT);
