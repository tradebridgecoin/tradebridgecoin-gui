
const { remote } = require('electron');
const appDataDir = remote.app.getPath('userData');

const account = document.getElementById('account');
const errMsg = document.getElementById('login_err');
const tradeType = document.getElementById('live_or_paper');
const login_btn = document.getElementById('login_btn');
const body = document.getElementsByTagName('BODY')[0];

const sqlite = require('sqlite3');
require(`${__dirname}/api/utility`);
const args = remote.process.argv.slice(2);
const toInint = args.indexOf('--init') > -1;

process.env.TBCTMP = 'LIVE';

let accLower = () => account.value.toLowerCase();
let initilizedDB = async (accLower, net) => {
    let meta  = require(`${__dirname}/api/metadata_${net === 'mainnet' ? 'live' : 'paper'}`).metadata;
    let db = new sqlite.Database(`${appDataDir}/tbc_settings_${net}.db`, async () => {
        await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='settings';", async (err, e) => {
            if(e.length === 0){
                await db.run('create table settings (id INTEGER PRIMARY KEY AUTOINCREMENT , account varchar(40) , key varchar(20) , value TEXT);', async (err) => {
                    if(!err)
                        await db.run(`
                           insert into settings (account, key, value) VALUES 
                           ('${accLower}', 'endpoint_live',  'https://mainnet.infura.io/v3/ee07e33cb6414781a72deaf3b303ca3b'),
                           ('${accLower}', 'endpoint_paper', 'https://ropsten.infura.io/v3/ee07e33cb6414781a72deaf3b303ca3b'),
                           ('${accLower}', 'startBlockNumber', ${meta.tokenStartBlockNumber}),
                           ('${accLower}', 'referrer', ''),
                           ('${accLower}', 'tokenAddress', '${meta.tokenAddress}'),
                           ('${accLower}', 'ethereumNet', '${tradeType.innerHTML === 'LIVE TRADE' ? 'mainnet' : 'testnet'}'),
                           ('${accLower}', 'watchList', '{"intervals":[["1",5],["2",10],["3",15],["4",10]],"symbols":[{"category":1,"symbols":[]},{"category":2,"symbols":[]},{"category":3,"symbols":[]},{"category":4,"symbols":[]}]}');
                       `, () => {})
                });
            }else{
                let thisSettings = await db.select(`select * from settings where account='${accLower}';`);
                if(thisSettings.length === 0)
                    await db.run(`
                       insert into settings (account, key, value) VALUES 
                       ('${accLower}', 'endpoint_live',  'https://mainnet.infura.io/v3/ee07e33cb6414781a72deaf3b303ca3b'),
                       ('${accLower}', 'endpoint_paper', 'https://ropsten.infura.io/v3/ee07e33cb6414781a72deaf3b303ca3b'),
                       ('${accLower}', 'startBlockNumber', ${meta.tokenStartBlockNumber}),
                       ('${accLower}', 'referrer', ''),
                       ('${accLower}', 'tokenAddress', '${meta.tokenAddress}'),
                       ('${accLower}', 'ethereumNet', '${tradeType.innerHTML === 'LIVE TRADE' ? 'mainnet' : 'testnet'}'),
                       ('${accLower}', 'watchList', '{"intervals":[["1",5],["2",10],["3",15],["4",10]],"symbols":[{"category":1,"symbols":[]},{"category":2,"symbols":[]},{"category":3,"symbols":[]},{"category":4,"symbols":[]}]}');
                   `, () => {});
            }
        });
    });
};

let login = async () => {


    errMsg.innerHTML = '';
    const TD = require(`${__dirname}/api/trade-on-chain`);

    if(!accLower().startsWith('0x') || !TD.isAddress(accLower())){
        errMsg.innerHTML = 'Please input a valid Ethereum Account, starting with 0x!'
    }else{
        errMsg.style.color = "blue";
        errMsg.innerHTML = "loading...";
        const net = tradeType.innerHTML === 'LIVE TRADE' ? 'mainnet' : 'testnet';
        await initilizedDB(accLower(), net);
        remote.getCurrentWindow().loadURL(`file://${__dirname}/gui/html/dashboard.html?account=${accLower()}&net=${net}`)
    }
};

let tradeTypeChange = () => {
    if(tradeType.innerHTML === 'LIVE TRADE'){
        process.env.TBCTMP = 'LIVE';
        tradeType.style.color = 'red';
        tradeType.innerHTML = 'PAPER TRADE';
        errMsg.style.color = "red";
        errMsg.innerHTML = "ALL TRADES will be made to the TESTNET and testnet ethers & tokens will be used. no change on MAINNET account";
    }else if(tradeType.innerHTML === 'PAPER TRADE'){
        process.env.TBCTMP = 'PAPER';
        tradeType.style.color = 'blue';
        tradeType.innerHTML = 'LIVE TRADE';
        errMsg.style.color = "blue";
        errMsg.innerHTML = "ALL TRADES will be made to the MAINNET of Ethereum and MAINNET ethers & tokens will be used!";
    }
};

let onBodyLoad = () => {
    if(toInint){
        const fs = require('fs');
        const os = require('os');
        let fileToRM = [
            ...fs.readdirSync(appDataDir).filter(f => f.startsWith('tbc_settings_')).map(m => `${appDataDir}/${m}`),
            ...fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('tbc_cache_')).map(m => `${os.tmpdir()}/${m}`)
        ];
        fileToRM.forEach(f => fs.unlinkSync(f));
    }
};

body.onload = onBodyLoad;
login_btn.onclick = login;
tradeType.onclick = tradeTypeChange;