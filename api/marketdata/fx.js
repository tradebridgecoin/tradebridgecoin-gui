
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const moment = require('moment-timezone');
const meta = require('../metadata').metadata.data;

class FXQuote {
    constructor() {
        this.provider = 'boc';
    }

    withProvider(provider){
        this.provider = provider;
        return this;
    };

    selector(line, element){
        return `body > div.wrapper > div.BOC_main > div.publish > div:nth-child(3) > table > tbody > tr:nth-child(${line}) > td:nth-child(${element})`;
    }

    isInTradingHours() {
        const category = '2';
        let cat = meta.categories[category];
        let th = meta.categories[category].tradingHours;
        let current = moment.tz(cat.timeZone);
        if(th.day.indexOf(current.format('ddd').toLowerCase()) < 0)
            return false;
        if(th.dayOff.indexOf(current.format('YYYYMMDD')) >= 0)
            return false;
        return th.time.map(m => {
            let start = moment.tz(`${current.format('YYYYMMDD')}T${m.split('-')[0].replace(':', '')}`, cat.timeZone);
            let end =   moment.tz(`${current.format('YYYYMMDD')}T${m.split('-')[1].replace(':', '')}`, cat.timeZone);
            return current.isAfter(start) && current.isBefore(end)
        }).reduce((r,a) => {r = r || a; return r}, false);
    };

    quotes(symbols) {
        let f;
        this.quotesAll()
            .then(q => f(q.filter(f => symbols.indexOf(f.symbol) >= 0)))
            .catch(err => {
                let reject = Promise.reject(err.message);
                reject.catch(e =>{});
                f(reject)
            });
        return new Promise(t => f = t)
    }

    quotesAll() {
        if(this.provider === undefined || this.provider === '')
            this.provider = 'boc';

        switch (this.provider.toLowerCase()) {
            case 'boc':
                let f;
                const fxURL = 'http://www.boc.cn/sourcedb/whpj/';
                const pairs = new Map().set("美元","USD.CNY.FX").set("日元", "JPY.CNY.FX").set("英镑", "GBP.CNY.FX").set("欧元", "EUR.CNY.FX").set("港币", "HKD.CNY.FX").set("澳大利亚元", "AUD.CNY.FX").set("新西兰元", "NZD.CNY.FX");
                let quotes = [];
                JSDOM.fromURL(fxURL).then(dom => {
                    let doc = dom.window.document;
                    let rowIdx = 2;
                    while (doc.querySelector(this.selector(rowIdx,1)) !== null){
                        let fx = doc.querySelector(this.selector(rowIdx, 1)).textContent;
                        let ask = Number(doc.querySelector(this.selector(rowIdx, 4)).textContent);
                        let bid = Number(doc.querySelector(this.selector(rowIdx, 2)).textContent);
                        let mnt = moment.tz(doc.querySelector(this.selector(rowIdx, 7)).textContent + ' ' + doc.querySelector(this.selector(rowIdx, 8)).textContent, 'YYYY-MM-DD HH:mm:ss', 'Asia/Shanghai');
                        quotes.push({symbol: fx, bid: bid, ask: ask, middle: Number(((bid + ask) / 2).toFixed(4)), moment: mnt});
                        rowIdx++;
                    }
                    quotes = quotes.filter(f => pairs.has(f.symbol)).map(m => {m.symbol = pairs.get(m.symbol); return m});
                    let usdCNY = quotes.find(f => f.symbol === 'USD.CNY.FX');
                    let usdPairs = quotes.map(m => {
                        let mid = Number((m.symbol.indexOf('JPY') >= 0 ? usdCNY.middle / m.middle : m.middle / usdCNY.middle).toFixed(4));
                        let delta = m.symbol.indexOf('JPY') >= 0 ? 0.02 : 0.0002;
                        return {
                            symbol: m.symbol.indexOf('JPY') >= 0 ? `USD.JPY.FX` : m.symbol.replace('CNY', 'USD'),
                            middle: Number(mid.toFixed(4)),
                            bid: Number((mid - delta).toFixed(4)),
                            ask: Number((mid + delta).toFixed(4)),
                            moment: m.moment
                        }
                    }).filter(f => f.symbol !== 'USD.USD.FX'); // && f.symbol !== 'HKD.USD.FX'
                    quotes.forEach(q => {
                        ['bid', 'ask', 'middle'].forEach(f => {
                            if(q.symbol !== 'JPY.CNY.FX')
                                q[f] = Number((q[f] / 100).toFixed(4))
                        });
                    });

                    f(quotes.concat(usdPairs).map(m => {m.quote = m.middle; m.timestamp = Number(m.moment.format('x')); return m}));
                });
                return new Promise(t => f = t);
            default:
                return Promise.reject(`currently provider ${this.provider} is UNSUPPORTED!`)
        }
    }
}

module.exports = FXQuote;