
const Web3 = require('web3');
const fs = require('fs');
const sqlite = require('sqlite3');

const TxWrapper = require('./transaction-wrapper');
const meta = require('./metadata').metadata.data;
const tokenStartBlockNumber = require('./metadata').metadata.tokenStartBlockNumber;
const tbcAddress = require('./metadata').metadata.tokenAddress;
const util = require('./utility');
const PromiOrderEvent = require('./trade/promise-order-event');
const moment = require('moment-timezone');
const MD = require('./market-data-feed');

Map.prototype.filterByIgore = function (ignored) {
    return new Map(Array.from(this).map(m => [m[0], m[1].filter(f => !ignored.getOrElse(m[0], []).find(ff => ff.returnValues.txHashToIgnore === f.transactionHash))]));
};

class Trade {

    constructor(endPoint, account, agent = '', nonce = 0, db = undefined) {
        try {
            this.agent = agent;
            this.orderHashes = [];
            this.fromBlockNum = tokenStartBlockNumber;
            this.account = account.toLowerCase();
            if (typeof this.web3 !== 'undefined') {
                this.web3 = new Web3(this.web3.currentProvider);
            } else {
                // this.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
                this.web3 = endPoint.startsWith('ws') ?
                    new Web3(new Web3.providers.WebsocketProvider(endPoint)) :
                    new Web3(new Web3.providers.HttpProvider(endPoint));
            }
            let abi = JSON.parse(fs.readFileSync(`${__dirname}/TradeBridgeCoinSale.json`, 'utf8')).abi;
            this.cod = new this.web3.eth.Contract(abi, tbcAddress);

            this.args = {
                gasPrice: this.web3.utils.toWei('100', 'gwei'),
                gas: 100000,
                nonce: nonce,
                tbcAddress: tbcAddress
            };
            this.histRoR = new Map();
            this.curPriceQueryThreshold = this.web3.utils.toWei('100', 'ether');
            this.wrapper = undefined;
            this.db = db;
        } catch (e) {
            throw e;
        }
    }

    static newInstance({endpoint, account, agent = '', cache = true, pendingNum = 0}){
        let f;
        let web3 = endpoint.startsWith('ws') ?
            new Web3(new Web3.providers.WebsocketProvider(endpoint)) :
            new Web3(new Web3.providers.HttpProvider(endpoint)) ;

        web3.eth.getTransactionCount(account)
            .then(n => {
                if(cache){
                    let db = new sqlite.Database(`${require('os').tmpdir()}/tbc_cache_${endpoint.hashCode()}.db`, () => {
                        try{
                            db.all('select * from events limit 1', async (err,res) => {
                                if(!err){
                                    try{
                                        f(new Trade(endpoint, account, agent, n + (pendingNum || 0), db))
                                    }catch (e){
                                        let reject = Promise.reject(`Error in constructing trade module! ` + e.toString());
                                        reject.catch(err => {});
                                        f(reject)
                                    }
                                }else if(err.errno === 1){
                                    const sql =[
                                        'create table events(id INTEGER PRIMARY KEY AUTOINCREMENT , account varchar(60) not null , event varchar(30) not null , blockNumber INTEGER not null , transactionHash varchar(80) unique not null, returnValues text not null )',
                                        'create table latest_block_number(id INTEGER PRIMARY KEY AUTOINCREMENT , account varchar(60) unique not null , latest_block_number INTEGER not null , earliest_block_number INTEGER not null)',
                                        'create index events_account on events (account)',
                                        'create index events_block on events (event, transactionHash)',
                                        'create index latest_block_number_account on latest_block_number (account)'
                                    ];

                                    for(let s of sql)
                                        await db.exec(s)
                                    console.log('db created, tables and indices generated!');
                                    try{
                                        f(new Trade(endpoint, account, agent, n + (pendingNum || 0), db))
                                    }catch (e){
                                        let reject = Promise.reject(`Error in constructing trade module! ` + e.toString());
                                        reject.catch(err => {});
                                        f(reject)
                                    }
                                }else
                                    console.log(err);
                            });
                        }catch (e) {
                            console.log('error in creating db: ' + e.toString())
                        }
                    });
                }else
                    f(new Trade(endpoint, account, agent, n + (pendingNum || 0), undefined))
            })
            .catch(() => {
                let reject = Promise.reject(`Error in constructing the trade module at the ENDPOINT '${endpoint}' for the ACCOUNT '${account}', please check the address, endpoint and/or connection and try it later!`);
                reject.catch(err => {});
                f(reject)
            });

        return new Promise(t => f = t)
    }

    static isAddress(address){
        return new Web3().utils.isAddress(address)
    }

    close(){
        this.web3.eth.accounts.wallet.clear();
        if(this.db)
            this.db.close()
    }

    getWeb3(){
        return this.web3
    }

    with_private_key(privateKey){
        try{
            let key = privateKey.startsWith('0x') ? privateKey.toLowerCase() : '0x' + privateKey.toLowerCase();
            let acc = this.web3.eth.accounts.privateKeyToAccount(key);
            if(acc.address.toLowerCase() === this.account){
                this.web3.eth.accounts.wallet.clear();
                this.web3.eth.accounts.wallet.add(key);
            }else{
                throw new Error(`keystore provided does NOT match the account ${this.account}`);
            }
            if(this.wrapper === undefined)
                this.wrapper = new TxWrapper(this.args, this.web3)
        } catch (err){
            throw err
        }

        return this;
    }

    with_wallet_to_be_decrypted(keystoreArray, password){
        this.web3.eth.accounts.wallet.clear();
        this.web3.eth.accounts.wallet.add(this.account);
        this.web3.eth.accounts.wallet.decrypt(keystoreArray, password);
        if(this.wrapper === undefined)
            this.wrapper = new TxWrapper(this.args, this.web3);

        return this;
    }

    with_keystoreJsonV3(keystore, password){
        this.web3.eth.accounts.wallet.clear();
        let account = this.web3.eth.accounts.decrypt(keystore, password);
        if(account.address.toLowerCase() !== this.account)
            throw new Error(`keystore provided does NOT match the account ${this.account}`);
        this.web3.eth.accounts.wallet.add(account.privateKey);

        if(this.wrapper === undefined)
            this.wrapper = new TxWrapper(this.args, this.web3);

        return this;
    }

    with_decrypted_wallet(wallet){
        this.web3.eth.accounts.wallet = wallet;
        if(this.wrapper === undefined)
            this.wrapper = new TxWrapper(this.args, this.web3);

        return this;
    }

