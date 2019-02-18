# tradebridgecoin-gui
## Innovation to trade stocks, derivatives, fx and cryptocurrencies on the Ethereum, costless and cash-out ready!

TradeBridgeCoin (___TBC___) creates an brand-new and innovative way to trade stocks, volatility index, foreign exchange pairs, crypto/crypto pairs, crypto/fiat pairs and other derivatives in a costless, effective, anonymous and ICO scam free way on the Ethereum chains. 

### Who is better off using TBC
 - Cryptocurrency holders who are willing to benefit from the traditional financial markets without lossing the cryptocurrency holdings. Take the Bitcoin holders for example, TBC offers a way to hold AAPL(Apple Inc.) positions with the tokens while hedged against Bitcoin, i.e., holders are able to profit from two parts of returns: 1. AAPL USD-dominated return and 2. Bitcoin fiat-currency-dominated return. In order to achieve this goal, simply buy AAPL.US(to be supported) with TBC and short TBC.BTC.CRYPTO(currently supported) with TBC at the customizable leverages. 
 - Investors seeking unsupported financial instruments in the original markets, e.g., shorting stocks in the Chinese A Share stock markets or trading SHSE 50 volatility index aka, Chinese VIX.  
 - Investors seeking uniform APIs in various global major financial markets, such as U.S. stock markets (to be supported), Chinese stock markets(currently supported), India stock markets(to be supported), fx and cryptocurrency markets.
 - Investors who are willing to manage global portfolio in any fiat currencies by hedging their TBC portfolio with TBC.{fiat currency}.FX
 - Investors who are willing to gain financial exposures to the traditionally unaccessible financial markets. 
### What can TradeBridgeCoin offer:
 - make market for ALL financial instruments that TradeBridgeCoin claims to support, i.e., as long as bid/ask quotes exist in the original market, deal is guaranteed
 - mechanism to hedge portfolio against the volatility of TBC over major fiat or crypto currencies, thus making portfolio management in terms of primary fiat currency possible
 - out-of-box full-function ___GUI___ for portfolio management, watch list and trade on Windows, MacOS and Linux. Mobile app is upcoming.
 - out-of-box full-function javascript ___APIs___ support, which may help automate and quantify strategies
 - protect any users from ___ICO scam___ by supporting real-time token(TBC)/ether(ETH) exchange, e.g., anyone can deposit tokens by sending ethers and withdraw ethers by sending tokens of any amount at ANY TIME, no restrictions at all
 - following is the list of the currently supported financial instruments:
