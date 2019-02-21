const body = document.getElementsByTagName('BODY')[0];
const symbol_add = document.getElementById('symbol');
const quote_label = document.getElementById('symbol_add_label');
const addButton = document.getElementById('symbol_add');
const changeButton = document.getElementById('change');
const refresh_category = document.getElementById('refresh_category');
const refresh_seconds = document.getElementById('refresh_seconds');

const { remote, ipcRenderer } = require('electron');
const BrowserWindow = require('electron').remote.BrowserWindow;
const moment = require('moment-timezone');

process.env.TBCTMP = getParam('net') === 'mainnet' ? 'LIVE' : 'PAPER';

const MD = require('../../api/market-data-feed');
const TD = require('../../api/trade-on-chain');
const meta = require('../../api/metadata').metadata.data;

let account, td, md, endpoint, watchlist;
let allQuotes = new Map();

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


            // delete row[key]
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

let orderWindow = (order) => {
    let orderWin = new BrowserWindow({parent: remote.getCurrentWindow(), modal: true, show: false});
    let orderInfo = order.open_close !== undefined ? `&open_close=${order.open_close}&category=${order.category}&symbol=${order.symbol}` : '';
    console.log(`closeInfo:${orderInfo}`);
    orderWin.loadURL(`file://${__dirname}/order.html?account=${account}&endpoint=${endpoint}${orderInfo}`);
    orderWin.once('ready-to-show', () => {
        orderWin.show()
    });
    orderWin.on('closed', () => ipcRenderer.send('watchlist-order-closed', ''));
    // orderWin.webContents.openDevTools();
};

let addTradeToWatchlist = (table) => {
    let firstRow = true;
    for(let row of table.rows){
        let cell = row.insertCell(0);
        if(firstRow){
            firstRow = false;
            cell.innerHTML = '<b style="color:white;">action</b>';
        }else{
            const bt = document.createElement("button");
            bt.innerHTML = "Trade";
            bt.onclick = () => {
                let o = {
                    open_close: '1',
                    direction: '1',
                    category: row.cells[1].innerText,
                    symbol: row.cells[2].innerText,
                    leverage: '',
                    txHash: '',
                    tokens_to_invest: ''
                };
                orderWindow(o);
            };
            cell.appendChild(bt);
            const remove = document.createElement("button");
            remove.innerHTML = "Remove";
            remove.onclick = () => {
                onSymbolRemoved(row.cells[1].innerText, row.cells[2].innerText)
            };
            remove.style.marginLeft = "20px";
            cell.appendChild(remove);
        }
    }
    return table;
};

let populateTable = quotes => {
    quote_label.innerHTML = '';
    let qs = [];
    (quotes.quotes || []).forEach(f => {
        // console.log(JSON.stringify(f));
        qs.push({
            category: quotes.category,
            symbol: f.symbol,
            last: f.quote,
            bid: f.bid,
            ask: f.ask,
            local: moment(f.timestamp).local().format('YYYY-MM-DD HH:mm:ss'),
            exchange: moment(f.timestamp).tz(meta.categories[quotes.category].timeZone).format('YYYY-MM-DD HH:mm:ssZ')
        })
    });
    qs.forEach(q => allQuotes.set(q.symbol, q));
    // allQuotes.forEach((v,k) => {
    //     console.log(k)
    //     console.log(JSON.stringify(v))
    // })
    if(allQuotes.size > 0){
        document.getElementById('watchlist').innerHTML = '';
        let tableHTML = addTradeToWatchlist(createTable(Array.from(allQuotes.values()).sort((p,c) => `${p.category} ${p.symbol}` > `${c.category} ${c.symbol}` ? 1 : -1)));
        document.getElementById('watchlist').appendChild(tableHTML);
        console.log(document.getElementById('watchlist').innerHTML)
    }else{
        document.getElementById('watchlist').innerHTML = 'NO symbols in the watchlist';
    }
};

