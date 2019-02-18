const body = document.getElementsByTagName('BODY')[0];
const tokens_withdraw = document.getElementById('ethers_withdraw');
const gas_price = document.getElementById('gas_price');
const decryption = document.getElementById('decryption');
const withdraw_ether = document.getElementById('withdraw_ether');
const next_btn = document.getElementById('next_btn');
const err_msg = document.getElementById('err_msg');
const token_price = document.getElementById('token_price');

const fs = require('fs');
const { remote, BrowserWindow } = require('electron');
const TD = require('../../api/trade-on-chain');

let account, td, token_balance, queriedGasPrice;
const withdrawGasLimit = 100000;

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
    const endpoint = getParam('endpoint');
    document.getElementById('account').innerText = getParam('account');
    console.log(`account:\t${account}`);
    TD.newInstance({endpoint, account, agent: ''}).then(async trade => {
        td = trade;
        queriedGasPrice = await td.query_gas_price(true);
        gas_price.placeholder = `gas price: default to ${queriedGasPrice}`;
        token_balance = await td.token_balance();
        tokens_withdraw.placeholder = `tokens to withdraw. balance: ${token_balance}`;
        token_price.innerHTML = `${Number(await (td.query_token_price(-1, 1)) / 1e6).toFixed(6)} token/ether`;
    });
};