> 1. stocks, indices, bonds and convertibles on China A-Share market
> 2. foreign exchange pairs, including all major currencies against USD, as well as major currencies against CNY
> 3. volatility index of China`s A-Share market based on the SHEX 50 ETF options, aka Chinese VIX
> 4. USD, EUR, GBP, JPY, AUD, NZD, CNY against BTC, ETH, BCH, LTC, EOS, XRP, XMMR, TBC and cryptocurrencies against TBC
 - supported financial instruments are expected and scheduled to grow. Planned ones include stocks in the U.S. markets and Indian markets and options for supported stocks. For details, please check the Roadmap

### What TradeBridgeCoin CANNOT offer:
 - dividends of stocks
 - delivery of underlying of derivatives
 - coupon interests of bonds
 - converted stocks by convertible bonds
 - voting rights and claims on corporate equities and/or assets

### Advantages over the traditional trading
 - no commissions charged on any transaction of the supported instruments!
 - no interests charged on leveraged positions for any length of holding duration
 - no market impact for large-sized orders. However large the size of order is, the original bid/ask will be used for the transaction
 - expansion on original trading system, including T + 0 daily reverse and short on markets that do not originally support them, e.g., China's A share stocks market and volatility index based on SHSE 50 ETF options
 - customizable leverage. You can specify your desired leverage ratio in the range(for example 0 ~ 10 for stocks and 0 ~ 20 for fx pairs) for any order
 - immediate innovation on demand, such as tradable volatility index based on SHSE 50 ETF options, aka, Chinese VIX, as well as the planned stock options, which are far behind availability on the SHSE/SZSE, and any other products that users show enough interests in and are applicable.
 - APIs that make the quantified strategies automated even on markets that do not originally support it, e.g., there are no any trading API services by any brokers for A-Share stocks, and the APIs provided by TradeBridgeCoin make a lot of intereting strategies available and sustainably profitable
 - Guaranteed long-term gradual appreciation of the value of the token(TBC) over the ether. This appreciation will make any investment or speculation dominated by TBC a cushion
 - Any tiny fraction of funds can be accepted, as long as it is equal to or larger than 0.000001 token(TBC)

### How to start
- GUI desktop
> - install executables
> - install from sources
> - start
>>run the GUI from the OS, either by double-clicking the icon or form the command-line with an fully accessible Ethereum account ready. When started out, input 
### Roadmap
 - current: 
> - full-function GUI on Windows, MacOS and Linux
> - full-function API-based quoting & trading system
> - support Chinese A-Share stocks, bonds and convertible bonds, CNY major foreign pairs and Chinese vix
> - support real-time deposit ethers for TBC & withdrawal from TBC to ethers, and maintain the long-term gradual appreciation of TBC/ETH 
 - short-term: 
> - expand supported financial instruments. Planned expansion includes stocks in the U.S. and the Indian markets, as well as options for supported stocks and other derivatives, such as futures and options on futures on the supported markets
> - full-function mobile app on Android and iOS
> - open for suggestion from users to make more expansion of supported products and markets
 - mid-term:
> - closure on the expansion of the supported financial instruments
> - development and open test of oraclization of existing financial instruments 
> - tansport the entire trading system to oraclization-based and make it totally decentralized application
 - long-term:
> - stop making market for the TBC itself after making TBC listed on major cryptocurrency exchange

### How TradeBridgeCoin works

Before starting trading, there are a few important differences between the TradeBridgeCoin trading system and the traditional ones, which are fundamental to understand how the TradeBridgeCoin works:
 
 - TradeBridgeCoin trading system is transaction-based, rather than account-based, which means once a positions-open order has been filled, a close order MUST be the reverse action of the correspondent open transaction, and margin requirement validation is also on position basis. For example, a 100 TBC long CNY.USD.FX open order is filled, following a 50 TBC long CNY.USD.FX open order that has been filled previously. After that, totally 150 TBC long CNY.USD.FX are in the open positions. In order to close them, two close orders must be submitted respectively, each of which must come with the accordant open transaction hash. Margin requirement will be explained by the following entry.
 - total profits/losses are calculated by two methods:   
   1) as for the stocks whose prices could be adjusted due to dividends or splits, accumulating daily rate of return (in the accuracy of 4 decimals) of the underlying instruments, multiplied by the leverage ratio specified in the open order and then multiplied by the invested tokens. For example, an open order is short stock A with 100 tokens and a leverage ratio of 3.2 on Day 1 at the price of 23.3 with the precentage change of 1.3%, and the following days' market close price percentage changes are as follows: Day 1 2.53%, Day 2 3.46%, Day 3 -1.23%, Day 4 -2.33%, Day 5 -1.33% and Day 6 when a close order is filled at the percentage change of 1.3%. The PnL is calculated as following:

          ((2 - (1 + 2.53%)/(1 + 1.3%)) * (1 - 3.46%) * (1 - -1.23%) * (1 - -2.33%) * (1 - 1.33%) * (1 - 1.3%) - 1) * 3.2 * 100 = -12.130817
   2) as for the rest whose price is not adjustable, open price and close price are used to get the raw rates of return, which in turn are multiplied by leverage to get the real rates of return.  
   
   Please be noted that leverage ratio equal to 1 effectively means no leverage on positions and leverage ratio less than 1 and more than 0 effectively means positions reversely-leveraged
 - every and each position is subject to real-time validation for its margin requirement. Any positions with less than 10% margin cushion on its own invested tokens will be liquidated. For example, a position with a leverage of 10 sees an accumulated rate of return of -9.6% before leverage, therefore at this particular point, this position has a real-time rate of return -9.6% * 10 = -96%, resulting in a mere 4% margin cushion, thus in turn triggering a liquidation, ***no matter how much the balance of the account is***
 - An order will be either filled or rejected with error message. e.g., an order can only specify the worst scenario price at which the order can be filled rather than a precise price. Any order is filled at the bid/ask price right at the time that the order is logged to the chain. As long as the order is filled, the price of the transaction must be as good as or better than the specified price. If a deal cannot be made at the specified price, an error will be logged and returned. 
   Please be noted that given the fact that it is very likely to take dozens of seconds or even close to a minute for the order submitted to the chain to be logged on the chain, to specify a price that is very close to bid/ask results in high odds for the rejection of the order if the market moves against the order

### How To Trade
- GUI
> ** Please be ___NOTICED___, in GUI, a window for any transactions, i.e., deposits, withdrawals and orders must be opened ___NO SOONER THAN___ the previous transaction has been submitted onto the net with a transaction hash or an error message returned! However, this restriction ___DOES NOT___ applies to API transactions.
>
> - Live Trading vs. Paper Trading
>
>  Live trading is make TBC trading on the main net of Ethereum and exchange TBC for the real ethers. On the contrary, paper trading is to make test TBC trading on the ropsten test net and exchange test TBC for the the ropsten test ethers. Test ethers could be obtained at the https://faucet.metamask.io/ using MetaMask plugin in Chrome/Firefox  
>  Before make any serious real TBC trading, paper trading is encouraged to test your trading environments and trading strategies.  
>
>  On the right-upper corner of the login window, Live / Paper trading can be toggled
>
> - Account  
>  In order to use TBC to trade on the Ethereum chains, there must be a fully-accessible Ethereum account, i.e., an account with mnemonic, private key and/or keystore file. Whenever an order is to be placed against the account, one of the three methods has to be provided to sign the transaction. In the deposit, withdraw and order windows, pick one from the drop-down list of decryption and click Next button, subsequently provide correspondent information in accordant with the chosen method  
>
>  Please be noted that in GUI the decryption information WILL NOT BE stored in any means and will be forgotten after used to sign the transaction, thus meaning the decryption information has to be provided every time a transaction is to be made. As for API, it will be users' responsibility to keep the account and the decryption information secure.  
>
> - Portfolio
>
>  Once the GUI is started up, portfolio window prompts up in the first place to show notifications, the balance of TBC in the account, open positions and their market values, active orders, active deposits, active withdrawal and any error messages.
>
>  All historical trades reside permanently on the chain as the event logs and are ready to be retrieved.
>
> - Gas  
>  Gas is the cost in ether paid to the Ethereum chains to log any transactions on the chains whether TBC transaction is successful or not, typically varying between 0.0001 ethers and 0.005 ethers for any TBC transactions whatever the size of the transactions will be. For deposit, withdrawal and order, there is a gas price field coming with the default value of the current gas price on the chains. Typically the default value is good, but increasing the value by an acceptable percentage will always help the transaction to be logged onto the chain faster.
> - Deposit
> 
>   click on Deposit button on the first column of the Balance section to open a deposit window, fill all required fields, click on Next button and pick and complete the decryption to deposit. When an ether value is specified and Next button is clicked on, the price will be queried and prompt, but the actual price of the deposit is only decided until the deposit happens on the chain. 
>
>   Another way to deposit is just simply send ethers to the contract address and correspondent amount of tokens will be deposit.
>
>   Please allow a few minutes for the tokens deposited to the account after a bunch of blocks have to be confirmed. If in a jammed situation, it may take much more time for the deposit. Increasing gas price will always help. And a commission will be charged on the deposit, currently 5%
>
> - Withdraw
>
>  It is GUARANTEED that at any time, any amount of tokens in the account can be exchanged for ethers that will be withdrawn to the same account
>  
>  It is the same as the deposit, a price query could and should be done before withdrawal after a TBC value to withdraw is specified and Next button is clicked on.
>  
>  Please be noted that the values should be less than the balance of the account for both of a query or a withdraw order, otherwise, an error occurs.
>  
>  Please allow a few minutes for the ethers to be deposited to the account after a bunch of blocks have to be confirmed. If in a jammed situation, it may take much more time for the withdrawal. Increasing gas price will always help. . And a commission will be charged on the withdrawal, currently 5%
>
>    
> - Watch List  
>
>    Click on the Watchlist button on the right-upper corner of the Portfolio window will open a watch list window, where symbols could be added to watch list and the refresh rate for each category could be changed.  
>    
>    The complete list of the supported financial instruments can be accessed in the file metadata.js
>
>  Please be noted that the quote streaming is obtained by http polling. Therefore, a reasonable polling interval is essential to get a stable and sustainable quote streaming. The default intervals would be good choice.
>  The quote feeds are provided by trustworth sources, such as the stock quotes from 163.com, which is one of the large portal websites in China and CNY foreign exchange rates from Bank of China. 
>
>
> - Order   
>
>   There are 2 ways to place an open order:
>> 1. click on the Order button on the right-upper corner of the portfolio window to prompt up the order window.
>> 2. in the watchlist window, click on the Order button in the first column to prompt up the order window.      
>
>   And there is only 1 way to place a close order:  
>> - click on the Close button in the first column of the Positions section.  
>
>  In the order window, there are a few fields to be filled in order to send an open order  
>> - category: currently 1 ~ 4 categories are supported. GUI can automatically determine the category according to the symbol input
>> - symbol: symbol for financial instruments. The complete list of the supported financial instruments can be accessed in the file metadata.js
>> - direction: 1 means going long, -1 means going short and other numbers incur error.
>> - openClose: 1 means opening positions, -1 means closing positions and any other numbers incur error.
>> - leverage: leverage range of various category varies. In GUI, once a category or a symbol is specified, a tooltip will be available to check the leverage range and the trading hours. Leverage ratio equal to 1 effectively means no leverage on positions and leverage ratio less than 1 and more than 0 effectively means positions reversely-leveraged. The leverage ratio is used in the calculation of total PnL.
>> - tokenToInvest: it explains itself. The legal minimal number is 1E-6 TBCs
>> - posHash: it has to be specified when the order is a close order and the it has to be the transaction hash of the correspondent open order, which is returned after the open order is filled or after the positions are queried. For the open order, leave this field empty.  
>> - price: the price in the worst scenario case, i.e., the actual deal price is better than or as good as the price specified. If the price specified is lower than ask price in an long order or higher than bid price in a short order when the order is logged onto the chain will make the order rejected. To leave the field blank will guarantee the transaction but at the risk of sudden adverse move in the bid/ask price. For the time being, only Market order type is accepted, which means an order will be executed at the best bid/ask price when the order is logged onto the chain if the order is correct and applicable or rejected as an error that is to be logged onto the chain. And Please be noted that given the fact that it is very likely to take dozens of seconds or even close to a minute for the order submitted to the chain to be logged on the chain, to specify a price that is very close to bid/ask results in high odds for the rejection of the order if the market moves against the order
>
> - Settings
>
>> - Ethereum Node (end point in API)
>>
>>  This is the Ethereum node address that this client is connected to in order to make any transaction on the chains in the form of "https://" or "ws://". In default, an endpoint of Infura, a public Ethereum node, is filled for the convenience, however it will be the best for any user to apply for his/her own endpoint at <https://infura.io>. If a private geth or parity node is set up, the node address is in the form of ws://x.x.x.x:x should be put here.  
>>  Please be noted that "mainnet" or "testnet" comes right after "Ethereum Node" and appears under the "Ethereum Node In Use" indicates whether this settings is for the live trading (mainnet) or the paper trading (testnet), which demands the correspondent end point, i.e., if Infura endpoint is used, https://mainnet.infura.io/v3/{key} for the live trading and https://ropsten.infura.io/v3/{key} for the paper trading; if a private node is used, please make sure the right arguments are used to start up the node (testnet ropsten must be used for the paper trading).  
>>
>> - Starting Block Number
>>
>>  TBC is on the Ethereum chains that are constituted by blocks, which have grown to a bunch of millions and are expected to grow. The starting block number indicates the number of block from which on transactions will be retrieved. The default value is the block where the TBC is created. Typically, no need to change this value and just delete the value and leave the input box blank to remove the cache and retrieve all records from the chains when restarted if any users believe any transaction records are incomplete.
 - API  
```javascript
/*
*IMPORTANT:
*    API is shared between GUI and the pure API, and acts as the backbone of the GUI part. However, in order to use the standalone API in a programming environment and run this demo,
*    this API directory has to be copied to another directory and re-run in the new directory "npm install" once again!
*/

