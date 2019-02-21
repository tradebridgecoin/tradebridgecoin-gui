const body = document.getElementsByTagName('BODY')[0];
const tokens_to_invest = document.getElementById('tokens_to_invest');
const gas_price = document.getElementById('gas_price');
const decryption = document.getElementById('decryption');
const category = document.getElementById('category');
const symbol = document.getElementById('symbol');
const symbol_quote = document.getElementById('symbol_quote');
const quote_label = document.getElementById('quote');
const leverage = document.getElementById('leverage');
const direction = document.getElementById('direction');
const open_close = document.getElementById('open_close');
const limit_price = document.getElementById('limit_price');
const next_btn = document.getElementById('next_btn');
const err_msg = document.getElementById('err_msg');
const token_price = document.getElementById('token_price');
const category_tip = document.getElementById('category_tip');
const place_order = document.getElementById('place_order');
const symbol_dropdown = document.getElementById('history_symbols');
const moment = require('moment-timezone');

const fs = require('fs');
const { remote, BrowserWindow, dialog } = require('electron');

process.env.TBCTMP = getParam('net') === 'mainnet' ? 'LIVE' : 'PAPER';

const TD = require('../../api/trade-on-chain');
const MD = require('../../api/market-data-feed');
const meta = require('../../api/metadata').metadata.data;

let account, td, md, token_balance, queriedGasPrice;
const gasLimit = 100000;

function getParam(name){
    if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(remote.getCurrentWebContents().getURL()))
        return decodeURIComponent(name[1]);
    else
        return undefined;
}