    with_mnemonic(mnemonic, index){
        try{
            let privateKey = util.generateAddressesFromSeed(mnemonic)[index === undefined ? 0 : index].privateKey;
            let key = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
            let acc = this.web3.eth.accounts.privateKeyToAccount(key);
            if(acc.address.toLowerCase() === this.account){
                this.web3.eth.accounts.wallet.clear();
                this.web3.eth.accounts.wallet.add(key);
            }
            if(this.wrapper === undefined)
                this.wrapper = new TxWrapper(this.args, this.web3)
        }catch (err){

        }

        return this;
    }

    safe_close_wallet(){
        this.web3.eth.accounts.wallet.clear();
    }

    on_liquidation(f){
        this.cod.events.Action((err, result) => {
            if(err){

            }else if(result.returnValues.beneficiary.toLowerCase() === this.account.toLowerCase() && this.orderHashes.indexOf(result.transactionHash) < 0){
                f({txHash: result.transactionHash, confirmation: result.returnValues.data})
            }
        })
    }

    order(args, errFunc){
        let [category, rawSymbol, direction, openClose, leverage, tokensToInvest, posHash, price] =
            [args.category, args.rawSymbol, args.direction, args.openClose, args.leverage, args.openClose === 1 ? args.tokenToInvest : 0, args.posHash, args.price || 0];

        let promiOrder = new PromiOrderEvent();

        if(openClose !== 1 && openClose !== -1) {
            if(errFunc !== undefined)
                errFunc(new Error('openClose argument must be either 1 for OPEN or -1 for CLOSE'));
            return promiOrder
        }

        if(direction !== 1 && direction !== -1) {
            if(errFunc !== undefined)
                errFunc(new Error('direction argument must be either 1 for LONG or -1 for SHORT'));
            return promiOrder
        }

        if(tokensToInvest < 0) {
            if(errFunc !== undefined)
                errFunc(new Error('tokens to invest must be greater than 0'));
            return promiOrder
        }

        let lev = meta.categories[category.toString()].leverage;
        if(leverage <= lev[0] || leverage > lev[1] ){
            if(errFunc !== undefined)
                errFunc(new Error(`leverage is greater than ${lev[0]} and less than or equal to ${lev[1]}`));
            return promiOrder
        }

        let symbol = rawSymbol.toUpperCase();

        if(this.web3.eth.accounts.wallet.length === 0){
            if(errFunc !== undefined)
                errFunc(new Error('Account decryption has to be provided before any transactions, whether it be in the form of mnemonic, private key, keystore or existing wallet!'));
            return promiOrder
        }

        let c1 = category.toString() === '1' && !new RegExp(meta.categories['1'].symbols[0]).test(symbol);
        if(c1 || category.toString() !== '1' && (meta.supportedCategories.indexOf(category.toString()) < 0 || meta.categories[category.toString()].symbols.indexOf(symbol) < 0)){
            if(errFunc !== undefined)
                return Promise.reject(new Error(`category ${category} symbol: ${symbol} is now UNSUPPORTED, please check the category and symbol and try again!`));
            return promiOrder
        }

        if(openClose === -1 && !posHash && promiOrder.errFunc !== undefined){
            if(errFunc !== undefined)
                return Promise.reject('close order must come with the position hash');
            return promiOrder
        }

        let w = this.wrapper;
        Object.prototype.wrapped = function() {
            return w.wrap(this);
        };
        let orderJson = openClose === 1 ?
            {symbol: symbol, direction: direction, openClose: openClose, price: price, leverage:leverage} :
            {symbol: symbol, direction: direction, openClose: openClose, price: price, leverage: 1, originalTxHash: posHash} ;
        let investedValue = this.web3.utils.toWei(tokensToInvest.toString(), 'mwei');
        let intervals = [];
        this.cod.methods.actionMessage(this.account, investedValue, category, JSON.stringify(orderJson))
            .wrapped()
            .send(this.args)
            .on('receipt', receipt =>{
                this.orderHashes.push(receipt.transactionHash);
                console.log(`receipt:\t${receipt}`);

                this.web3.eth.getTransaction(receipt.transactionHash)
                    .then(tx => {
                        if(promiOrder.submitFunc !== undefined)
                            promiOrder.submitFunc({txHash: receipt.transactionHash, gasPaid: receipt.gasUsed * Number(tx.gasPrice)})
                    });

                intervals.push(setInterval(() => {
                    console.log('interval of event ErrorMsg for order action\t' + receipt.transactionHash);
                    this.cod.getPastEvents('ErrorMsg', {fromBlock: receipt.blockNumber, toBlock: 'latest'}, async (err, transactions) => {
                        (transactions || []).forEach(result => {
                            if(result.returnValues.origin.toLowerCase() === receipt.transactionHash.toLowerCase())
                                this.web3.eth.getTransaction(receipt.transactionHash)
                                    .then(tx => {
                                        let reject = {errMsg: result.returnValues.msg, txHash: receipt.transactionHash, gasPaid: receipt.gasUsed * Number(tx.gasPrice)};
                                        this.orderHashes = this.orderHashes.filter(f => f !== receipt.transactionHash);
                                        if(promiOrder.errFunc !== undefined)
                                            promiOrder.errFunc(reject);
                                        intervals.forEach(f => clearInterval(f))
                                    })
                                    .catch(err => {
                                        this.orderHashes = this.orderHashes.filter(f => f !== receipt.transactionHash);
                                        console.log(err);
                                        intervals.forEach(f => clearInterval(f))
                                    })
                        })
                    });
                }, 1000 * 10));

                intervals.push(setInterval(() => {
                    console.log('interval of error transaction for order action\t' + receipt.transactionHash);
                    this.web3.eth.getTransactionReceipt(receipt.transactionHash)
                        .then((receipt) => {
                            if(!(receipt !== undefined && receipt !== null && Boolean(receipt.status || false))){
                                let errMsg = 'Transaction has been reverted by the EVM, due to incorrect arguments or insufficient balance';
                                let reject = {errMsg: errMsg, txHash: receipt.transactionHash, gasPaid: receipt.gasUsed * Number(tx.gasPrice)};
                                this.orderHashes = this.orderHashes.filter(f => f !== receipt.transactionHash);
                                if(promiOrder.errFunc !== undefined)
                                    promiOrder.errFunc(reject);
                                intervals.forEach(f => clearInterval(f))
                            }
                        })
                }, 1000 * 10));

                intervals.push(setInterval(() => {
                    console.log('interval of event Action for order action\t' + receipt.transactionHash);
                    this.cod.getPastEvents('Action', {fromBlock: receipt.blockNumber, toBlock: 'latest'}, async (err, transactions) => {
                        if(err){
                            let reject = {errMsg: err.message || err.toString()};
                            if(promiOrder.errFunc !== undefined)
                                promiOrder.errFunc(reject);
                            intervals.forEach(f => clearInterval(f))
                        }else {
                            transactions.forEach(result => {
                                if(result.returnValues.actionMsg.toLowerCase() === receipt.transactionHash.toLowerCase()){
                                    this.web3.eth.getTransaction(receipt.transactionHash)
                                        .then(tx => {
                                            this.orderHashes = this.orderHashes.filter(f => f !== receipt.transactionHash);
                                            if(promiOrder.filledFunc !== undefined)
                                                promiOrder.filledFunc({txHash: result.transactionHash, gasPaid: receipt.gasUsed * Number(tx.gasPrice), confirmation: result.returnValues.data});
                                            intervals.forEach(f => clearInterval(f))
                                        })
                                        .catch(() => {
                                            intervals.forEach(f => clearInterval(f))
                                        })
                                }
                            })
                        }
                    });
                }, 1000 * 10));

            })
            .on('error', err => {
                let errMsg = "Smart Contract has rejected the order.\n\r Please check if\n\r 1) the smart contract has been paused;\n\r 2) order value is greater than the balance;\n\r 3) order arguments are invalid;\n\r 4) the account to send the order has not been correctly decrypted or inconsistent with the decrypted one.\n\r" + err;
                let reject = {errMsg: errMsg};
                if(promiOrder.errFunc !== undefined)
                    promiOrder.errFunc(reject);
                intervals.forEach(f => clearInterval(f))
            });
        this.gasPrice = 0;
        return promiOrder;
    }

