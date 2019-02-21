const body = document.getElementsByTagName('BODY')[0];
const tokens_transfer = document.getElementById('tokens_transfer');
const gas_price = document.getElementById('gas_price');
const decryption = document.getElementById('decryption');
const transfer_token = document.getElementById('transfer_token');
const next_btn = document.getElementById('next_btn');
const err_msg = document.getElementById('err_msg');
const beneficiary_balance = document.getElementById('beneficiary_balance');
const beneficiary = document.getElementById('beneficiary');

const fs = require('fs');
const { remote, BrowserWindow } = require('electron');

process.env.TBCTMP = getParam('net') === 'mainnet' ? 'LIVE' : 'PAPER';

const TD = require('../../api/trade-on-chain');

let endpoint, account, td, token_balance, queriedGasPrice;
const transferGasLimit = 100000;

function getParam(name){
    if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(remote.getCurrentWebContents().getURL()))
        return decodeURIComponent(name[1]);
}
let scrollToBottom = () => {
    const documentHeight = document.documentElement.offsetHeight;
    const viewportHeight = window.innerHeight;
    window.scrollTo(0,documentHeight);
};

let onBodyLoad = () => {
    // remote.getCurrentWebContents().openDevTools();
    account = getParam('account');
    endpoint = getParam('endpoint');
    document.getElementById('account').innerText = getParam('account');
    console.log(`account:\t${account}`);
    TD.newInstance({endpoint, account, agent: ''}).then(async trade => {
        td = trade;
        queriedGasPrice = await td.query_gas_price(true);
        gas_price.placeholder = `gas price: default to ${queriedGasPrice}`;
        token_balance = await td.token_balance();
        tokens_transfer.placeholder = `tokens to transfer. balance: ${token_balance}`;
    });
};

