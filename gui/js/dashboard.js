const moment = require('moment-timezone');
const sqlite = require('sqlite3');

const body = document.getElementsByTagName('BODY')[0];
const refreshButton = document.getElementById('refresh');
const orderButton = document.getElementById('order');
const tradesButton = document.getElementById('trades');
const settingsButton = document.getElementById('settings');
const watchlistButton = document.getElementById('watchlist');
const statusBar = document.getElementById('refreshing');
const paperTrading = document.getElementById('paperTrading');

const { remote } = require('electron');
const appDataDir = remote.app.getPath('userData');
const ipcDashboard = require('electron').ipcRenderer;
const BrowserWindow = require('electron').remote.BrowserWindow;
const TD = require('../../api/trade-on-chain');
const MD = require('../../api/market-data-feed');

require('../../api/utility');

let endpoint, account, agent, td, md, startBlock, settings;
let allTrades = [];
sqlite.Database.prototype.select = function (sql) {
    let f;
    this.all(sql, (err, res) => {
        if(err){
            let reject = Promise.reject(err.toString());
            reject.catch(err => {});
            f(reject)
        }else
            f(res);
    });
    return new Promise(t => f = t)
};

function getParam(name){
    if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(remote.getCurrentWebContents().getURL()))
        return decodeURIComponent(name[1]);
}
function dbFile() {
    return `${appDataDir}/tbc_settings_${getParam('net')}.db`
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
                div.style.width = key === 'txHash' ? "50px" : "200px";
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

let addCloseToActiveOrders = (table) => {
    let firstRow = true;
    for(let row of table.rows){
        let cell = row.insertCell(0);
        if(firstRow){
            firstRow = false;
            cell.innerHTML = '<b style="color:white;">action</b>';
        }else{
            const bt = document.createElement("button");
            bt.innerHTML = "Close";
            bt.onclick = () => {
                let o = {
                    open_close: '-1',
                    direction: (-1 * Number(row.cells[3].innerText)).toString(),
                    category: row.cells[1].innerText,
                    symbol: row.cells[2].innerText,
                    leverage: row.cells[4].innerText,
                    txHash: row.cells[11].innerText,
                    tokens_to_invest: row.cells[7].innerText
                };
                orderWindow(o);
            };
            cell.appendChild(bt);
        }
    }
    return table;
};

let addTransferToBalance = (table) => {
    let firstRow = true;
    for(let row of table.rows){
        let cell = row.insertCell(0);
        if(firstRow){
            firstRow = false;
            cell.innerHTML = '<b style="color:white;">action</b>';
            cell.style.width = "200px";
        }else{
            let func = {transfer: transferWindow, deposit: depositWindow, withdraw: withdrawWindow};
            ['Transfer', 'Deposit', 'Withdraw'].forEach(btCaption => {
                const bt = document.createElement(btCaption);
                bt.innerHTML = btCaption;
                bt.style.marginRight = '10px';
                bt.style.cursor = 'pointer';
                bt.id = btCaption.toLowerCase();
                bt.onclick = () => {
                    func[btCaption.toLowerCase()]();
                };
                cell.appendChild(bt);
            })
        }
    }
    return table;
};

let populateData = (all_queried) => {
    let notifications = all_queried.notification;
    if(all_queried.pause.paused !== undefined && moment(all_queried.pause.timeStamp).diff(moment(), 'day') <= 10)
        notifications = [{message: `${Boolean(all_queried.pause.paused) ? 'ALL PAUSED: ' : 'ALL RESUMED: '}${all_queried.pause.message}`, publishedAt: moment(Number(all_queried.pause.timestamp)).local().format('YYYY-MM-DD HH:mm:ss'), validThru: ''}, ...notifications];
    if(notifications.length > 0){
        document.getElementById('notification_loading').hidden = true;
        document.getElementById('notification').innerHTML = '';
        document.getElementById('notification').appendChild(createTable(notifications));
    }else{
        document.getElementById('notification_loading').hidden = true;
        document.getElementById('notification').innerHTML = 'No Records';
    }

    let balance = [{token: all_queried.portfolio.token, marketValue: all_queried.portfolio.marketValue, totalValue: all_queried.portfolio.marketValue + all_queried.portfolio.token}];
    document.getElementById('balance_loading').hidden = true;
    document.getElementById('balance').innerHTML = '';
    document.getElementById('balance').appendChild(addTransferToBalance(createTable(balance)));

    //populate positions table
    let pos = all_queried.portfolio.positions;
    let toDrop = ['timestamp', 'account', 'openClose', 'firstRoR', 'originalTxHash', 'negativeBalance', 'close', 'preROR', 'pnl', 'transactionHash'];
    pos.forEach(p => {
        toDrop.forEach(d => delete p[d]);
        p.leverage = p.leverage.toFixed(4);
        p.ror = (p.ror * 100).toFixed(2) + '%'
    });
    if(pos.length > 0){
        document.getElementById('pos_loading').hidden = true;
        document.getElementById('positions').innerHTML = '';
        document.getElementById('positions').appendChild(addCloseToActiveOrders(createTable(pos)));
    }else{
        document.getElementById('pos_loading').hidden = true;
        document.getElementById('positions').innerHTML = 'No Records';
    }

    //populate active orders table
    let orders = all_queried.active_orders;
    console.log(JSON.stringify(orders));
    orders.forEach(p => {
        if(p.leverage)
            p.leverage = p.leverage.toFixed(4);
    });
    if(orders.length > 0){
        document.getElementById('order_loading').hidden = true;
        document.getElementById('active_orders').innerHTML = '';
        document.getElementById('active_orders').appendChild(createTable(orders));
    }else {
        document.getElementById('order_loading').hidden = true;
        document.getElementById('active_orders').innerHTML = 'No Records';
    }

    //populate active deposit table
    let deposits = all_queried.active_deposits;
    if(deposits.length >0 ){
        document.getElementById('deposit_loading').hidden = true;
        document.getElementById('active_deposits').innerHTML = '';
        document.getElementById('active_deposits').appendChild(createTable(deposits));
    }else {
        document.getElementById('deposit_loading').hidden = true;
        document.getElementById('active_deposits').innerHTML = 'No Records';
    }

    //populate active withdraw table
    let withdrawal = all_queried.active_withdrawals;
    if(withdrawal.length > 0){
        document.getElementById('withdraw_loading').hidden = true;
        document.getElementById('active_withdrawals').innerHTML = '';
        document.getElementById('active_withdrawals').appendChild(createTable(withdrawal));
    }else{
        document.getElementById('withdraw_loading').hidden = true;
        document.getElementById('active_withdrawals').innerHTML = 'No Records';
    }

    //populate error message table
    let err_msgs = all_queried.errors;
    if(err_msgs.length > 0){
        document.getElementById('err_loading').hidden = true;
        document.getElementById('err_msgs').innerHTML = '';
        document.getElementById('err_msgs').appendChild(createTable(err_msgs));
    }else {
        document.getElementById('err_loading').hidden = true;
        document.getElementById('err_msgs').innerHTML = 'No Records';
    }
};

let refreshPortfolio = trade => {
    console.log('begin refreshing portfolio');
    statusBar.style.color = 'blue';
    statusBar.innerHTML = 'updating...';
    trade.with_from_block_num(Number(startBlock)).query_all(account, true).then(all => {
        populateData(all);
        statusBar.style.color = 'blue';
        statusBar.innerHTML = 'Last Updated  ' + moment().local().format('YYYY-MM-DD HH:mm:ss');
        allTrades = all.trades;
        tradesButton.innerHTML = `Trades(${all.trades.filter(f => moment().local().startOf('day').isBefore(moment(f.timestamp).local())).length})`;
        tradesButton.removeAttribute("disabled", "");
    })
};

let onBodyLoad = async () => {
    ipcDashboard.send('set-net', getParam('net'));
    account = getParam('account').toLowerCase();
    document.getElementById('account').innerHTML = account;
    statusBar.removeAttribute("hidden");
    if(getParam('net') === 'testnet')
        paperTrading.removeAttribute("hidden");

    let db = new sqlite.Database(dbFile(), async () => {
        settings = await db.select(`select * from settings where account='${account}'`);
        settings = new Map(settings.map(m => {return [m.key, m.value]}));
        endpoint = settings.get('ethereumNet') === 'mainnet' ? settings.get('endpoint_live') : settings.get('endpoint_paper');
        agent = settings.get('referrer');
        startBlock = settings.get('startBlockNumber');
        TD.newInstance({endpoint, account, agent}).then(async trade => {
            td = trade;
            md = new MD(td);
            if(startBlock === undefined || startBlock === ''){
                startBlock = Number(await td.getWeb3().eth.getBlockNumber()) - 1;
                console.log(`start block number upated to:\t${startBlock}`);
                db.run(`update settings set value = '${startBlock.toString()}' where account='${account}' and key='startBlockNumber';`, () => {
                    refreshPortfolio(td);
                });
            }else
                refreshPortfolio(td);
            setInterval(() => refreshPortfolio(td), 1000 * 60 * 5)
        }).catch(e => {
            statusBar.style.color = 'red';
            statusBar.innerHTML = e.toString();
        });
    });
};

let depositWindow = () => {
    console.log('open deposit Window');
    let depositWin = new BrowserWindow({parent: remote.getCurrentWindow(), modal: true, show: false});

    depositWin.loadURL(`file://${__dirname}/deposit.html?account=${account}&endpoint=${endpoint}&agent=${agent}`);
    depositWin.once('ready-to-show', () => {
        depositWin.show()
    });
    depositWin.on('close', () => refreshPortfolio(td));
    // depositWin.webContents.openDevTools();
};

let withdrawWindow = () => {
    console.log('open withdraw Window');
    let withdrawWin = new BrowserWindow({parent: remote.getCurrentWindow(), modal: true, show: false});

    withdrawWin.loadURL(`file://${__dirname}/withdraw.html?account=${account}&endpoint=${endpoint}`);
    withdrawWin.once('ready-to-show', () => {
        withdrawWin.show()
    });
    withdrawWin.on('close', () => refreshPortfolio(td));
    // withdrawWin.webContents.openDevTools();
};

let orderWindow = (orderToClose) => {
    let orderWin = new BrowserWindow({parent: remote.getCurrentWindow(), modal: true, show: false});
    let closeInfo = orderToClose.open_close !== undefined ? `&open_close=${orderToClose.open_close}&direction=${orderToClose.direction}&category=${orderToClose.category}&symbol=${orderToClose.symbol}&leverage=${orderToClose.leverage}&txHash=${orderToClose.txHash}&tokens_to_invest=${orderToClose.tokens_to_invest}` : '';
    console.log(`closeInfo:${closeInfo}`);
    orderWin.loadURL(`file://${__dirname}/order.html?account=${account}&endpoint=${endpoint}${closeInfo}`);
    orderWin.once('ready-to-show', () => {
        orderWin.show()
    });
    orderWin.on('close', () => refreshPortfolio(td));
    // orderWin.webContents.openDevTools();
};

let tradesWindow = () => {
    let tradesWin = new BrowserWindow({parent: remote.getCurrentWindow(), modal: false, show: false, width: 1200, height: 600});
    tradesWin.loadURL(`file://${__dirname}/trades.html?account=${account}&endpoint=${endpoint}&trades=${JSON.stringify(allTrades)}`);
    tradesWin.once('ready-to-show', () => {
        tradesWin.show()
    });
    tradesWin.on('close', err => {});
    // tradesWin.webContents.openDevTools();
};

let transferWindow = () => {
    console.log('open transfer Window');
    let transferWin = new BrowserWindow({parent: remote.getCurrentWindow(), modal: true, show: false});

    transferWin.loadURL(`file://${__dirname}/transfer.html?account=${account}&endpoint=${endpoint}`);
    transferWin.once('ready-to-show', () => {
        transferWin.show()
    });
    transferWin.on('close', () => refreshPortfolio(td));
    // transferWin.webContents.openDevTools();
};

let settingsWindow = () => {
    console.log('open settings Window');
    let settingsWin = new BrowserWindow({parent: remote.getCurrentWindow(), modal: true, show: false});

    let db = new sqlite.Database(dbFile(), async () => {
        settings = await db.select(`select * from settings where account='${account}'`);
        settings = new Map(settings.map(m => {
            return [m.key, m.value]
        }));
        endpoint = settings.get('ethereumNet') === 'mainnet' ? settings.get('endpoint_live') : settings.get('endpoint_paper');
        agent = settings.get('referrer');
        startBlock = settings.get('startBlockNumber');
        let settingsObj = Array.from(settings).reduce((r,a) => {r[a[0]] = a[1]; return r}, {});
        settingsWin.loadURL(`file://${__dirname}/settings.html?account=${account}&settings=${JSON.stringify(settingsObj)}`);
        settingsWin.once('ready-to-show', () => {
            settingsWin.show()
        });
        settingsWin.on('close', () => refreshPortfolio(td));
        // settingsWin.webContents.openDevTools();
    });

};

let watchlistWindow = () => {
    console.log('open watchlist Window');
    let watchlistWin = new BrowserWindow({parent: remote.getCurrentWindow(), modal: false, show: false, width: 1200, height: 600});

    let db = new sqlite.Database(dbFile(), async () => {
        settings = await db.select(`select * from settings where account='${account}'`);
        settings = new Map(settings.map(m => {
            return [m.key, m.value]
        }));
        endpoint = settings.get('ethereumNet') === 'mainnet' ? settings.get('endpoint_live') : settings.get('endpoint_paper');
        agent = settings.get('referrer');
        startBlock = settings.get('startBlockNumber');
        watchlistWin.loadURL(`file://${__dirname}/watchlist.html?account=${account}&endpoint=${endpoint}&watchlist=${settings.get('watchList')}`);
        watchlistWin.once('ready-to-show', () => {
            watchlistWin.show()
        });
        // watchlistWin.webContents.openDevTools();
    });

};

let refreshOnClick = () => refreshPortfolio(td);

ipcDashboard.on('watchlist-order-closed-routed', () => refreshPortfolio(td));

remote.getCurrentWindow().on('close', () => {
    td.close();
});

body.onload = onBodyLoad;
refreshButton.onclick = refreshOnClick;
orderButton.onclick = orderWindow;
tradesButton.onclick = tradesWindow;
settingsButton.onclick = settingsWindow;
watchlistButton.onclick = watchlistWindow;