let onBodyLoad = (w) => {
    account = getParam('account');
    console.log(getParam('watchlist'));
    watchlist = JSON.parse(w || getParam('watchlist'));
    endpoint = getParam('endpoint');
    console.log(`account:\t${account}`);
    document.getElementById('account').innerHTML = getParam('account');
    document.getElementById('watchlist').innerHTML = watchlist.symbols.map(m => m.symbols).flatten().length === 0 ? 'No Entry In The Watchlist' : 'Please wait tens of seconds for the quotes to stream';

    if(!md){
        refresh_category.value = 1;
        refresh_seconds.value = ((watchlist.intervals || []).find(f => f[0].toString() === '1') || [0, 10])[1];
    }
    if(md) md.unsubscribeAll();
    if(md) md.close();
    TD.newInstance({endpoint, account, agent: ''}).then(async trade => {
        td = trade;
        md = new MD(trade);
        allQuotes.clear();
        let sub = watchlist.symbols.filter(f => f.symbols.length > 0);
        md.withIntervals(new Map(watchlist.intervals)).subscribe(sub);
        md.onSnapshot(populateTable);
        md.onMarketData(q => populateTable(q));
    })
};

let onBodyLoad1 = onBodyLoad();

let onSymbolAdded = () => {
    let symbolCategory = meta.supportedCategories.find(f =>
        meta.categories[f].symbols.indexOf(symbol_add.value.trim().toUpperCase()) >= 0 ||
        new RegExp(meta.categories[f].symbols[0]).test(symbol_add.value.toUpperCase()));
    quote_label.innerHTML = '';

    if((watchlist.symbols.find(f => (f.category.toString() === symbolCategory)) || {symbols: []}).symbols.some(s => s === symbol_add.value.trim().toUpperCase())){
        quote_label.style.color = 'red';
        quote_label.innerHTML = "symbol is ALREADY in the watchlist"
    }else if(symbol_add.value === '') {
        quote_label.style.color = 'red';
        quote_label.innerHTML = "symbol is required"
    }else if(symbolCategory === undefined){
        quote_label.style.color = 'red';
        quote_label.innerHTML = "symbol is currently INVALID or UNSUPPORTED";
    }else {
        quote_label.style.color = 'blue';
        quote_label.innerHTML = "validating...";
        let validating_md = new MD(td);
        validating_md.subscribe([{category: Number(symbolCategory), symbols: [symbol_add.value.trim().toUpperCase()]}]);
        validating_md.onSnapshot(quote => {
            console.log(`quote:\t${JSON.stringify(  quote)}`);
            if(quote.error){
                quote_label.style.color = 'red';
                quote_label.innerHTML = `Category ${symbolCategory} Symbol ${symbol_add.value.trim()} is INVALID or UNSUPPORTED`;
            }else if(Array.from(quote.quotes.keys()).length > 0){
                ipcRenderer.send('watchlist-add', JSON.stringify({account: account, category: Number(symbolCategory), symbol: symbol_add.value.trim().toUpperCase()}));
            }
        })
    }
};

let onSymbolRemoved = (symbolCategory, symbol) => {
    ipcRenderer.send('watchlist-remove', JSON.stringify({account: account, category: Number(symbolCategory), symbol: symbol.trim().toUpperCase()}));
};

let onRefreshRateChanged = () => {
    ipcRenderer.send('refresh-rate-change', JSON.stringify({account: account, category: Number(refresh_category.value), rate: Math.max(5, Number(refresh_seconds.value))}));
};

let onCategoryChange = () => {
    refresh_seconds.value = ((watchlist.intervals || []).find(f => f[0].toString() === refresh_category.value) || [0, 10])[1];
};

ipcRenderer.on('watchlist-added', (event, msg) => {
    quote_label.style.color = 'blue';
    quote_label.innerHTML = `Symbol ${symbol_add.value.trim().toUpperCase()} is added to the watchlist, reloading...`;
    onBodyLoad(msg)
});

ipcRenderer.on('watchlist-removed', (event, msg) => {
    quote_label.style.color = 'blue';
    quote_label.innerHTML = `Symbol ${symbol_add.value.trim().toUpperCase()} is removed from the watchlist, reloading...`;
    onBodyLoad(msg)
});

ipcRenderer.on('watchlist-error', (event, msg) => {
    quote_label.style.color = 'red';
    quote_label.innerHTML = msg.toString();
});

ipcRenderer.on('refresh-rate-error', (event, msg) => {
    quote_label.style.color = 'red';
    quote_label.innerHTML = msg.toString();
});

ipcRenderer.on('refresh-rate-changed', (event, msg) => {
    quote_label.style.color = 'blue';
    quote_label.innerHTML = `Category ${refresh_category.value} refresh rate updated to ${refresh_seconds.value} seconds, reloading...`;
    onBodyLoad(msg)
});

body.onload = onBodyLoad1;
addButton.onclick = onSymbolAdded;
changeButton.onclick = onRefreshRateChanged;
refresh_category.onchange = onCategoryChange;