let onNextButtonClick = async () => {
    let gasPrice = Number(gas_price.value || queriedGasPrice);
    if(isNaN(Number(tokens_withdraw.value)) || Number(tokens_withdraw.value) <= 0 || Number(tokens_withdraw.value) > token_balance){
        err_msg.innerHTML = `invalid ether amount / insufficient balance ! valid range 0 ~ ${token_balance}`
    }else if(Number(tokens_withdraw.value) * 1e6 < 1){
        err_msg.innerHTML = 'minimum amount of token to withdraw is 0.000001'
    }else if(decryption.value === 'mnemonic'){
        document.getElementById('bulk_price').innerHTML = `given the amount of ethers to withdraw, the token price is loading...`;
        td.query_token_price(-1, Number(tokens_withdraw.value))
            .then(price => {
                document.getElementById('bulk_price').innerHTML = `given the amount of ethers to withdraw, the token price is ${(price / 1e6).toFixed(6)} token/ether`;
                let msgBoard = document.getElementById('tx_msg');
                next_btn.setAttribute("disabled", "");
                tokens_withdraw.setAttribute("disabled", "");
                gas_price.setAttribute("disabled", "");
                let mnemonic = [document.getElementById('mnemonic_p1'),
                    document.getElementById('mnemonic_input'),
                    document.getElementById('mnemonic_p2'),
                    document.getElementById('mnemonic_index')];
                mnemonic.forEach(f => f.removeAttribute("hidden"));
                withdraw_ether.onclick = () => {
                    msgBoard.innerHTML = "withdraw request is been submit. please wait several minutes before the withdraw is confirmed.";
                    try{
                        td.with_mnemonic(mnemonic[1].value, mnemonic[3].value).with_gas_arguments(gasPrice, withdrawGasLimit).withdraw(Number(tokens_withdraw.value))
                            .on('submitted', receipt => msgBoard.innerHTML = `the withdraw has been submitted with transaction hash ${receipt.txHash} and gas paid ${receipt.gasPaid / 1e18} ethers`)
                            .on('filled', receipt => msgBoard.innerHTML = `the withdraw has been confirmed: ${receipt.ethers} ethers withdrawn`)
                            .on('error', err => msgBoard.innerHTML = JSON.stringify(err));
                        td.safe_close_wallet();
                        withdraw_ether.setAttribute("disabled", "");
                    } catch (e) {
                        msgBoard.innerHTML = e.toString();
                        withdraw_ether.removeAttribute("disabled");
                        scrollToBottom();
                    } finally {
                        td.safe_close_wallet();
                        mnemonic[1].value = "";
                    }
                };
                withdraw_ether.removeAttribute("hidden");
            })
            .catch(err => {
                document.getElementById('bulk_price').innerHTML = err
            })
    }else if(decryption.value === 'private_key'){
        document.getElementById('bulk_price').innerHTML = `given the amount of ethers to withdraw, the token price is loading...`;
        td.query_token_price(-1, Number(tokens_withdraw.value))
            .then(price => {
                document.getElementById('bulk_price').innerHTML = `given the amount of ethers to withdraw, the token price is ${(price / 1e6).toFixed(6)} token/ether`;
                let msgBoard = document.getElementById('tx_msg');
                next_btn.setAttribute("disabled", "");
                tokens_withdraw.setAttribute("disabled", "");
                gas_price.setAttribute("disabled", "");
                let pk = [document.getElementById('pk_p1'), document.getElementById('pk_key')];
                pk.forEach(f => f.removeAttribute("hidden"));
                withdraw_ether.onclick = () => {
                    msgBoard.innerHTML = "withdraw request is been submit. please wait several minutes before the withdraw is confirmed.";
                    try{
                        td.with_private_key(pk[1].value).with_gas_arguments(gasPrice, withdrawGasLimit).withdraw(Number(tokens_withdraw.value))
                            .on('submitted', receipt => msgBoard.innerHTML = `the withdraw has been submitted with transaction hash ${receipt.txHash} and gas paid ${receipt.gasPaid / 1e18} ethers`)
                            .on('filled', receipt => msgBoard.innerHTML = `the withdraw has been confirmed: ${receipt.ethers} ethers withdrawn`)
                            .on('error', err => msgBoard.innerHTML = JSON.stringify(err));
                        withdraw_ether.setAttribute("disabled", "");
                    } catch (e) {
                        msgBoard.innerHTML = e.toString();
                        withdraw_ether.removeAttribute("disabled");
                        scrollToBottom();
                    } finally {
                        td.safe_close_wallet();
                        pk[1].value = "";
                    }
                };
                withdraw_ether.removeAttribute("hidden");
            })
            .catch(err => {
                document.getElementById('bulk_price').innerHTML = err
            })
    }else if(decryption.value === 'keystore'){
        document.getElementById('bulk_price').innerHTML = `given the amount of ethers to withdraw, the token price is loading...`;
        td.query_token_price(-1, Number(tokens_withdraw.value))
            .then(price => {
                document.getElementById('bulk_price').innerHTML = `given the amount of ethers to withdraw, the token price is ${(price / 1e6).toFixed(6)} token/ether`;
                let msgBoard = document.getElementById('tx_msg');
                next_btn.setAttribute("disabled", "");
                tokens_withdraw.setAttribute("disabled", "");
                gas_price.setAttribute("disabled", "");
                let ks = [document.getElementById('keystore_p1'), document.getElementById('keystore_file'), document.getElementById('keystore_p2'), document.getElementById('keystore_pwd')];
                ks.forEach(f => f.removeAttribute("hidden"));
                withdraw_ether.onclick = () => {
                    console.log(ks[1].files[0].path);
                    msgBoard.innerHTML = "withdraw request is been submit. please wait several minutes before the withdraw is confirmed.";
                    try{
                        td.with_keystoreJsonV3(fs.readFileSync(ks[1].files[0].path).toString(), ks[3].value).with_gas_arguments(gasPrice, withdrawGasLimit).withdraw(Number(tokens_withdraw.value))
                            .on('submitted', receipt => msgBoard.innerHTML = `the withdraw has been submitted with transaction hash ${receipt.txHash} and gas paid ${receipt.gasPaid / 1e18} ethers`)
                            .on('filled', receipt => msgBoard.innerHTML = `the withdraw has been confirmed: ${receipt.ethers} ethers withdrawn`)
                            .on('error', err => msgBoard.innerHTML = JSON.stringify(err));
                        withdraw_ether.setAttribute("disabled", "");
                    } catch (e) {
                        msgBoard.innerHTML = e.toString();
                        withdraw_ether.removeAttribute("disabled");
                        scrollToBottom();
                    } finally {
                        td.safe_close_wallet();
                        ks[3].value = "";
                    }
                };
                withdraw_ether.removeAttribute("hidden");
            })
            .catch(err => {
                document.getElementById('bulk_price').innerHTML = err
            })
    }
};

body.onload = onBodyLoad;
next_btn.onclick = onNextButtonClick;