let onNextButtonClick = async () => {
    beneficiary_balance.innerHTML = 'loading...';
    next_btn.setAttribute("disabled", "");
    err_msg.innerHTML = '';
    let gasPrice = Number(gas_price.value || queriedGasPrice);
    let targetBalance;
    try{
        let targetAcc = await TD.newInstance({endpoint, account: beneficiary.value, agent: ''});
        targetBalance = await targetAcc.token_balance();
        beneficiary_balance.innerHTML = targetBalance
    }catch (e) {
        err_msg.innerHTML = 'invalid account!';
        return
    }finally {
        next_btn.removeAttribute("disabled")
    }
    let sourceBalance = await td.token_balance();

    if(sourceBalance < Number(tokens_transfer.value)){
        err_msg.innerHTML = 'tokens to transfer CANNOT be greater than the balance';
    }else if(!targetBalance && targetBalance !== 0){
        err_msg.innerHTML = 'invalid account!';
    }else if(isNaN(Number(tokens_transfer.value)) || Number(tokens_transfer.value) <= 0){
        err_msg.innerHTML = 'invalid token amount!'
    }else if(Number(tokens_transfer.value) > token_balance){
        err_msg.innerHTML = 'insufficient balance for the transfer!'
    }else if(decryption.value === 'mnemonic'){
        let msgBoard = document.getElementById('tx_msg');
        next_btn.setAttribute("disabled", "");
        tokens_transfer.setAttribute("disabled", "");
        gas_price.setAttribute("disabled", "");
        let mnemonic = [document.getElementById('mnemonic_p1'),
            document.getElementById('mnemonic_input'),
            document.getElementById('mnemonic_p2'),
            document.getElementById('mnemonic_index')];
        mnemonic.forEach(f => f.removeAttribute("hidden"));
        transfer_token.onclick = () => {
            msgBoard.innerHTML = "transfer request has been submit. please wait several minutes before the transfer is confirmed.";
            transfer_token.setAttribute("disabled", "");
            try {
                td.with_mnemonic(mnemonic[1].value, mnemonic[3].value).with_gas_arguments(gasPrice, transferGasLimit)
                    .transfer_token(beneficiary.value, Number(tokens_transfer.value))
                    .on('submitted', receipt => msgBoard.innerHTML = `the transfer has been submitted with transaction hash ${receipt.txHash}`)
                    .on('filled', receipt => msgBoard.innerHTML = `the transfer has been confirmed: ${receipt.txHash} and gas paid ${receipt.gasPaid / 1e18}`)
                    .on('error', err => msgBoard.innerHTML = `${err.toString().indexOf('wrap') > -1 ? 'ERROR, maybe the wrong mnemonic.<b></b>' : ''}${err.toString()}`)
            } catch (err) {
                msgBoard.innerHTML = `${err.toString().indexOf('wrap') > -1 ? 'ERROR, maybe the wrong mnemonic.<b></b>' : ''}${err.toString()}`
                transfer_token.removeAttribute("disabled")
            } finally {
                td.safe_close_wallet();
                mnemonic[1].value = "";
            }
        };
        transfer_token.removeAttribute("hidden");
    }else if(decryption.value === 'private_key'){
        let msgBoard = document.getElementById('tx_msg');
        next_btn.setAttribute("disabled", "");
        tokens_transfer.setAttribute("disabled", "");
        gas_price.setAttribute("disabled", "");
        let pk = [document.getElementById('pk_p1'), document.getElementById('pk_key')];
        pk.forEach(f => f.removeAttribute("hidden"));
        transfer_token.onclick = () => {
            msgBoard.innerHTML = "transfer request has been submit. please wait several minutes before the transfer is confirmed.";
            transfer_token.setAttribute("disabled", "");
            try{
                td.with_private_key(pk[1].value).with_gas_arguments(gasPrice, transferGasLimit)
                    .transfer_token(beneficiary.value, Number(tokens_transfer.value))
                    .on('submitted', receipt => msgBoard.innerHTML = `the transfer has been submitted with transaction hash ${receipt.txHash}`)
                    .on('filled', receipt => msgBoard.innerHTML = `the transfer has been confirmed: ${receipt.txHash} and gas paid ${receipt.gasPaid / 1e18}`)
                    .on('error', err => msgBoard.innerHTML = `${err.toString().indexOf('fromRed') > -1 ? 'ERROR, maybe the wrong private key.<b></b>' : ''}${err.toString()}`)
            }catch (err){
                msgBoard.innerHTML = `${err.toString().indexOf('fromRed') > -1 ? 'ERROR, maybe the wrong private key.<b></b>' : ''}${err.toString()}`
                transfer_token.removeAttribute("disabled");
                scrollToBottom();
            }finally {
                pk[1].value = "";
                td.safe_close_wallet();
            }
        };
        transfer_token.removeAttribute("hidden");
    }else if(decryption.value === 'keystore'){
        let msgBoard = document.getElementById('tx_msg');
        next_btn.setAttribute("disabled", "");
        tokens_transfer.setAttribute("disabled", "");
        gas_price.setAttribute("disabled", "");
        let ks = [document.getElementById('keystore_p1'), document.getElementById('keystore_file'), document.getElementById('keystore_p2'), document.getElementById('keystore_pwd')];
        ks.forEach(f => f.removeAttribute("hidden"));
        transfer_token.onclick = () => {
            console.log(ks[1].files[0].path);
            msgBoard.innerHTML = "transfer request has been submit. please wait tens of seconds before the transfer is confirmed.";
            transfer_token.setAttribute("disabled", "");
            try {
                td.with_keystoreJsonV3(fs.readFileSync(ks[1].files[0].path).toString(), ks[3].value).with_gas_arguments(gasPrice, transferGasLimit)
                    .transfer_token(beneficiary.value, Number(tokens_transfer.value))
                    .on('submitted', receipt => msgBoard.innerHTML = `the transfer has been submitted with transaction hash ${receipt.txHash}`)
                    .on('filled', receipt => msgBoard.innerHTML = `the transfer has been confirmed: ${receipt.txHash} and gas paid ${receipt.gasPaid / 1e18}`)
                    .on('error', err => msgBoard.innerHTML = err.toString());
            } catch (err) {
                msgBoard.innerHTML = err.toString();
                transfer_token.removeAttribute("disabled")
            } finally {
                ks[3].value = "";
                td.safe_close_wallet();
            }
        };
        transfer_token.removeAttribute("hidden");
    }
};

body.onload = onBodyLoad;
next_btn.onclick = onNextButtonClick;