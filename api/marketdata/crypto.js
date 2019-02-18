
const request = require('../utility').request;
const moment = require('moment-timezone');
const FXQuote = require('./fx');
const meta = require('../metadata').metadata.data;

class CryptoQuote {
    constructor(td) {
        this.provider = 'cryptocompare'; //cryptocompare, coinmarketcap
        this.td = td;
    }

    withProvider(provider){
        this.provider = provider;
        return this;
    };

    isInTradingHours() {
        const category = '4';
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

    async quotes(symbols) {
        if(this.provider === undefined || this.provider === '')
            this.provider = 'cryptocompare';

        switch (this.provider.toLowerCase()) {
            case 'coinmarketcap': {
                let f;
                const cryptoURL = 'https://api.coinmarketcap.com/v2/ticker/';
                let body = (await request('GET', cryptoURL)).body.toString('utf-8');
                let json = JSON.parse(body).data;
                let cryptoCodes = ["1", "1027", "52", "1831", "1765", "2", "328"];
                let crypto = [];
                for(let j in json){
                    if(json.hasOwnProperty(j) && cryptoCodes.indexOf(j) >= 0)
                        crypto.push(json[j])
                }
                // crypto.forEach(console.log);
                let fx = new FXQuote();
                fx.quotesAll().then(pairs => {
                    let ethUSD = crypto.find(f => f.symbol === 'ETH');
                    let usdCNY = pairs.find(f => f.symbol === 'USD.CNY.FX');
                    let ethFiat = pairs.map(m => {
                        return {
                            timestamp: moment(ethUSD.last_updated * 1000).tz('UTC').isBefore(m.moment) ? m.moment.tz('UTC') : moment(ethUSD.last_updated * 1000).tz('UTC'),
                            crypto: 'ETH',
                            fiat: m.symbol.replace('CNY', '').replace('FX', '').replace('.', '').replace('.', ''),
                            rate: usdCNY.middle / m.middle * Number(ethUSD.quotes.USD.price),
                            bid: usdCNY.bid / m.ask * Number(ethUSD.quotes.USD.price),
                            ask: usdCNY.ask / m.bid * Number(ethUSD.quotes.USD.price)
                        }
                    });
                    // ethFiat.forEach(console.log);
                    let fd = new TD(this.account, '');
                    fd.query_token_price(1, 1).then(longPrice => {
                        fd.query_token_price(-1, 1).then(shortPrice => {
                            ethFiat.forEach(m => {
                                m.crypto = 'TBC';
                                m.rate = (m.rate / ((longPrice / 1e6 + shortPrice / 1e6) / 2)).toFixed(4);
                                m.bid = (m.bid / (shortPrice / 1e6)).toFixed(4);
                                m.ask = (m.ask / (longPrice / 1e6)).toFixed(4);
                            });
                            ethFiat.push({
                                timestamp: moment(ethUSD.last_updated * 1000).tz('UTC').isBefore(usdCNY.moment) ? usdCNY.moment : moment(ethUSD.last_updated * 1000).tz('UTC'),
                                crypto: 'TBC',
                                fiat: 'CNY',
                                rate: Number((usdCNY.middle * Number(ethUSD.quotes.USD.price) / 100 / ((longPrice / 1e6 + shortPrice / 1e6) / 2)).toFixed(4)),
                                bid: Number((usdCNY.bid * Number(ethUSD.quotes.USD.price) / 100 / (shortPrice / 1e6)).toFixed(4)),
                                ask: Number((usdCNY.ask * Number(ethUSD.quotes.USD.price) / 100 / (longPrice / 1e6)).toFixed(4))
                            });
                            let crptoCNY = crypto.map(m => {
                                return {
                                    timestmap: moment(m.last_updated * 1000).tz('UTC'),
                                    crypto: m.symbol,
                                    fiat: 'CNY',
                                    rate: Number((usdCNY.middle / 100 * Number(m.quotes.USD.price)).toFixed(4)),
                                    bid: Number((usdCNY.middle / 100 * Number(m.quotes.USD.price)).toFixed(4)),
                                    ask: Number((usdCNY.middle / 100 * Number(m.quotes.USD.price)).toFixed(4))
                                };
                            });
                            let cryptoFiat = pairs.map(pair => {return crypto.map(m => {
                                return {
                                    timestmap: moment(m.last_updated * 1000).tz('UTC'),
                                    crypto: m.symbol,
                                    fiat: pair.symbol.replace('CNY', '').replace('FX', '').replace('.', '').replace('.', ''),
                                    rate: Number((usdCNY.middle / pair.middle * Number(m.quotes.USD.price)).toFixed(4)),
                                    bid: Number((usdCNY.bid / pair.ask * Number(m.quotes.USD.price)).toFixed(4)),
                                    ask: Number((usdCNY.ask / pair.bid * Number(m.quotes.USD.price)).toFixed(4))
                                };
                            })});
                            f(ethFiat.concat(crptoCNY).concat([].concat.apply([], cryptoFiat)).filter(f => symbols.indexOf(`${f.crypto}.${f.fiat}.CRYPTO`) >= 0));
                        })
                    });
                });


                return new Promise(t => f = t);}
            case 'cryptocompare': {
                let f;
                let arr = [];
                let fxPairs = await new FXQuote().quotesAll();

                let cryptoCurs = new Set(symbols.map(m => m.split('.')[0].toUpperCase().replace("TBC", 'ETH')));
                if(symbols.some(m => m.split('.')[1].toUpperCase() === 'TBC'))
                    cryptoCurs.add('ETH');
                let cryptoQuotes = new Map();
                for(let cyp of cryptoCurs){
                    const cryptoURL = `https://min-api.cryptocompare.com/data/price?fsym=${cyp}&tsyms=USD`;
                    let body = await request('GET', cryptoURL);
                    cryptoQuotes.set(cyp, JSON.parse(body.body.toString('utf-8')));
                }
                this.td.query_token_price(1, 1).then(async longPrice => {
                    let shortPrice = longPrice;
                    for(let symbol of symbols){
                        let crypto = symbol.split('.')[0].toUpperCase();
                        let c = crypto === 'TBC' ? 'ETH' : crypto;
                        let fiat = symbol.split('.')[1].toUpperCase();
                        let json = cryptoQuotes.get(c);

                        let fxRate;
                        switch(fiat){
                            case 'CNY':
                                fxRate = fxPairs.find(f => f.symbol === 'USD.CNY.FX');
                                break;
                            case 'JPY':
                                fxRate = fxPairs.find(f => f.symbol === 'USD.JPY.FX');
                                break;
                            case 'USD':
                                fxRate = {bid: 0.9975, ask: 1.0025, middle: 1};
                                break;
                            case 'TBC':
                                fxRate = {middle: 1 / cryptoQuotes.get('ETH')['USD'] * (shortPrice / 1e6)};
                                fxRate.bid = fxRate.middle * 0.9975;
                                fxRate.ask = fxRate.middle * 1.0025;
                                break;
                            default:
                                fxRate = JSON.parse(JSON.stringify(fxPairs.find(f => f.symbol === `${fiat}.USD.FX`)));
                                ['bid', 'ask', 'middle'].forEach(f => fxRate[f] = 1 / fxRate[f]);
                                break;
                        }

                        if (crypto === 'TBC') {
                            let re = {
                                moment: moment.tz('UTC'),
                                crypto: 'TBC',
                                fiat: fiat,

                                rate: Number(json['USD']) * fxRate.middle,
                                bid: Number(json['USD']) * fxRate.bid,
                                ask: Number(json['USD']) * fxRate.ask
                            };
                            re.rate = Number((re.rate / ((longPrice / 1e6 + shortPrice / 1e6) / 2)).toFixed(4));
                            re.bid = Number((re.bid / (longPrice / 1e6)).toFixed(4));
                            re.ask = Number((re.ask / (shortPrice / 1e6)).toFixed(4));

                            arr.push(re);
                        }else{
                            arr.push({
                                moment: moment.tz('UTC'),
                                crypto: crypto,
                                fiat: fiat,

                                rate: Number((Number(json['USD']) * fxRate.middle).toFixed(4)),
                                bid: Number((Number(json['USD']) * fxRate.bid).toFixed(4)),
                                ask: Number((Number(json['USD']) * fxRate.ask).toFixed(4))
                            });
                        }
                    }
                    f(arr.filter(f => !isNaN(f.rate)).map(m => {m.symbol = `${m.crypto.toUpperCase()}.${m.fiat.toUpperCase()}.CRYPTO`; m.quote = m.rate; m.timestamp = Number(m.moment.format('x')); return m}));
                });

                return new Promise(t => f = t);
                }
            default:
                return Promise.reject(`currently provider ${this.provider} is UNSUPPORTED!`);
        }
    }
}

module.exports = CryptoQuote;