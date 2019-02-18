const moment = require('moment-timezone');
const eachCons = require('each-cons');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const request = require('../utility').request;
const meta = require('../metadata').metadata.data;
// const request = require('sync-request');

const quoteUrl = "http://hq.sinajs.cn/list=";
const shiborURL = 'http://www.shibor.org/shibor/web/html/shibor.html';
const fields = ["bidVol", "bid", "last", "ask", "askVol", "openInterests", "percent", "strike", "prevClose", "open", "upperLimit", "lowerLimit", "ask5", "askVol5", "ask4", "askVol4", "ask3", "askVol3", "ask2", "askVol2", "ask1", "askVol1", "bid5", "bidVol5", "bid4", "bidVol4", "bid3", "bidVol3", "bid2", "bidVol2", "bid1", "bidVol1", "timestamp", "primaryFront", "statusCode", "underlyingCategory", "underlying", "shortName", "dailyBand", "high", "low", "volume", "turnover", "adjusted"];
const minsYear = moment.duration(365, 'day').as('minutes'); //525600;
const minsMonth = moment.duration(30, 'day').as('minutes');

class IVX {
    constructor(){
        this.provider = 'sina_api';
        this.rCache = 0;
    }

    withProvider(provider){
        this.provider = provider; //currently specifying provider is not supported
        return this;
    }