//the following line MUST be the first statement!
process.env.TBCTMP = 'PAPER'; //set the environment variable TBCTMP to LIVE, if to trade on the live net

const MD = require('../market-data-feed');
const TD = require('../trade-on-chain');

let endpoint = process.env.TBCTMP === 'LIVE' ?
    'https://mainnet.infura.io/v3/ee07e33cb6414781a72deaf3b303ca3b' : // use Ethereum main net to live trade
    'https://ropsten.infura.io/v3/ee07e33cb6414781a72deaf3b303ca3b';  // use ropsten test-net to paper trade
let account = '0x'; // specify the account; different accounts in main net vs. test net
let keystore = '';  // specify the keystore file path
let tokenReceiver = '0x'; //address to be used as the beneficiary in the demo of token transfer
let password = process.env.PWD; //the password to the keystore file, provided by the environment variable of the O.S. for the security sake, if to use keystore to sign transactions
// let mnemoic = process.env.MNEMONIC; // the mnemonic to use to decrypt the account, if to use mnemonic to sign transactions
// let privateKey = process.env.PKEY; //the private key of the account, if to use private key to sign transactions

let toOrderMap = new Map(['600010.SS', '002083.SZ', '000300.SS', 'USD.CNY.FX', 'JPY.CNY.FX', 'EUR.CNY.FX', 'USD.JPY.FX', "IVX.SS", 'TBC.CNY.CRYPTO', 'ETH.USD.CRYPTO', 'BTC.JPY.CRYPTO', 'ETH.CNY.CRYPTO', 'BTC.EUR.CRYPTO', 'EOS.CNY.CRYPTO', 'TBC.USD.CRYPTO', 'BTC.TBC.CRYPTO', 'ETH.TBC.CRYPTO', 'EOS.TBC.CRYPTO', 'XMR.TBC.CRYPTO', 'XRP.TBC.CRYPTO', 'BCH.TBC.CRYPTO', 'LTC.TBC.CRYPTO']
                    .map(m => [m, false]));