    query_active_orders(_fromBlock){
        let f;
        this.fromBlockNum = _fromBlock || this.fromBlockNum;
        this.query_all(this.account)
            .then(t => {
                f(Array.from(t.active_orders))
            })
            .catch(err => {
                let reject = Promise.reject(err);
                reject.catch(e =>{});
                f(reject);
            });

        return new Promise(t => f = t);
    }

    query_active_deposits(_fromBlock){
        let f;
        this.fromBlockNum = _fromBlock || this.fromBlockNum;
        this.query_all(this.account)
            .then(t => {
                f(Array.from(t.active_deposits))
            })
            .catch(err => {
                let reject = Promise.reject(err);
                reject.catch(e =>{});
                f(reject);
            });

        return new Promise(t => f = t);
    }

    query_active_withdrawals(_fromBlock){
        let f;
        this.fromBlockNum = _fromBlock || this.fromBlockNum;
        this.query_all(this.account)
            .then(t => {
                f(Array.from(t.active_withdrawals))
            })
            .catch(err => {
                let reject = Promise.reject(err);
                reject.catch(e =>{});
                f(reject);
            });

        return new Promise(t => f = t);
    }

    with_from_block_num(num) {
        this.fromBlockNum = num;
        return this;
    }

    with_gas_arguments(gasPrice, gasLimit){
        this.args.gasPrice = this.web3.utils.toWei(gasPrice.toString(), 'gwei');
        this.args.gas = gasLimit;
        return this;
    }

    async query_gas_price(inGWei) {
        return inGWei ? this.web3.utils.fromWei((await this.web3.eth.getGasPrice()).toString(), 'gwei') : await this.web3.eth.getGasPrice();
    }

    query_trades() {
        let f;
        this.query_all(this.account)
            .then(t => {
                f(Array.from(t.trades))
            })
            .catch(err => {
                let reject = Promise.reject(err);
                reject.catch(e =>{});
                f(reject);
            });

        return new Promise(t => f = t);
    }

    query_positions(updateWithLatestPrice = false){
        let f;
        this.query_all(this.account, updateWithLatestPrice)
            .then(t => {
                f(t.portfolio.positions)
            })
            .catch(err => {
                let reject = Promise.reject(err);
                reject.catch(e =>{});
                f(reject);
            });

        return new Promise(t => f = t);
    }

