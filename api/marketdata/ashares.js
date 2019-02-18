const request = require('../utility').request;
const moment = require('moment-timezone');
const meta = require('../metadata').metadata.data;

class AShare {
    constructor() {
        this.provider = '163_api';
    }

    withProvider(provider){
        this.provider = provider;
        return this;
    };

    isInTradingHours() {
        const category = '1';
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

    async quotes(sybmols) {
        if(this.provider === undefined || this.provider === '')
            this.provider = '163_api';

        switch (this.provider.toLowerCase()) {
            case '163_api':
                const apiURL = 'http://api.money.126.net/data/feed/';
                let s = sybmols.slice(0, 600).map(m => {
                    let ex = m.split('.');
                    switch(ex.slice(-1)[0].toUpperCase()){
                        case 'SS':
                            return '0' + ex[0];
                        case 'SZ':
                            return '1' + ex[0];
                    }
                });
                let body;
                try{
                    let rsp = await request('GET', apiURL + s.join(','));
                    body = rsp.body.toString('utf-8').replace('_ntes_quote_callback(', '').replace(');', '');
                }catch (err){
                    return new Error('error in retrieving info')
                }
                if(body === '{ }')
                    return new Error('error in retrieving info');

                let json = JSON.parse(body);
                let stocks = [];
                for(let stock in json) {
                    if (json.hasOwnProperty(stock)) {
                        json[stock].symbol = json[stock].symbol + '.' + json[stock].type.replace('SH', 'SS');
                        json[stock].moment = moment.tz(json[stock].update.replace(/\//g, '-'), 'Asia/Shanghai');
                        json[stock].quote = json[stock].price;
                        json[stock].ask = json[stock].ask1 === 0 ? (json[stock].bid1 === 0 ? Number(( Math.max(0.1, json[stock].price * 0.001) + json[stock].price).toFixed(2)) : 0) : json[stock].ask1;
                        json[stock].bid = json[stock].bid1 === 0 ? (json[stock].ask1 === 0 ? Number((-Math.max(0.1, json[stock].price * 0.001) + json[stock].price).toFixed(2)) : 0) : json[stock].bid1;
                        json[stock].timestamp = Number(json[stock].moment.format('x'));
                        stocks.push(json[stock]);
                    }
                }
                return stocks;
            default:
                return new Error(`currently provider ${this.provider} is UNSUPPORTED!`);
        }
    }
}

module.exports = AShare;