let stage = 0;

TD.newInstance({endpoint, account}).then( async td => {
    console.log(`balance of token: ${await td.token_balance()}`);
    let all_queried =
        await td
        // .with_from_block_num(45000000) //start block number, from which on query will be done, default value is the start block number of the smart contract
        .query_all(account, true);  //the second argument is whether to query the latest prices of positions to get the market values of holdings

    //query all relevant data from the chain
    console.log(`the smart contract is up: ${all_queried.pause.paused ? 'no' : 'yes'}`);
    console.log(`market value of all positions: ${all_queried.portfolio.marketValue}`);
    console.log(`liquidation value: ${all_queried.portfolio.marketValue + all_queried.portfolio.token}`);
    console.log(`positions:`);
    console.log(...all_queried.portfolio.positions);
    console.log('active orders:\n');
    console.log(...all_queried.active_orders);
    console.log('active deposits:\n');
    console.log(...all_queried.active_deposits);
    console.log('active withdrawals:\n');
    console.log(...all_queried.active_withdrawals);
    console.log('active withdrawals:\n');
    console.log(...all_queried.active_withdrawals);
    console.log('error messages:\n');
    console.log(...all_queried.errors);
    console.log('current trades:'); //current trades are the trades that happen within the local current calendar date
    console.log(...all_queried.trades_current);

    console.log(`ether balance of account ${account}:\t${await td.ether_balance()}`);

    setInterval(async () => {
        if (stage === 0) {
            stage = -1;
            console.log('\ndeposit 1.123456 ether...this will take tens of seconds to minutes');
            td
            //pick one of three to sign transactions
                .with_keystoreJsonV3(require('fs').readFileSync(keystore).toString(), password)
                //.with_private_key(privateKey)
                //.with_mnemonic(mnemonic, 0)
                .with_gas_arguments(await td.query_gas_price(true), 100000) //current gas price will be used to submit the order. In order for the deposit to be submitted faster, increase the gas price by an acceptable percentage
                .deposit(0.1123456)
                .on('submitted', orderLog => {
                    //submit callback will be triggered periodically till the transaction is filled
                    console.log('deposit submitted with the transaction hash: ' + orderLog.txHash + '\tand gas paid ' + orderLog.gasPaid + '\tfor the account ' + account);
                })
                .on('filled', tradeLog => {
                    console.log('deposit succeeded: ' + JSON.stringify(tradeLog));
                    stage = 1;
                })
                .on('error', err => {
                    console.log(err.message  + '\t' + account)
                });
        }
    }, 500);



    //withdraw 100.654321 TBC after the deposit is done
    setInterval(async () => {
        if(stage === 1){
            stage = -1;
            console.log('\nwithdraw 100.654321 TBC...this will take tens of seconds to minutes');

            td
            //pick one of three to sign transactions
                .with_keystoreJsonV3(require('fs').readFileSync(keystore).toString(), password)
                //.with_private_key(privateKey)
                //.with_mnemonic(mnemonic, 0)
                .with_gas_arguments(await td.query_gas_price(true), 100000) //current gas price will be used to submit the order. In order for the withdrawal to be submitted faster, increase the gas price by an acceptable percentage
                .withdraw(100.654321)
                .on('submitted', orderLog => {
                    //submit callback will be triggered periodically till the transaction is filled
                    console.log('withdrawal submitted with the transaction hash: ' + orderLog.txHash + '\tand gas paid ' + orderLog.gasPaid + '\tfor the account ' + account);
                })
                .on('filled', tradeLog => {
                    console.log('withdrawal succeeded: ' + JSON.stringify(tradeLog));
                    stage = 2
                })
                .on('error', async err => {
                    console.log(await err.message  + '\t' + account)
                });
        }

    }, 500);


    //transfer tokens to the 3rd address
    setInterval(() => {
        if(stage === 2){
            stage = -1;
            console.log('\ntransfer 11.123 TBC...this will take tens of seconds');

            td.with_keystoreJsonV3(require('fs').readFileSync(keystore).toString(), password).with_gas_arguments(10, 100000)
                .transfer_token(tokenReceiver, Number(11.123))
                .on('submitted', receipt =>
                    //submit callback will be triggered periodically till the transaction is filled
                    console.log(`the transfer has been submitted with transaction hash ${receipt.txHash}`))
                .on('filled', receipt => {
                    stage = 3;
                    console.log(`the transfer has been confirmed: ${receipt.txHash} and gas paid ${receipt.gasPaid / 1e18}`)
                })
                .on('error', err => console.log(err.toString()));
        }
    }, 500);

    setInterval(() => {
        if(stage === 3){
            stage = -1;
            console.log('\nmake a number of orders...this will take minutes');

            //instantiation of the market data class
            let md = new MD(td);

            //refresh rate in second of the market data of each category. if not set, default values will be used. Typically default values will do
            //the following settings are default values of the refresh rate. it will be safe to delete the following line
            let intervals = new Map().set('1', 10).set('2', 10).set('3', 30).set('4', 15);

            //specify the provider of each category. Each category can be implemented with multiple providers, but only one can be used.
            // For the time being, only one provider for each category.
            let providers = new Map().set('1', '163_api');

            //to subscribe to the market data feed. Please check metadata.js the for the all supported categories and instruments
            md
                .withIntervals(intervals)
                .withProviders(providers)
                .subscribe([
                    {category: 1, symbols:['600010.SS', '002083.SZ', '000300.SS']},
                    {category: 2, symbols:['USD.CNY.FX', 'JPY.CNY.FX', 'EUR.CNY.FX', 'USD.JPY.FX']},
                    {category: 3, symbols:['IVX.SS']},
                    {category: 4, symbols:['TBC.CNY.CRYPTO', 'ETH.USD.CRYPTO', 'BTC.JPY.CRYPTO', 'ETH.CNY.CRYPTO', 'BTC.EUR.CRYPTO', 'EOS.CNY.CRYPTO', 'TBC.USD.CRYPTO', 'BTC.TBC.CRYPTO', 'ETH.TBC.CRYPTO', 'EOS.TBC.CRYPTO', 'XMR.TBC.CRYPTO', 'XRP.TBC.CRYPTO', 'BCH.TBC.CRYPTO', 'LTC.TBC.CRYPTO']}
                ]);

            //the function to handle the upcoming quotations of all subscriptions
            let quoteHandle = async (c, f) => {
                let exchange = f.moment.format('YYYY-MM-DD HH:mm:ssZ');
                let local = f.moment.local().format('YYYY-MM-DD HH:mm:ssZ');
                console.log(`category: ${c}\texchange: ${exchange}\tlocal: ${local}\nquote:\t${JSON.stringify(f)}`);
                if(!toOrderMap.get(f.symbol)) {
                    toOrderMap.set(f.symbol, true);

                    if (md.isInTradingHours(c)) {
                        let orderJSON = {
                            category: c,  //currently category 1, 2, 3, 4 are supported
                            rawSymbol: f.symbol,
                            direction: 1, //1 for long, -1 for short
                            openClose: 1, //1 for open, -1 for close
                            leverage: 5.0, //please check the metadata.js for the range of leverage for specific category
                            tokenToInvest: 10.123456, //in terms of TBC
                            posHash: '', //empty for long order; as for close order, query the transaction to open the position for the transaction hash and input the hash here
                            price: f.ask * 1.02 //worst acceptable price
                        };
                        td
                            .with_keystoreJsonV3(require('fs').readFileSync(keystore).toString(), password)
                            //.with_private_key(privateKey)
                            //.with_mnemonic(menemonic, 0)
                            .with_gas_arguments(await td.query_gas_price(true), 100000) //current gas price will be used to submit the order. In order for the order to be submitted faster, increase the gas price by an acceptable percentage
                            .order(orderJSON, err => console.log(err))
                            .on('submitted', receipt => {
                                //submit callback will be triggered periodically till the transaction is filled
                                console.log(`the order has been submitted with transaction hash ${receipt.txHash} and gas paid ${receipt.gasPaid / 1e18}`);
                            })
                            .on('filled', receipt => {
                                //the tokenInvested field in the confirmation in the minimal decimal of TBC, which is 6. to divide the tokenInvested by 1e6 to get the actual number
                                //the tokenInvested field for the open order is the specified in the order, but for the close order
                                //  if positive it is the tokens added to the balance of the account after the position is close;
                                //  if negative, typically occurred in a forced liquidation, it is a deduction to the balance of the account. If the balance is lower than deduction, any open positions could be liquidated to compensate
                                //the ror field is the rate of return after calculating the leverage, i.e., the real rate of return for the position
                                console.log(`the order has been confirmed: ${receipt.confirmation}`);
                            })
                            .on('error', err => {
                                console.log(`ERROR: ${JSON.stringify(err)}`);
                            });
                    } else {
                        console.log('it is not in the trading hours!')
                    }
                }
            };

            md.onMarketData(quote => {
                    switch (quote.category) {
                        case 1:
                            quote.quotes.forEach(f => quoteHandle(1, f));
                            break;
                        case 2:
                            quote.quotes.forEach(f => quoteHandle(2, f));
                            break;
                        case 3:
                            quote.quotes.forEach(f => quoteHandle(3, f));
                            break;
                        case 4:
                            quote.quotes.forEach(f => quoteHandle(4, f));
                            break;
                    }
                }
            );
        }
    }, 500);

});
```  