    async query_portfolio(pos_queried){
        console.log('this querying will take a while...');
        let func;
        console.log('querying token balance...');
        let token_balance = await this.token_balance();
        console.log(` - done with balance: ${token_balance}`);
        console.log('querying holding positions...');
        let positions = pos_queried === undefined ? await this.with_from_block_num(this.fromBlockNum).query_positions() : pos_queried;
        console.log(` - done with positions:\t${positions.length}`);
        let categorized = util.buildMap(positions.map(m => m.trade).reduce((r, a) => {
            r[a.category] = r[a.category] || [];
            r[a.category].push(a);
            return r;
        },  Object.create(null)));
        let subs = Array.from(categorized).map(m => {
            let symbols = m[1].map(mm => {return mm.symbol});
            let distinct = Array.from(new Set(symbols));
            return [m[0], distinct];
        }).map(m => {
            return {category: m[0], symbols: m[1]}
        });
        if(subs === undefined || subs.length === 0){
            return Promise.resolve({positions: [], token: token_balance, marketValue: 0, total: token_balance});
        } else {
            console.log('querying the current market price of holding positions...');
            let md = new MD(this);
            md.subscribe(subs);
            md.onSnapshot(quote => {
                switch(quote.category){
                    case 1:
                        console.log(` - prices of category 1 positions ${(positions.filter(f => f.trade.category === 1) || []).length} retrieved...`);
                        quote.quotes.forEach(f => {
                            positions.filter(ff => ff.trade.symbol === f.symbol).forEach(async ffe => {
                                let fe = ffe.trade;
                                let histRor = this.histRoR.get(ffe.transactionHash ) || undefined;
                                if(histRor === undefined || histRor.length === 0){
                                    histRor = await util.getHistoricalRoR163(f.symbol);
                                    this.histRoR.set(f.symbol, histRor)
                                }
                                if(histRor !== undefined && histRor.length > 0){
                                    fe.currentPrice = f.price;
                                    let [m_b, m_e] = [moment.tz(ffe.trade.timestamp, 'Asia/Shanghai').startOf('day'),
                                                      moment.tz(f.update.replace(/\//g, '-'), 'Asia/Shanghai').startOf('day')];
                                    let cumRoR = histRor
                                        .filter(f1 => f1[0] >= m_b && f1[0].diff(m_e, 'seconds', true) < 0)
                                        .reduce((r, a) => {
                                            r *= (1 + a[1]);
                                            return r;
                                        }, 1);
                                    fe.ror = fe.direction * ((1 + f.percent) * cumRoR / (1 + fe.firstRoR) - 1) * fe.leverage;
                                    fe.preROR = cumRoR - 1;
                                    fe.marketValue = Number((fe.tokenInvested * (1 + fe.ror) / 1e6).toFixed(6));
                                    fe.time = moment(fe.timestamp).format('YYYY-MM-DD HH:mm:ss')
                                }
                                if(positions.reduce((r, a) => {r = r && (a.trade.marketValue !== undefined); return r}, true)){
                                    let pos = positions.map(m => {
                                        m.trade.tokenInvested = Number((m.trade.tokenInvested / 1e6).toFixed(6));
                                        m.trade.txHash = m.transactionHash;
                                        return m.trade
                                    });
                                    let mv = pos.reduce((r, a) => {r += a.marketValue; return r}, 0);
                                    func({positions: pos, token: token_balance, marketValue: mv, total: token_balance + mv});
                                }
                            });
                        });

                        break;
                    case 2:
                        console.log(` - prices of category 2 positions ${(positions.filter(f => f.trade.category === 2) || []).length} retrieved...`);
                        quote.quotes.forEach(f => {
                            positions.filter(ff => ff.trade.symbol === f.symbol).forEach(ffe => {
                                let fe = ffe.trade;
                                fe.currentPrice = f.middle;
                                fe.ror = fe.direction * (fe.currentPrice / fe.cost- 1) * fe.leverage;
                                fe.marketValue = Number((fe.tokenInvested * (1 + fe.ror) / 1e6).toFixed(6));
                                fe.time = moment(fe.timestamp).format('YYYY-MM-DD HH:mm:ss')
                            });
                        });
                        if(positions.reduce((r, a) => {r = r && (a.trade.marketValue !== undefined); return r}, true)){
                            let pos = positions.map(m => {
                                m.trade.tokenInvested = Number((m.trade.tokenInvested / 1e6).toFixed(6));
                                m.trade.txHash = m.transactionHash;
                                return m.trade
                            });
                            let mv = pos.reduce((r, a) => {r += a.marketValue; return r}, 0);
                            func({positions: pos, token: token_balance, marketValue: mv, total: token_balance + mv});
                        }
                        break;
                    case 3:
                        console.log(` - prices of category 3 positions ${(positions.filter(f => f.trade.category === 3) || []).length} retrieved...`);
                        quote.quotes.forEach(f => {
                            positions.filter(ff => ff.trade.symbol === f.symbol).forEach(ffe => {
                                let fe = ffe.trade;
                                let days = moment.tz('Asia/Shanghai').diff(moment.tz(fe.timestamp, 'Asia/Shanghai'), 'days', true);
                                let decay = meta.categories['3'].dailyDecay;
                                console.log(`ivx.ss holding days:\t${days}`);
                                fe.currentPrice = f.value;
                                fe.ror = fe.direction === 1 ? (fe.currentPrice / fe.cost * (1 - decay) ** days - 1) * fe.leverage : ((2 - fe.currentPrice / fe.cost) * (1 + decay) ** days - 1) * fe.leverage;
                                fe.marketValue = Number((fe.tokenInvested * (1 + fe.ror) / 1e6).toFixed(6));
                                fe.time = moment(fe.timestamp).format('YYYY-MM-DD HH:mm:ss')
                            });
                        });
                        if(positions.reduce((r, a) => {r = r && (a.trade.marketValue !== undefined); return r}, true)){
                            let pos = positions.map(m => {
                                m.trade.tokenInvested = Number((m.trade.tokenInvested / 1e6).toFixed(6));
                                m.trade.txHash = m.transactionHash;
                                return m.trade
                            });
                            let mv = pos.reduce((r, a) => {r += a.marketValue; return r}, 0);
                            func({positions: pos, token: token_balance, marketValue: mv, total: token_balance + mv});
                        }
                        break;
                    case 4:
                        console.log(` - prices of category 4 positions ${(positions.filter(f => f.trade.category === 4) || []).length} retrieved...`);
                        quote.quotes.forEach(f => {
                            positions.filter(ff => ff.trade.symbol === `${f.crypto}.${f.fiat}.CRYPTO`).forEach(ffe => {
                                let fe = ffe.trade;
                                fe.currentPrice = f.rate;
                                fe.ror = fe.direction * (fe.currentPrice / fe.cost- 1) * fe.leverage;
                                fe.marketValue = Number((fe.tokenInvested * (1 + fe.ror) / 1e6).toFixed(6));
                                fe.time = moment(fe.timestamp).format('YYYY-MM-DD HH:mm:ss')
                            });

                        });
                        if(positions.reduce((r, a) => {r = r && (a.trade.marketValue !== undefined); return r}, true)){
                            let pos = positions.map(m => {
                                m.trade.tokenInvested = Number((m.trade.tokenInvested / 1e6).toFixed(6));
                                m.trade.txHash = m.transactionHash;
                                return m.trade
                            });
                            let mv = pos.reduce((r, a) => {r += a.marketValue; return r}, 0);
                            func({positions: pos, token: token_balance, marketValue: mv, total: token_balance + mv});
                        }
                        break;
                }
            });
        }


        return new Promise(t => func = t)
    }

    query_token_price(long_short, valueAtUnit){
        let ls = long_short > 0 ? 1 : (long_short < 0 ? -1 : 0);
        let f;

        this.cod.methods.getArguments('CurrentPrice')
            .call({from: this.account})
            .then(result => {
                if(this.account && Number(valueAtUnit) > 0 &&
                    (ls === 1 && Number(this.web3.utils.toWei(valueAtUnit.toString(), 'ether')) <= this.curPriceQueryThreshold ||
                        ls === -1 && Number(this.web3.utils.toWei(valueAtUnit.toString(), 'mwei')) <= this.web3.utils.toWei(this.web3.utils.fromWei(this.curPriceQueryThreshold, 'ether'), 'mwei') * this.web3.utils.fromWei(result, 'mwei'))) {
                    f(result);
                }else if(this.account && ls !== 0 && Number(valueAtUnit) > 0){
                    let w = this.wrapper;
                    Object.prototype.wrapped = function() {
                        return w.wrap(this);
                    };
                    this.cod.methods.priceQuery(this.account, ls, this.web3.utils.toWei(valueAtUnit.toString(), 'mwei'), this.agent)
                        .wrapped()
                        .send(this.args)
                        .on('transactionHash', console.log)
                        .on('receipt', receipt =>{
                            let intervals = [];
                            intervals.push(setInterval(() => {
                                console.log('interval of error transaction for query token price\t' + receipt.transactionHash);
                                this.web3.eth.getTransactionReceipt(receipt.transactionHash)
                                    .then((receipt) => {
                                        if(!Boolean(receipt.status)){
                                            let errMsg = 'Transaction has been reverted by the EVM, due to incorrect direction argument other than 1 or -1, or sell query with a value greater than the balance';
                                            let reject = Promise.reject(errMsg);
                                            reject.catch(e => {});
                                            intervals.forEach(f => clearInterval(f));
                                            f(reject)
                                        }
                                    })
                            }, 1000 * 10));
                            intervals.push(setInterval(() => {
                                console.log('interval of event ErrorMsg for query token price\t' + receipt.transactionHash);
                                this.cod.getPastEvents('ErrorMsg', {fromBlock: receipt.blockNumber, toBlock: 'latest'}, async (err, transactions) => {
                                    (transactions || []).forEach(result => {
                                        if (result.returnValues.origin.toLowerCase() === receipt.transactionHash.toLowerCase()){
                                            let reject = Promise.reject(result.returnValues.msg);
                                            reject.catch(e => {});
                                            intervals.forEach(f => clearInterval(f));
                                            f(reject)
                                        }
                                    })
                                })
                            }, 1000 * 10));
                            intervals.push(setInterval(() => {
                                console.log('interval of event PriceResp for query token price\t' + receipt.transactionHash);
                                this.cod.getPastEvents('PriceResp', {fromBlock: receipt.blockNumber, toBlock: 'latest'}, async (err, transactions) => {
                                    (transactions || []).forEach(result => {
                                        if(err){
                                            let reject = Promise.reject(result.returnValues.msg);
                                            reject.catch(e =>{});
                                            f(reject);
                                            intervals.forEach(f => clearInterval(f));
                                        }else if(result.returnValues.query.toLowerCase() === receipt.transactionHash.toLowerCase()){
                                            f(result.returnValues.price);
                                            intervals.forEach(f => clearInterval(f));
                                        }
                                    })
                                })
                            }, 1000 * 10));
                        })
                        .on('error', () => {
                            let errMsg = 'Transaction has been reverted by the EVM, due to incorrect direction argument other than 1 or -1, or sell query with a value greater than the balance';
                            let reject = Promise.reject(errMsg);
                            reject.catch(e =>{});
                            f(reject)})
                }
                else{
                    let reject = Promise.reject('At least one of arguments is illegal');
                    reject.catch(e =>{});
                    f(reject)
                }
            });

        return new Promise(t => f = t);
    }

    deposit(ethersToDeposit){
        let promiOrder = new PromiOrderEvent();

        if(ethersToDeposit <= 0.000001 && promiOrder.errFunc !== undefined)
            promiOrder.errFunc('mimimum ethers to deposit is 0.000001');

        let txArgs = {from: this.account, to: tbcAddress, value: this.web3.utils.toWei(ethersToDeposit.toString(), "ether"), data: this.agent === '' ? '' : this.web3.utils.toHex(this.agent)};
        if(this.args.gasPrice !== 0){
            txArgs.gasPrice = this.args.gasPrice;
            txArgs.gas = this.args.gas;
        }

        // this.web3.eth.sendTransaction(txArgs)
        this.wrapper.clone().sendPayable(txArgs)
            .on('receipt', receipt => {
                let interval = setInterval(() => {
                    console.log('interval of error transaction for deposit\t' + receipt.transactionHash);
                    this.web3.eth.getTransaction(receipt.transactionHash)
                        .then(tx => {
                            if(promiOrder.submitFunc !== undefined)
                                promiOrder.submitFunc({txHash: receipt.transactionHash, gasPaid: receipt.gasUsed * Number(tx.gasPrice)})
                        });
                    this.web3.eth.getTransactionReceipt(receipt.transactionHash)
                        .then(receipt => {
                            if(!Boolean(receipt.status)){
                                let errMsg = 'Transaction has been reverted by the EVM, due to incorrect arguments or insufficient balance';
                                let reject = Promise.reject(errMsg);
                                reject.catch(e => {});
                                clearInterval(interval);
                                if(promiOrder.errFunc !== undefined)
                                    promiOrder.errFunc(reject)
                            }
                        });
                    console.log('interval of event Deposited\t' + receipt.transactionHash);
                    this.cod.getPastEvents('Deposited', {fromBlock: receipt.blockNumber, toBlock: 'latest'}, async (err, transactions) => {
                        (transactions || []).forEach(result => {
                            if(result.returnValues.reqTxHash.toLowerCase() === receipt.transactionHash.toLowerCase() && result.returnValues.from.toLowerCase() === this.account.toLowerCase()){
                                this.web3.eth.getTransaction(receipt.transactionHash)
                                    .then(tx => {
                                        console.log(`deposit receipt.gasUsed:\t${receipt.gasUsed}`);
                                        console.log(`deposit tx.gasPrice:\t${tx.gasPrice}`);
                                        if(promiOrder.filledFunc !== undefined)
                                            promiOrder.filledFunc({txHash: receipt.transactionHash, gasPaid: receipt.gasUsed * Number(tx.gasPrice), tokens: this.web3.utils.fromWei(result.returnValues.value.toString(), 'mwei')});
                                        clearInterval(interval)
                                    })
                            }
                        })
                    });
                }, 1000 * 10);
            })
            .on('error', error => {
                if(promiOrder.errFunc !== undefined)
                    promiOrder.errFunc(error)
            });
        return promiOrder;
    }

    withdraw(tokensToWithdraw){
        let promiOrder = new PromiOrderEvent();

        let w = this.wrapper;
        Object.prototype.wrapped = function() {
            return w.wrap(this);
        };

        this.cod.methods.withdraw(this.account, tokensToWithdraw * 1e6)
            .wrapped()
            .send(this.args)
            .on('receipt', receipt => {
                let interval = setInterval(() => {
                    console.log('interval of error transaction for withdrawal\t' + receipt.transactionHash);
                    this.web3.eth.getTransaction(receipt.transactionHash)
                        .then(tx => {
                            if(promiOrder.submitFunc !== undefined)
                                promiOrder.submitFunc({txHash: receipt.transactionHash, gasPaid: receipt.gasUsed * Number(tx.gasPrice)})
                        });
                    this.web3.eth.getTransactionReceipt(receipt.transactionHash)
                        .then(receipt => {
                            if(!Boolean(receipt.status)){
                                let errMsg = 'Transaction has been reverted by the EVM, due to incorrect arguments or insufficient balance';
                                let reject = Promise.reject(errMsg);
                                reject.catch(e => {});
                                clearInterval(interval);
                                if(promiOrder.errFunc !== undefined)
                                    promiOrder.errFunc(reject)                            }
                        });
                    console.log('interval of event Withdrawn\t' + receipt.transactionHash);
                    this.cod.getPastEvents('Withdrawn', {fromBlock: receipt.blockNumber, toBlock: 'latest'}, async (err, transactions) => {
                        (transactions || []).forEach(result => {
                            if(result.returnValues.reqTxHash.toLowerCase() === receipt.transactionHash.toLowerCase())
                                this.web3.eth.getTransaction(receipt.transactionHash)
                                    .then(tx => {
                                        console.log(`withdrawal receipt.gasUsed:\t${receipt.gasUsed}`);
                                        console.log(`withdrawal tx.gasPrice:\t${tx.gasPrice}`);
                                        if(promiOrder.filledFunc !== undefined)
                                            promiOrder.filledFunc({txHash: receipt.transactionHash, gasPaid: receipt.gasUsed * Number(tx.gasPrice), ethers: this.web3.utils.fromWei(result.returnValues.value.toString(), 'ether')});
                                        clearInterval(interval)
                                    });
                        })
                    });
                }, 1000 * 10)
            })
            .on('error', (err, receipt) => {
                if(receipt){
                    let reject = Promise.reject(new Error(`out of gas: ${receipt.gasPrice}\t${receipt.gasUsed}`));
                    reject.catch(e =>{});
                    if(promiOrder.errFunc !== undefined)
                        promiOrder.errFunc(reject)
                } else{
                    let reject = Promise.reject(err);
                    reject.catch(e =>{});
                    if(promiOrder.errFunc !== undefined)
                        promiOrder.errFunc(reject)
                }
            });

        return promiOrder;
    }

    token_balance(){
        let f;

        this.cod.methods.getTokenBalance(this.account)
            .call({from: this.account})
            .then(balance =>
                f(Number(this.web3.utils.fromWei(balance, 'mwei')))
            );

        return new Promise(t => f = t);
    }

    ether_balance(){
        let f;

        this.web3.eth.getBalance(this.account)
            .then(balance => f(Number(this.web3.utils.fromWei(balance))))
            .catch(err => {{
                let reject = Promise.reject(err);
                reject.catch(e =>{});
                f(reject)
            }});

        return new Promise(t => f = t);

    }

    transfer_token(beneficiary, tokens){
        let promiOrder = new PromiOrderEvent();

        let w = this.wrapper;
        Object.prototype.wrapped = function() {
            return w.wrap(this);
        };

        let confirmed = false;

        if (tokens <= 0) {
            let reject = Promise.reject(new Error('tokens to tranfer CANNOT be 0 or less'));
            reject.catch(e =>{});
            if(promiOrder.errFunc !== undefined)
                promiOrder.errFunc(reject)
        }else{
                // let balance = await this.token_balance();

                let tokenDec6 = Number(this.web3.utils.toWei(tokens.toString(), 'mwei'));
                // if(balance < tokens){
                //     let reject = Promise.reject(new Error('tokens to tranfers CANNOT be greater than the balance'));
                //     reject.catch(e =>{});
                //     if(promiOrder.errFunc !== undefined)
                //         promiOrder.errFunc(reject)
                // }else {

                    this.cod.methods.transfer(beneficiary.toLowerCase(), tokenDec6)
                        .wrapped()
                        .send(this.args)
                        .on('receipt', receipt => {
                            this.web3.eth.getTransaction(receipt.transactionHash)
                                .then(tx => {
                                    if(promiOrder.filledFunc !== undefined)
                                        promiOrder.filledFunc({txHash: receipt.transactionHash, gasPaid: receipt.gasUsed * Number(tx.gasPrice)});
                                });
                        })
                        .on('error',err => {
                            let reject = Promise.reject(err.message);
                            reject.catch(e =>{});
                            if(promiOrder.errFunc !== undefined)
                                promiOrder.errFunc(reject)
                        })
                        .on('confirmation', (confNumber, receipt) => {
                            if(!confirmed && confNumber === 2){
                                if(promiOrder.submitFunc !== undefined)
                                    promiOrder.submitFunc({txHash: receipt.transactionHash, gasPaid: 0})
                                delete this;
                            }else if(!confirmed && confNumber >= 10){
                                confirmed = true;
                                this.web3.eth.getTransaction(receipt.transactionHash)
                                    .then(tx => {
                                        if(promiOrder.filledFunc !== undefined)
                                            promiOrder.filledFunc({txHash: receipt.transactionHash, gasPaid: receipt.gasUsed * Number(tx.gasPrice)});
                                    });
                                // console.log(`wrapper confirmation: ${confNumber}`)
                            }
                        })
                // }
        }

        return promiOrder
    }

    async query_all(account, updateWithLatestPrice = false){
        let dbEvents = this.db ? await this.db.select(`select * from events where account = '${account.toLowerCase()}' and blockNumber >= ${this.fromBlockNum}`) : [];
        dbEvents.forEach(f => f.returnValues = JSON.parse(f.returnValues));
        console.log(`db events:\t${dbEvents.length}`);
        const dbMaxBlock = this.db ? ((await this.db.select(`select latest_block_number from latest_block_number where account = '${account.toLowerCase()}'`))[0] || {latest_block_number: 0}).latest_block_number  : 0;
        const dbMinBlock = this.db ? ((await this.db.select(`select earliest_block_number from latest_block_number where account = '${account.toLowerCase()}'`))[0] || {earliest_block_number: Infinity}).earliest_block_number  : Infinity;
        console.log(`db latest block number:\t${dbMaxBlock}`);

        let fromBlockNum = this.fromBlockNum < dbMinBlock ? this.fromBlockNum : Math.max(dbMaxBlock + 1, this.fromBlockNum || 0);
        let toBlock = await this.web3.eth.getBlockNumber();
        let earliest_block_number = (fromBlockNum - 1 > dbMaxBlock || fromBlockNum - 1 < dbMinBlock) ? (fromBlockNum === this.fromBlockNum ? fromBlockNum : fromBlockNum- 1) : dbMinBlock;
        if(fromBlockNum - 1 > dbMaxBlock || fromBlockNum - 1 < dbMinBlock)
            dbEvents = [];
        let maxBlocksPerQuery = 10000; //100000000000
        let allEvents = [];

        let loop = fromBlockNum >= toBlock ? [] : [...Array(Math.floor((toBlock - fromBlockNum) / maxBlocksPerQuery) + 1).keys()];
        for(let thousands of loop) {
            let from = fromBlockNum + thousands * maxBlocksPerQuery;
            let to = Math.min(toBlock, from + maxBlocksPerQuery - 1);
            console.log(` - partitioned blocks from ${from} to ${to}`);
            if (from !== 0 && to !== 0){
                let event = await this.cod.getPastEvents('allEvents', {fromBlock: from, toBlock: to});
                if (event === undefined || event === null) {
                    console.log('validation error: ' + error);
                    return []
                } else {
                    console.log(`event:\t${event.length}\tblocks from ${from} to ${to}`);
                    if ((event[0] || {transactionHash: '0'}).transactionHash === null){
                        for (let i = 0; i< event.length; i++) {
                            let kk = await this.web3.eth.getTransactionFromBlock(event[i].blockNumber, event[i].transactionIndex);
                            event[i].transactionHash = kk.hash;
                        }
                    }
                    allEvents.push(event);
                }
            }
        }
        allEvents = allEvents.flatten().concat(dbEvents);

        let handleEvents = async (event, addr, updateWithLatestPrice) => {
            let ret = {};
            let acc = addr.toLowerCase();

            let ignored = util.buildMapStr(event.filter(f => f.event === 'IgnoreEvent').reduce((r, a) => {
                r[a.returnValues.accToIgnore.toLowerCase()] = r[a.returnValues.accToIgnore.toLowerCase()] || [];
                r[a.returnValues.accToIgnore.toLowerCase()].push(a);
                a.account = a.returnValues.accToIgnore.toLowerCase();
                return r;
            },  Object.create(null)));

            let actionMsgs = util.buildMapStr(event.filter(f => f.event === 'ActionMessage').reduce((r, a) => {
                r[a.returnValues.from.toLowerCase()] = r[a.returnValues.from.toLowerCase()] || [];
                r[a.returnValues.from.toLowerCase()].push(a);
                a.account = a.returnValues.from.toLowerCase();
                return r;
            },  Object.create(null))).filterByIgore(ignored);
            let actions = util.buildMapStr(event.filter(f => f.event === 'Action').reduce((r, a) => {
                r[a.returnValues.beneficiary.toLowerCase()] = r[a.returnValues.beneficiary.toLowerCase()] || [];
                r[a.returnValues.beneficiary.toLowerCase()].push(a);
                a.account = a.returnValues.beneficiary.toLowerCase();
                return r;
            },  Object.create(null))).filterByIgore(ignored);
            let errMsgs = util.buildMapStr(event.filter(f => f.event === 'ErrorMsg').reduce((r, a) => {
                r[a.returnValues.from.toLowerCase()] = r[a.returnValues.from.toLowerCase()] || [];
                r[a.returnValues.from.toLowerCase()].push(a);
                a.account = a.returnValues.from.toLowerCase();
                return r;
            },  Object.create(null))).filterByIgore(ignored);
            let deposits = util.buildMapStr(event.filter(f => f.event === 'Deposit').reduce((r, a) => {
                r[a.returnValues.from.toLowerCase()] = r[a.returnValues.from.toLowerCase()] || [];
                r[a.returnValues.from.toLowerCase()].push(a);
                a.account = a.returnValues.from.toLowerCase();
                return r;
            },  Object.create(null))).filterByIgore(ignored);
            let depositeds = util.buildMapStr(event.filter(f => f.event === 'Deposited').reduce((r, a) => {
                r[a.returnValues.from.toLowerCase()] = r[a.returnValues.from.toLowerCase()] || [];
                r[a.returnValues.from.toLowerCase()].push(a);
                a.account = a.returnValues.from.toLowerCase();
                return r;
            },  Object.create(null))).filterByIgore(ignored);
            let withdrawals = util.buildMapStr(event.filter(f => f.event === 'Withdrawal').reduce((r, a) => {
                r[a.returnValues.to.toLowerCase()] = r[a.returnValues.to.toLowerCase()] || [];
                r[a.returnValues.to.toLowerCase()].push(a);
                a.account = a.returnValues.to.toLowerCase();
                return r;
            },  Object.create(null))).filterByIgore(ignored);
            let withdrawns = util.buildMapStr(event.filter(f => f.event === 'Withdrawn').reduce((r, a) => {
                r[a.returnValues.to.toLowerCase()] = r[a.returnValues.to.toLowerCase()] || [];
                r[a.returnValues.to.toLowerCase()].push(a);
                a.account = a.returnValues.to.toLowerCase();
                return r;
            },  Object.create(null))).filterByIgore(ignored);
            let priceQueries = util.buildMapStr(event.filter(f => f.event === 'PriceQuery').reduce((r, a) => {
                r[a.returnValues.by.toLowerCase()] = r[a.returnValues.by.toLowerCase()] || [];
                r[a.returnValues.by.toLowerCase()].push(a);
                a.account = a.returnValues.by.toLowerCase();
                return r;
            },  Object.create(null))).filterByIgore(ignored);
            let priceResps = util.buildMapStr(event.filter(f => f.event === 'PriceResp').reduce((r, a) => {
                r[a.returnValues.by.toLowerCase()] = r[a.returnValues.by.toLowerCase()] || [];
                r[a.returnValues.by.toLowerCase()].push(a);
                a.account = a.returnValues.by.toLowerCase();
                return r;
            },  Object.create(null))).filterByIgore(ignored);
            let pauses = event.filter(f => f.event === 'Pause').map(m => {m.account = this.account; return m});
            let unpauses = event.filter(f => f.event === 'Unpause').map(m => {m.account = this.account; return m});
            let pauseState = [...pauses, ...unpauses].sort((p, c) => Number(p.returnValues.timestamp < c.returnValues.timestamp ? 1 : -1))[0] || {event: 'none'};
            let notifications = event.filter(f => f.event === 'Notification' && Number(f.returnValues.validThru) > Number(moment.tz('UTC').format('x')))
                .filter(f => !ignored.getOrElse(this.account, []).some(s => f.transactionHash === s.returnValues.txHashToIgnore))
                .map(m => {m.account = this.account; return m});

            if(this.db) {
                let e = await this.db.exec(`DELETE FROM events WHERE account = '${account}' AND (${fromBlockNum - 1} > (SELECT latest_block_number FROM latest_block_number b WHERE b.account='${account}') OR ${fromBlockNum - 1} < (SELECT earliest_block_number FROM latest_block_number b WHERE b.account='${account}'));`)
                console.log(`db purge: ${JSON.stringify(e)}`)
            }
            const entries = event.filter(f => f.account === account.toLowerCase() && !dbEvents.some(s => s.transactionHash === f.transactionHash))
                .map(m => `('${m.account.toLowerCase()}', '${m.event}', ${m.blockNumber}, '${m.transactionHash}', '${JSON.stringify(m.returnValues)}')`).join(',');
            if(this.db){
                console.log(`entries:\t${entries.length}`);
                let sql = [
                    `INSERT OR IGNORE INTO latest_block_number(account, latest_block_number, earliest_block_number) VALUES('${account.toLowerCase()}', ${toBlock}, ${earliest_block_number});`,
                    `UPDATE latest_block_number SET latest_block_number = ${toBlock}, earliest_block_number = ${earliest_block_number} WHERE account = '${account.toLowerCase()}';`,
                    entries !== '' ? `insert into events (account, event, blockNumber, transactionHash, returnValues) VALUES ${entries};` : ''
                ];

                for(let s of sql.filter(f => f !== '')){
                    let e = await this.db.exec(s);
                    console.log(`db operation: ${JSON.stringify(e)}`)
                }
            }

            let activeOrders = new Map();
            let positions = new Map();
            let wildDeposits = new Map();
            let wildWithdrawals = new Map();
            let wildPriceQueries = new Map();

            {
                let actionMsg = actionMsgs.getOrElse(acc, []);
                let action = actions.getOrElse(acc, []);
                let errMsg = errMsgs.getOrElse(acc, []);

                action = action === undefined ? [] : action;
                errMsg = errMsg === undefined ? [] : errMsg;
                //get active orders
                let set = new Set([].concat.apply(Array.from(action).map(m => m.returnValues.actionMsg), Array.from(errMsg.map(m => m.returnValues.origin))));
                let orders = [];
                actionMsg.filter(fe => !set.has(fe.transactionHash))
                    .forEach(fe =>{
                        let order = JSON.parse(fe.returnValues.data);
                        order.transactionHash = fe.transactionHash;
                        orders.push(order);
                    });
                activeOrders.set(acc, orders);

                //get positions
                let trades = action.map(m => {return [m.transactionHash, [m.returnValues.data, m.blockNumber]]});
                let [opens, closes] = Array.from(trades).reduce(
                    (result, element) => {
                        let json = JSON.parse(element[1][0]);
                        result[json.openClose === 1 ? 0 : 1].push([element[0], json, element[1][1]]); // Determine and push to small/large arr
                        return result;
                    },  [[], []]);
                let unclosed = opens.filter(f => closes.find(c => c[1].originalTxHash.toLowerCase() === f[0].toLowerCase()) === undefined);
                // if(Array.isArray(unclosed) && unclosed.length === 0 && Array.isArray(closes) && closes.length > 0)
                //     this.fromBlockNum = closes.reduce((result, element) => result > element[2] ? result : element[2], 0) + 1;
                positions.set(acc, Array.from(unclosed.map(m => {m[1].transactionHash = m[0]; return {transactionHash: m[0], trade: m[1]}})));

            }

            //get the unhandled deposit
            {
                let deposit = deposits.getOrElse(acc, []);
                let deposited = depositeds.getOrElse(acc, []);
                let errMsg = errMsgs.getOrElse(acc, []);

                let wildDep = deposit.filter(f => {
                    return !deposited.some(fd => fd.returnValues.reqTxHash.toLowerCase() === f.transactionHash.toLowerCase()) &&
                           !errMsg.some(ef => ef.returnValues.origin.toLowerCase() === f.transactionHash.toLowerCase());
                });
                wildDeposits.set(acc, wildDep);
            }

            //get the unhandled withdrawlal
            {
                let withdrawal = withdrawals.getOrElse(acc, []);
                let withdrawn = withdrawns.getOrElse(acc, []);
                let errMsg = errMsgs.getOrElse(acc, []);

                let wildWd = withdrawal.filter(f => {
                    return !withdrawn.some(fd => fd.returnValues.reqTxHash.toLowerCase() === f.transactionHash.toLowerCase()) &&
                           !errMsg.some(ef => ef.returnValues.origin.toLowerCase() === f.transactionHash.toLowerCase())
                });
                wildWithdrawals.set(acc, wildWd);
            }

            //get the unhandled price queries
            {
                let pqs = priceQueries.getOrElse(acc, []);
                let pq = priceResps.get(acc);
                let errMsg = errMsgs.getOrElse(acc, []);

                pq = pq === undefined ? [] : pq;
                errMsg = errMsg === undefined ? [] : errMsg;
                let set = new Set([].concat.apply(Array.from(pq).map(m => m.returnValues.query), Array.from(errMsg.map(m => m.returnValues.origin))));
                let queries = [];
                pqs.filter(fe => !set.has(fe.transactionHash))
                    .forEach(fe =>
                        queries.push({transactionHash: fe.transactionHash, order: fe.returnValues}));
                wildPriceQueries.set(acc, queries);
            }

            if(actionMsgs === undefined || Array.from(actionMsgs).length === 0){
                console.log(`account:\t${addr || ''}\tno any orders`)
            }

            if(addr !== undefined){
                let address = addr.toLowerCase();
                let ethers = await this.ether_balance();
                let tokens = await this.token_balance();
                ret.account = address;
                ret.ether_balance = ethers;
                ret.token_balance =tokens;
                let totalDep = deposits.getOrElse(address, []).reduce((r, a) => {r += Number(a.returnValues.value); return r}, 0) / 1e18;
                let totalWit = withdrawns.getOrElse(address, []).reduce((r, a) => {r += Number(a.returnValues.value); return r}, 0) / 1e18;
                ret.ether_deposited = totalDep;
                ret.ether_withdrawn = totalWit;
                ret.trades = actions.getOrElse(address, []).map(m => {
                    let action = JSON.parse(m.returnValues.data);
                    action.transactionHash = m.transactionHash;
                    return action
                });
                ret.trade_count = ret.trades.length;
                ret.trades_current = ret.trades.filter(m => moment().diff(moment(m.timestamp), 'hours') <= 24);
                ret.trades_current_count = ret.trades_current.length;
                ret.portfolio = !Boolean(updateWithLatestPrice) ? {positions: positions.getOrElse(address, [{trade:[]}]).map(m => m.trade), token: tokens, marketValue: undefined} : await this.with_from_block_num(fromBlockNum).query_portfolio(positions.getOrElse(address, []));
                ret.errors = errMsgs.getOrElse(address, []).map(m => {
                    return {origin: m.returnValues.origin, msg: m.returnValues.msg}
                });
                ret.active_orders = activeOrders.getOrElse(address, []).map(m => {
                    m.tokenInvested = m.openClose === 1 ? m.tokenInvested : (ret.portfolio.positions.find(f => f.txHash === m.originalTxHash) || {tokenInvested: undefined}).tokenInvested;
                    m.leverage = m.openClose === 1 ? m.leverage : (ret.portfolio.positions.find(f => f.txHash === m.originalTxHash) || {leverage: undefined}).leverage;
                    return m
                });
                ret.active_price_queries = wildPriceQueries.getOrElse(address, []);
                ret.active_deposits = wildDeposits.getOrElse(address, []).map(m => {
                    return {transactionHash: m.transactionHash, value: this.web3.utils.fromWei(Number(m.returnValues.value).toFixed(0), 'ether')}
                });
                ret.active_withdrawals = wildWithdrawals.getOrElse(address, []).map(m => {
                    return {transactionHash: m.transactionHash, value: this.web3.utils.fromWei(Number(m.returnValues.value).toFixed(0), 'mwei')}
                });
                ret.notification = notifications.map(m => {return {message: m.returnValues.message, publishedAt: moment(Number(m.returnValues.publishedAt)).local().format('YYYY-MM-DD HH:mm:ssZ'), validThru: moment(Number(m.returnValues.validThru)).local().format('YYYY-MM-DD HH:mm:ssZ')}});
                ret.pause = pauseState.event === 'none' ? {} : {paused: pauseState.event === 'Pause', timestamp: pauseState.returnValues.timestamp, message: pauseState.returnValues.message};
            }
            ret.token_price = await this.cod.methods.getArguments('CurrentPrice').call();
            return ret
        };

        return handleEvents(allEvents, account, updateWithLatestPrice);
    }
}

module.exports = Trade;