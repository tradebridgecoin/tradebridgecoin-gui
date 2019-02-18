require(`${__dirname}/api/utility`);
const { ipcMain, dialog, app, BrowserWindow } = require('electron');
const sqlite = require('sqlite3');
const appDataDir = app.getPath('userData');

let win;
let net;

function createWindow () {
    win = new BrowserWindow({width: 1200, height: 600});
    win.loadURL(`file://${__dirname}/index.html`);
    // win.webContents.openDevTools();
    win.on('closed', () => {
        win = null
    });
}
app.on('ready', () => {
    createWindow()
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow()
    }
});

ipcMain.on('settings-update', (event, message) => {
    const msg = JSON.parse(message);
    const meta = require(`${__dirname}/api/metadata`).metadata;

    console.log(`ipc msg:\t${msg}`);
    const account = msg.account;
    if(msg.restart){
        const options = {
            type: 'info',
            title: 'Save & Restart',
            message: "Yes to save settings and RESTART, continue?",
            buttons: ['Yes', 'No']
        };
        dialog.showMessageBox(options, function (index) {
            if(index === 0){
                let db = new sqlite.Database(`${appDataDir}/tbc_settings_${msg.ethereumNet}.db`, () => {
                    db.run(`delete from settings where account='${account}'`, (err, res) => {
                        if(!err){
                            db.run(`
                   insert into settings (account, key, value) VALUES 
                   ('${account}', 'endpoint_live', '${msg.endpoint_live}'),
                   ('${account}', 'endpoint_paper', '${msg.endpoint_paper}'),
                   ('${account}', 'startBlockNumber', '${msg.startBlockNumber}'),
                   ('${account}', 'referrer', '${msg.agent}'),
                   ('${account}', 'tokenAddress', '${meta.tokenAddress}'),
                   ('${account}', 'ethereumNet', '${msg.ethereumNet}'),
                   ('${account}', 'watchList', '${msg.watchList}');
               `, (err) => {
                                if(!err){
                                    event.sender.send('ok-to-close', '');
                                    if(Boolean(msg.restart)){
                                        app.relaunch();
                                        app.exit()
                                    }
                                }else
                                    event.sender.send('error-in-updating-settings', err.toString())
                            });
                        }else
                            event.sender.send('error-in-updating-settings', err.toString())
                    })
                });
            }
        })
    }
});

ipcMain.on('watchlist-add', (event, msg) => {
    let toAdd = JSON.parse(msg);
    let db = new sqlite.Database(`${appDataDir}/tbc_settings_${net}.db`, async () => {
        let watchlist = (await db.select(`select value from settings where account='${toAdd.account}' and key='watchList'`))[0] || {value:'{symbols:[]}'};
        console.log(`watchlist db:\t${watchlist.value}`);
        watchlist = JSON.parse(watchlist.value);
        let categorized = watchlist.symbols.find(f => f.category === toAdd.category);
        if(categorized)
            categorized.symbols.push(toAdd.symbol);
        else
            watchlist.symbols.push({category: toAdd.category, symbols:[toAdd.symbol]});
        console.log(`updated watchlist:\t${JSON.stringify(watchlist)}`);
        db.run(`update settings set value = '${JSON.stringify(watchlist)}' where  account='${toAdd.account}' and key='watchList'`, (err, res) => {
            if(!err)
                event.sender.send('watchlist-added', JSON.stringify(watchlist));
            else
                event.sender.send('watchlist-error', err.toString())
        })
    })
});

ipcMain.on('watchlist-remove', (event, msg) => {
    let toRemove = JSON.parse(msg);
    let db = new sqlite.Database(`${appDataDir}/tbc_settings_${net}.db`, async () => {
        let watchlist = (await db.select(`select value from settings where account='${toRemove.account}' and key='watchList'`))[0] || {value:'{symbols:[]}'};
        console.log(`watchlist db:\t${watchlist.value}`);
        watchlist = JSON.parse(watchlist.value);
        let categorized = watchlist.symbols.find(f => f.category === toRemove.category);
        if(categorized)
            categorized.symbols = categorized.symbols.filter(f => f !== toRemove.symbol);
        console.log(`updated watchlist:\t${JSON.stringify(watchlist)}`);
        db.run(`update settings set value = '${JSON.stringify(watchlist)}' where  account='${toRemove.account}' and key='watchList'`, (err, res) => {
            if(!err)
                event.sender.send('watchlist-removed', JSON.stringify(watchlist));
            else
                event.sender.send('watchlist-error', err.toString())
        })
    })
});

ipcMain.on('refresh-rate-change', (event, msg) => {
    let toUpdate = JSON.parse(msg);
    let db = new sqlite.Database(`${appDataDir}/tbc_settings_${net}.db`, async () => {
        let watchlist = (await db.select(`select value from settings where account='${toUpdate.account}' and key='watchList'`))[0] || {value: '{intervals:[]}'};
        watchlist = JSON.parse(watchlist.value);
        let interval = watchlist.intervals.find(f => f[0].toString() === toUpdate.category.toString());
        if(interval)
            interval[1] = Number(toUpdate.rate);
        else
            watchlist.intervals.push([toUpdate.category.toString(), Number(toUpdate.rate)]);
        db.run(`update settings set value = '${JSON.stringify(watchlist)}' where  account='${toUpdate.account}' and key='watchList'`, (err, res) => {
            if (!err)
                event.sender.send('refresh-rate-changed', JSON.stringify(watchlist));
            else
                event.sender.send('refresh-rate-error', err.toString())
        })
    })
});

ipcMain.on('watchlist-order-closed', () => {
    console.log('received watchlist-order-closed');
    win.webContents.send('watchlist-order-closed-routed', '')
});

ipcMain.on('set-net', (event, msg) => {net = msg; console.log(`net set to:\t${net}`)});