    isInTradingHours() {
        const category = '3';
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

    async shibor3m() {
        let contents;
        try{
            contents = (await request('GET', shiborURL)).body.toString('utf-8')
        }catch (err){
            try{
                contents = (await request('GET', shiborURL)).body.toString('utf-8')
            }catch (err){
                console.log('Error in querying shibor in order to calculate IVX.SS, please try again later on!\n' + err)
            }
        }
        let dom = new JSDOM(contents);
        let doc = dom.window.document;
        let shibor3m = Number(doc.querySelector('div > table > tbody > tr:nth-child(2) > td > table.shiborquxian > tbody > tr:nth-child(4) > td:nth-child(3)').textContent) / 100;
        let updateTime = doc.querySelector('div > table > tbody > tr:nth-child(1) > td > table > tbody > tr > td').textContent;
        return [shibor3m, updateTime];
    }

    buildMap(obj) {
        let map = new Map();
        Object.keys(obj).forEach(key => {
            map.set(Number(key), obj[key]);
        });
        return map;
    }

    buildMapStr(obj) {
        let map = new Map();
        Object.keys(obj).forEach(key => {
            map.set(key, obj[key]);
        });
        return map;
    }

    strMapToObj(strMap) {
        let obj = Object.create(null);
        for (let [k,v] of strMap) {
            // We don’t escape the key '__proto__'
            // which can cause problems on older engines
            obj[k] = v;
        }
        return obj;
    }

    optionsListUrls(callPut, month) {
        let url = "http://hq.sinajs.cn/list=OP_";
        switch (callPut) {
            case 1:
                url = url + "UP_510050" + month;
                break;
            case -1:
                url = url + "DOWN_510050" + month;
                break;
        }
        // console.log(url);
        return url;
    }

    expiry(year, monthOfYear) {
        let m = moment.tz('Asia/Shanghai');
        m.set('year', year);
        m.set('month', monthOfYear - 1);
        m.set('date', 1);
        m.startOf('day');

        let x = m.get('weekday');

        switch (true){
            case x <= 3:
                m.set('date', 3 * 7 + 5 - m.get('weekday') - 1);
                break;
            case x <= 6:
                m.set('date', 4 * 7 - (m.get('weekday') - 4));
                break;
        }
        return m;
    }

    expiry_yymm(yyMM){
        return this.expiry(20 + "" + yyMM.substring(0, 2), yyMM.substring(2));
    }

    rspToObj(rsp, call_put, yymm){
        let rspJson = this.strMapToObj(fields.map((fd, i) => [fd, rsp[i]]));
        let p;
        if(rspJson.volume > 0 && rspJson.bid > 0 && rspJson.ask > 0 && (rspJson.last > rspJson.ask || rspJson.last < rspJson.bid))
            p = (Number(rspJson.bid) + Number(rspJson.ask)) / 2;
        else if(rspJson.volume > 0 && rspJson.bid > 0 && rspJson.ask > 0)
            p = rspJson.last;
        else if(rspJson.volume > 0 && rspJson.bid > 0 && rspJson.ask === 0)
            p = Math.max(rspJson.last, rspJson.bid);
        else if(rspJson.volume > 0 && rspJson.bid === 0 && rspJson.ask > 0)
            p = Math.min(rspJson.last, rspJson.ask);
        else if(rspJson.volume > 0 && rspJson.bid === 0 && rspJson.ask === 0)
            p = rspJson.last;
        else if(rspJson.volume === 0 && rspJson.bid > 0 && rspJson.ask > 0 )
            p = (Number(rspJson.bid) + Number(rspJson.ask)) / 2;
        else if(rspJson.volume === 0 && rspJson.bid > 0 && rspJson.ask === 0)
            p = Math.max(rspJson.bid, rspJson.prevClose);
        else if(rspJson.volume === 0 && rspJson.bid === 0 && rspJson.ask > 0 )
            p = Math.min(rspJson.ask, rspJson.prevClose);
        else if(rspJson.volume === 0 && rspJson.bid === 0 && rspJson.ask === 0 )
            p = rspJson.prevClose;
        else //applicable right before the market opens when all current bid/ask/volume quotes are initialized and reset to 0
            p = rspJson.prevClose;

        return {
            timestamp: moment.tz(rspJson.timestamp, 'Asia/Shanghai'),
            price: Number(p),
            strike: Number(rspJson.strike),
            callPut: call_put,
            expiry: this.expiry_yymm(yymm),
            adjusted: rspJson.adjusted
        };
    }

    async ivx() {
        if(this.provider === undefined || this.provider === '')
            this.provider = 'sina_api';

        switch (this.provider.toLowerCase()) {
            case 'sina_api': {
                let last = (await request('GET', 'http://hq.sinajs.cn/list=sh000300')).body.toString('utf-8').split('=')[1].replace(/"/g, '').replace(',;\n','').split(',').slice(-3)[0];
                let cur = moment.tz(last || moment().tz('Asia/Shanghai').format('YYYY-MM-DD'), 'Asia/Shanghai');
                let expiration = this.expiry(cur.get('year'), cur.get('month') + 1);
                // console.log(expiration);
                let primaryMon, nextMon;
                if (cur.clone().add(7, 'day').isBefore(expiration)){
                    primaryMon = cur.format("YYMM");
                    nextMon = cur.add(1, 'month').format("YYMM")
                } else {
                    primaryMon = cur.add(1, 'month').format("YYMM");
                    let mons=[2,5,8,11];
                    while(mons.indexOf(cur.add(1, 'month').get('month')) === -1);
                    nextMon = cur.format("YYMM");
                }
                // console.log(primaryMon, nextMon);
                let callCodes = await Promise.all([primaryMon, nextMon].map(async f => {
                    return [f, (await request('GET', this.optionsListUrls(1, f))).body.toString('utf-8').split('=')[1].replace(/"/g, '').replace(',;\n','').split(',')]
                }));
                let putCodes = await Promise.all([primaryMon, nextMon].map(async f => {
                    return [f, (await request('GET', this.optionsListUrls(-1, f))).body.toString('utf-8').split('=')[1].replace(/"/g, '').replace(',;\n','').split(',')]
                }));
                // console.log(callCodes, putCodes);

                let calls = new Map(await Promise.all(Array.from(callCodes, async m => [m[0], await Promise.all(Array.from(m[1],async mm => {
                        let rsp = (await request('GET', quoteUrl + mm)).body.toString('utf-8').split('=')[1].replace(/"/g, '').replace(';\n','').split(',');
                        return this.rspToObj(rsp, 1, m[0]);
                    }
                ))])));
                let puts = new Map(await Promise.all(Array.from((putCodes), async m => [m[0], await Promise.all(Array.from(m[1], async mm => {
                        let rsp = (await request('GET', quoteUrl + mm)).body.toString('utf-8').split('=')[1].replace(/"/g, '').replace(';\n','').split(',');
                        return this.rspToObj(await Promise.all(rsp), -1, m[0]);
                    }
                ))])));

                let callsLatest = ([].concat.apply([], Array.from(calls.values()))).sort((p,c) => c.timestamp.isAfter(p.timestamp) ? 1 : -1)[0].timestamp;
                let putsLatest =  ([].concat.apply([], Array.from( puts.values()))).sort((p,c) => c.timestamp.isAfter(p.timestamp) ? 1 : -1)[0].timestamp;

                let lastTimestamp = callsLatest.isAfter(putsLatest) ? callsLatest : putsLatest;

                let r = (await this.shibor3m())[0];
                if(r === undefined || r === null){
                    if(this.rCache !== 0)
                        r = this.rCache;
                    else
                        r = 0.035;
                } else
                    this.rCache = r;

                let lambdas = [primaryMon, nextMon].map(m => {
                    if(!(calls.get(m) && puts.get(m))){
                        console.log(`calls or puts don't have ${m}`);
                        return undefined;
                    }
                    try {
                        let nt = calls.get(m)[0].expiry.diff(lastTimestamp, 'minutes');
                        let t = nt / minsYear;
                        let unioned = this.buildMapStr(calls.get(m).concat(puts.get(m)).reduce((r, a) => {
                            r[`${a.strike}_${a.adjusted}`] = r[`${a.strike}_${a.adjusted}`] || [];
                            r[`${a.strike}_${a.adjusted}`].push(a);
                            return r;
                        }, Object.create(null))); //group unioned by strike
                        let s_minCPdif = Array.from(unioned).reduce((p, c) =>
                                p[1] < Math.abs(c[1][1].price - c[1][0].price) ?
                                    [p[0], Math.abs(p[1]), p[2]] :
                                    [Number(c[0].split('_')[0]), Math.abs(c[1][1].price - c[1][0].price), c[1][0].price - c[1][1].price]
                            , [0, 10000]);
                        let f = s_minCPdif[0] + s_minCPdif[2] * Math.exp(r * t);
                        let k0 = calls.get(m).sort((p, c) => c.strike - p.strike).find(fn => fn.strike < f).strike;
                        let sorted = Array.from(unioned).sort((p, c) => Number(p[0].split('_')[0]) - Number(c[0].split('_')[0]));
                        sorted.push([0, []]);
                        sorted.unshift([0, []]);
                        let lambda = eachCons(sorted, 3).map(mp => {
                            let deltaKi;
                            let strike = Number(mp[1][0].split('_')[0]);
                            if (strike === Number(sorted[1][0].split('_')[0]))
                                deltaKi = Number(mp.slice(-1)[0][0].split('_')[0]) - strike;
                            else if (strike === Number(sorted.slice(-2)[0][0].split('_')[0]))
                                deltaKi = strike - Number(mp[0][0].split('_')[0]);
                            else
                                deltaKi = (Number(mp.slice(-1)[0][0].split('_')[0]) - Number(mp[0][0].split('_')[0])) / 2;

                            let pKi;
                            let x = strike;
                            switch (true) {
                                case x < k0:
                                    pKi = mp[1][1].find(m => m.callPut === -1).price;
                                    break;
                                case x > k0:
                                    pKi = mp[1][1].find(m => m.callPut === 1).price;
                                    break;
                                case x === k0:
                                    pKi = mp[1][1].map(m => m.price).reduce((r, a) => {
                                        r += a;
                                        return r;
                                    }, 0) / 2; //reduce works as sum
                                    break;
                            }
                            return deltaKi / Math.pow(strike, 2) * Math.exp(r * t) * pKi;
                        }).reduce((r, a) => {
                            r += a;
                            return r;
                        }, 0) * 2 / t - Math.pow(f / k0 - 1, 2) / t;
                        return {lambda: lambda, nt: nt, t: t};
                    } catch (e) {
                        console.log('lambda error line:\t' + e.lineNumber);
                        console.log('lambda error:\t' + e);
                        return undefined
                    }
                });

                let value;
                if(lambdas.some(s => s === undefined))
                    value = 0;
                else if(calls.get(primaryMon)[0].expiry.diff(lastTimestamp, 'days') >= 30)
                    value = 100 * Math.sqrt(lambdas[0].lambda);
                else
                    value = 100 * Math.sqrt(
                        (
                            lambdas[0].t * lambdas[0].lambda * ((lambdas.slice(-1)[0].nt - minsMonth) / (lambdas.slice(-1)[0].nt - lambdas[0].nt)) +
                            lambdas.slice(-1)[0].t * lambdas.slice(-1)[0].lambda * (minsMonth - lambdas[0].nt) / (lambdas.slice(-1)[0].nt - lambdas[0].nt)
                        ) * 365 / 30
                    );

                let bid_ask_1 = Number((Math.round(value / 0.05) * 0.05).toFixed(2));
                let bid_ask_2 = value >= bid_ask_1 ? Number((bid_ask_1 + 0.05).toFixed(2)) : Number((bid_ask_1 - 0.05).toFixed(2));

                if(value === 0){
                    console.log(`last:\t${last}`);
                    console.log(`[primaryMon, nextMon]:\t${[primaryMon, nextMon]}`);
                    console.log(`r:\t${r}`);
                    console.log('callCodes');
                    console.log(...callCodes);
                    console.log('putCodes');
                    console.log(...putCodes);
                    console.log('calls');
                    console.log(JSON.stringify(Array.from(calls)));
                    console.log('puts');
                    console.log(JSON.stringify(Array.from(puts)));
                    console.log('lambda');
                    console.log(JSON.stringify(lambdas));
                }

                return {symbol: 'IVX.SS', quote: bid_ask_1, value: bid_ask_1, bid: Math.min(bid_ask_1, bid_ask_2), ask: Math.max(bid_ask_1, bid_ask_2), moment: lastTimestamp, timestamp: Number(lastTimestamp.format('x'))};
            }
        }
    }
}

module.exports = IVX;