const body = document.getElementsByTagName('BODY')[0];
const start = document.getElementById('start');
const end = document.getElementById('end');
const retrieveButton = document.getElementById('retrieve');

const { remote } = require('electron');
const moment = require('moment-timezone');

let account;

function getParam(name){
    if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(remote.getCurrentWebContents().getURL()))
        return decodeURIComponent(name[1]);
}

const createTable = (data) => {
    const table = document.createElement("table");
    const header = document.createElement("thead");
    const head_tr = document.createElement("tr");
    head_tr.class = "table100-head";
    const keys=Object.keys(data[0]);
    console.log(keys);
    for(const key of keys){
        const th=document.createElement("th");
        th.class="column1";
        th.style.color = "white";
        th.appendChild(document.createTextNode(key));
        head_tr.appendChild(th);
        header.appendChild(head_tr);
    }
    table.border = '1';
    table.appendChild(header);
    for(const row of data) {
        const tr = document.createElement("tr");
        for(const key of keys){
            const td = document.createElement("td");
            td.class = "column1";
            const content=row[key] ||'';
            if(content.toString().toLowerCase().startsWith('0x')){
                const div=document.createElement("div");
                div.style.resize = "horizontal";
                div.style.overflow = "hidden";
                div.style.width = "100px";
                div.appendChild(document.createTextNode(content));
                td.appendChild(div);
                tr.appendChild(td);
            }else{
                td.appendChild(document.createTextNode(content));
                tr.appendChild(td);
            }


            delete row[key]
        }
        /****
         you can omit next cycle if all object have the same structor or if the first element of collection have all fields
         ****/
        for(let key of Array.from(row)){
            const th=document.createElement("th");
            th.appendChild(document.createTextNode(key));
            keys.push(key);
            header.appendChild(th);
            const td = document.createElement("td");
            const content=row[key] ||'';
            td.appendChild(document.createTextNode(content));
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    return table
};

let populateData = (trades) => {
    //populate trades table
    let toDrop = ['timestamp', 'account', 'firstRoR', 'negativeBalance', 'preROR'];
    trades.forEach(p => {
        p.date = moment(p.timestamp).local().format("YYYYMMDD HH:mm:ssZ");
        toDrop.forEach(d => delete p[d]);
        p.leverage = p.leverage.toFixed(4);
        p.tokenInvested = (p.tokenInvested / 1e6).toFixed(6);
        p.ror = p.openClose === 1 ? '' : (p.ror * 100).toFixed(2) + '%';
        p.pnl = (Number(p.pnl) / 1e6).toFixed(6)
    });
    document.getElementById('trades').innerHTML = '';
    if(trades.length > 0){
        document.getElementById('trades').appendChild(createTable(trades));
    }else{
        document.getElementById('trades').innerHTML = 'NO TRADES within the latest 24 hours';
    }
};

let retrieve = () => {
    const s = start.value + " 00:00:00", e= end.value + " 24:00:00";
    let tr = JSON.parse(getParam('trades')).filter(m => moment(m.timestamp).tz('utc').isAfter(moment(s).tz('utc')) && moment(m.timestamp).tz('utc').isBefore(moment(e).tz('utc')));
    populateData(tr);
};

let onBodyLoad = () => {
    account = getParam('account');
    let allTrades = JSON.parse(getParam('trades'));
    console.log(`account:\t${account}`);
    document.getElementById('account').innerHTML = getParam('account');

    populateData(allTrades.filter(m => moment().local().startOf('day').isBefore(moment(m.timestamp))));
};

body.onload = onBodyLoad;
retrieveButton.onclick = retrieve;