let isInTradingHours = (category) => {
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

let tradingHours = (category) => {
    let cat = meta.categories[category];
    let th = meta.categories[category].tradingHours;
    return `--time zone: ${cat.timeZone}<br>--trading hours: ${th.time}<br>--trading days: ${th.day}<br>${th.dayOff.length === 0 ? '' : `--days off: ${th.dayOff}`}`
};

let scrollToBottom = () => {
    const documentHeight = document.documentElement.offsetHeight;
    const viewportHeight = window.innerHeight;
    window.scrollTo(0,documentHeight);
};

let onQuote = () => {
    let symbolCategory = meta.supportedCategories.find(f =>
        meta.categories[f].symbols.indexOf(symbol.value.toUpperCase()) >= 0 ||
        new RegExp(meta.categories[f].symbols[0]).test(symbol.value.toUpperCase()));

    if(symbol.value === '') {
        quote_label.innerHTML = "symbol is required"
    }else if(symbolCategory === undefined){
        category.selectedIndex = 0;
        quote_label.innerHTML = "symbol is currently INVALID or UNSUPPORTED";
        categoryUpdate();
    }else {
        category.selectedIndex = Number(symbolCategory);
        categoryUpdate();
        quote_label.innerHTML = "querying...";
        md.unsubscribeAll();
        md.subscribe([{category: Number(symbolCategory), symbols: [symbol.value.trim().toUpperCase()]}]);
        md.onSnapshot(quote => {
            console.log(`quote:\t${JSON.stringify(  quote)}`);
            if(quote.error){
                quote_label.innerHTML = `Category ${symbolCategory} Symbol ${symbol.value.trim()} is INVALID or UNSUPPORTED`;
            }else if(Array.from(quote.quotes.keys()).length > 0){
                symbol_dropdown.innerHTML += symbol_dropdown.innerHTML.indexOf(symbol.value) > 0 ? "" : "<option value='" + symbol.value + "'/>";
                let th = isInTradingHours(Number(category.value)) ? '<br>' : '<label style="color: red">OUTSIDE THE TRADING HOURS. please see tips</label><br>';
                switch (quote.category) {
                    case 1:
                        quote.quotes.forEach(f => {
                            let exchange = f.moment.format('YYYY-MM-DD HH:mm:ssZ');
                            let local = f.moment.local().format('YYYY-MM-DD HH:mm:ssZ');
                            quote_label.innerHTML = th + `<br>local: ${local}<br>exchange: ${exchange}` + JSON.stringify(f, null, '<br>').replace(/\n/g, '').replace('{', '').replace('}', '').replace(/"/g, '')
                        });
                        break;
                    case 2:
                        quote.quotes.forEach(f => {
                            let exchange = f.moment.format('YYYY-MM-DD HH:mm:ssZ');
                            let local = f.moment.local().format('YYYY-MM-DD HH:mm:ssZ');
                            quote_label.innerHTML = th + `<br>local: ${local}<br>exchange: ${exchange}` + JSON.stringify(f, null, '<br>').replace(/\n/g, '').replace('{', '').replace('}', '').replace(/"/g, '')
                        });
                        break;
                    case 3:
                        quote.quotes.forEach(f => {
                            let exchange = f.moment.format('YYYY-MM-DD HH:mm:ssZ');
                            let local = f.moment.local().format('YYYY-MM-DD HH:mm:ssZ');
                            quote_label.innerHTML = th + `<br>local: ${local}<br>exchange: ${exchange}` + JSON.stringify(f, null, '<br>').replace(/\n/g, '').replace('{', '').replace('}', '').replace(/"/g, '').trim()
                        });
                        break;
                    case 4:
                        quote.quotes.forEach(f => {
                            let exchange = f.moment.format('YYYY-MM-DD HH:mm:ssZ');
                            let local = f.moment.local().format('YYYY-MM-DD HH:mm:ssZ');
                            quote_label.innerHTML = th + `<br>local: ${local}<br>exchange: ${exchange}` + JSON.stringify(f, null, '<br>').replace(/\n/g, '').replace('{', '').replace('}', '').replace(/"/g, '').trim()
                        });
                        break;
                }
            }
        })
    }
};

let onBodyLoad = () => {
    // remote.getCurrentWebContents().openDevTools();
    account = getParam('account');
    const endpoint = getParam('endpoint');
    document.getElementById('account').innerText = getParam('account');
    console.log(`account:\t${account}`);
    if(getParam('open_close') === '-1'){
        category.selectedIndex = Number(getParam("category"));
        category.setAttribute("disabled", "");
        direction.selectedIndex = getParam("direction") === "1" ? 1 : 2;
        direction.setAttribute("disabled", "");
        open_close.selectedIndex = getParam("open_close") === "1" ? 1 : 2;
        open_close.setAttribute("disabled", "");
        symbol.value = getParam("symbol");
        symbol.setAttribute("disabled", "");
        leverage.value = getParam("leverage");
        leverage.setAttribute("disabled", "");
        tokens_to_invest.value = getParam("tokens_to_invest");
        tokens_to_invest.setAttribute("disabled", "");
        categoryUpdate();
    }else if(getParam('open_close') === '1'){
        open_close.selectedIndex = 1;
        open_close.setAttribute("disabled", "");
        category.selectedIndex = Number(getParam("category"));
        symbol.value = getParam("symbol");
        categoryUpdate();
    }else{
        open_close.selectedIndex = 1;
        open_close.setAttribute("disabled", "");
    }

    TD.newInstance({endpoint, account, agent: ''}).then(async trade => {
        td = trade;
        md = new MD(td);
        queriedGasPrice = await td.query_gas_price(true);
        gas_price.placeholder = `gas price: default to ${queriedGasPrice}`;
        token_balance = await td.token_balance();
        tokens_to_invest.placeholder = `tokens to invest. balance: ${token_balance}`;
        if(symbol.value !== undefined && symbol.value !== '')
            onQuote();
    });
};

let onNextButtonClick = async () => {
    err_msg.innerHTML = "";
    let gasPrice = Number(gas_price.value || queriedGasPrice);
    if(quote_label.innerHTML === ""){
        err_msg.innerHTML = 'please get the quote before going next'
    }else if(open_close.value === 'void'){
        err_msg.innerHTML = 'open_close MUST be either open or close'
    }else if(direction.value === 'void'){
        err_msg.innerHTML = 'direction MUST be either long or short'
    }else if(isNaN(Number(tokens_to_invest.value)) || Number(tokens_to_invest.value) <= 0 || Number(tokens_to_invest.value) !== Number(Number(tokens_to_invest.value).toFixed(6))){
        err_msg.innerHTML = 'invalid tokens to invest! Must be positive and with max 6 decimals'
    }else if(open_close.value === '1' && Number(tokens_to_invest.value) > token_balance){
        err_msg.innerHTML = 'insufficient balance!'
    }else if(Number(leverage.value) <= meta.categories[Number(category.value)].leverage[0] ||
             Number(leverage.value) >  meta.categories[Number(category.value)].leverage[1]){
        err_msg.innerHTML = `leverage range for the category ${category.value} is ${meta.categories[Number(category.value)].leverage}`
    }else if(decryption.value === 'keystore' || decryption.value === 'private_key' || decryption.value === 'mnemonic'){
        let msgBoard = document.getElementById('tx_msg');
        next_btn.setAttribute("disabled", "");
        tokens_to_invest.setAttribute("disabled", "");
        gas_price.setAttribute("disabled", "");
        decryption.setAttribute("disabled", "");
        leverage.setAttribute("disabled", "");
        direction.setAttribute("disabled", "");

        switch (decryption.value) {
            case 'keystore':
                let ks = [document.getElementById('keystore_p1'), document.getElementById('keystore_file'), document.getElementById('keystore_p2'), document.getElementById('keystore_pwd')];
                ks.forEach(f => f.removeAttribute("hidden"));
                break;
            case 'private_key':
                let pk = [document.getElementById('pk_p1'), document.getElementById('pk_key')];
                pk.forEach(f => f.removeAttribute("hidden"));
                break;
            case 'mnemonic':
                let mnemonic = [document.getElementById('mnemonic_p1'),
                    document.getElementById('mnemonic_input'),
                    document.getElementById('mnemonic_p2'),
                    document.getElementById('mnemonic_index')];
                mnemonic.forEach(f => f.removeAttribute("hidden"));
                break;
        }

        place_order.onclick = () => {
            let orderToSend = {category: category.value, rawSymbol: symbol.value, direction: Number(direction.value), openClose: Number(open_close.value), price: Number(limit_price.value), leverage: Number(leverage.value), tokenToInvest: Number(tokens_to_invest.value)};
            if(orderToSend.openClose === -1)
                orderToSend.posHash = getParam('txHash');
            console.log(`orderToSend:\t${JSON.stringify(orderToSend)}`);
            msgBoard.innerHTML = "order is being submit. please wait tens of seconds before the order is filled.";
            let submit;
            let decryptInput;

            try {
                switch (decryption.value) {
                    case 'keystore':
                        if(!document.getElementById('keystore_file').value){
                            msgBoard.innerHTML = "keystore file MUST be specified";
                            return
                        }else if(!document.getElementById('keystore_pwd').value){
                            msgBoard.innerHTML = "password to the keystore file MUST be input";
                            return
                        }
                        let ks = [document.getElementById('keystore_p1'), document.getElementById('keystore_file'), document.getElementById('keystore_p2'), document.getElementById('keystore_pwd')];
                        ks.forEach(f => f.removeAttribute("hidden"));
                        submit = td.with_keystoreJsonV3(fs.readFileSync(ks[1].files[0].path).toString(), ks[3].value).with_gas_arguments(gasPrice, gasLimit);
                        decryptInput = ks[3];
                        break;
                    case 'private_key':
                        if(!document.getElementById('pk_key').value){
                            msgBoard.innerHTML = "private key MUST be input";
                            return
                        }
                        let pk = [document.getElementById('pk_p1'), document.getElementById('pk_key')];
                        pk.forEach(f => f.removeAttribute("hidden"));
                        submit = td.with_private_key(pk[1].value).with_gas_arguments(gasPrice, gasLimit);
                        decryptInput = pk[1];
                        break;
                    case 'mnemonic':
                        if(!document.getElementById('mnemonic_input').value){
                            msgBoard.innerHTML = "mnemonic file MUST be provided";
                            return
                        }else if(!document.getElementById('mnemonic_index').value){
                            msgBoard.innerHTML = "the index of the account to be used MUST be input, starting from 0";
                            return
                        }
                        let mnemonic = [document.getElementById('mnemonic_p1'),
                            document.getElementById('mnemonic_input'),
                            document.getElementById('mnemonic_p2'),
                            document.getElementById('mnemonic_index')];
                        mnemonic.forEach(f => f.removeAttribute("hidden"));
                        submit = td.with_mnemonic(mnemonic[1].value, mnemonic[3].value).with_gas_arguments(gasPrice, gasLimit);
                        decryptInput = mnemonic[1];
                        break;
                }
                scrollToBottom();
                submit
                    .order(orderToSend, err => msgBoard.innerHTML = err.toString())
                    .on('submitted', receipt => {
                        msgBoard.innerHTML = `the order has been submitted with transaction hash ${receipt.txHash} and gas paid ${receipt.gasPaid / 1e18}`;
                        scrollToBottom();
                    })
                    .on('filled', receipt => {
                        let confirmJson = JSON.parse(receipt.confirmation);
                        confirmJson.ror = ((confirmJson.ror || 0) * 100).toFixed(4) + '%';
                        confirmJson.pnl = (confirmJson.pnl || 0) / 1e6;
                        msgBoard.innerHTML = `the order has been confirmed:<br>${JSON.stringify(confirmJson, null, '<br>').replace(/\\n\\r/g, '').replace('{', '').replace('}', '').replace(/"/g, '')}`;
                        scrollToBottom()
                    })
                    .on('error', err => {
                        if((JSON.stringify(err).toLowerCase() || err.toLowerCase() || '').startsWith('replacement'))
                            msgBoard.innerHTML = `<p style="color:red">ERROR</p>Please close this window and reopen it to try again until the ongoing transaction has been submitted onto the chains and returned with a transaction hash or an error message`;
                        else
                            msgBoard.innerHTML = `<p style="color:red">ERROR</p>${JSON.stringify(err).replace(/\\n\\r/g, '<br>').replace(/\\n/g, '<br>').replace('{', '').replace('}', '').replace(/"/g, '')}`;
                        scrollToBottom();
                    });
            } catch (e) {
                msgBoard.innerHTML = e.toString().replace('\n\r', '<br>');
                scrollToBottom();
            } finally {
                td.safe_close_wallet();
                decryptInput.value = "";
                place_order.setAttribute("disabled", "");
            }
        };
        place_order.removeAttribute('hidden');
        scrollToBottom();
    }
};

let categoryUpdate = () => {
    leverage.placeholder = `leverage range: ${meta.categories[Number(category.value)].leverage[0]} ~ ${meta.categories[Number(category.value)].leverage[1]}; 1 = NO LEVERAGE`;
    let thisCate = meta.categories[Number(category.value)];
    document.getElementById('ivx_warning').setAttribute("style", "margin: 20px;color: red;visibility: hidden;");

    switch (category.value){
        case '0':
            category_tip.innerHTML = 'Pick a category and check out the tips once again';
            break;
        case '1':
            category_tip.innerHTML = `category 1<br>-description:<br>--${thisCate.description}<br>-example:<br>--${thisCate.examples}<br>-postfix:<br>--${thisCate.postfix}<br>-trading hours:<br>` + tradingHours(1);
            break;
        case '2':
            category_tip.innerHTML = `category 2<br>-description:<br>--${thisCate.description}<br>-example:<br>--${thisCate.examples}<br>-postfix:<br>--${thisCate.postfix}<br>-trading hours:<br>` + tradingHours(2);
            break;
        case '3':
            category_tip.innerHTML = `category 3<br>-description:<br>--${thisCate.description}<br>-example:<br>--${thisCate.examples}<br>-postfix:<br>--${thisCate.postfix}<br>-trading hours:<br>` + tradingHours(3);
            document.getElementById('ivx_warning').setAttribute("style", "margin: 20px;color: red;visibility: visible;");
            break;
        case '4':
            category_tip.innerHTML = `category 4<br>-description:<br>--${thisCate.description}<br>-example:<br>--${thisCate.examples}<br>-postfix:<br>--${thisCate.postfix}<br>-trading hours:<br>` + tradingHours(4);
            break;
    }
};

body.onload = onBodyLoad;
next_btn.onclick = onNextButtonClick;
symbol_quote.onclick = onQuote;
category.onchange = categoryUpdate;