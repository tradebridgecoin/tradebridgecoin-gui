const body = document.getElementsByTagName('BODY')[0];
const cancel_btn = document.getElementById('settings_cancel_btn');
const ok_btn = document.getElementById('settings_ok_btn');

const { remote } = require('electron');
const ipc = require('electron').ipcRenderer;

let settings = {};
let account;

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
    settings = JSON.parse(getParam('settings'));
    document.getElementById('account').innerText = account;
    console.log(`account:\t${account}`);
    console.log(`settings:\t${JSON.stringify(settings)}`);

    document.getElementById('endpoint_live').value = settings.endpoint_live;
    document.getElementById('endpoint_paper').value = settings.endpoint_paper;
    if(settings.ethereumNet === 'mainnet'){
        document.getElementById('endpoint_paper').setAttribute('hidden', '');
        document.getElementById('node_test_label').setAttribute('hidden', '');
        document.getElementById('tooltip_testnet').setAttribute('hidden', '');
        document.getElementById('tooltip_testnet').innerHTML = ''
    }else{
        document.getElementById('endpoint_live').setAttribute('hidden', '');
        document.getElementById('node_main_label').setAttribute('hidden', '');
        document.getElementById('tooltip_mainnet').setAttribute('hidden', '');
        document.getElementById('tooltip_mainnet').innerHTML = ''
    }
    document.getElementById('ethereumNet').selectedIndex = settings.ethereumNet === 'mainnet' ? 0 : 1;
    document.getElementById('startingBlockNumber').value = settings.startBlockNumber;
    document.getElementById('referrer').value = settings.referrer || '';
};

let cancel = () => {
    remote.getCurrentWindow().close();
};

let ok = () => {
    document.getElementById('settings_msg').innerHTML = '';
    let toRestart = false;
    if(settings.endpoint_live !== document.getElementById('endpoint_live').value){
        toRestart = true;
        settings.endpoint_live = document.getElementById('endpoint_live').value
    }
    if(settings.endpoint_paper !== document.getElementById('endpoint_paper').value){
        toRestart = true;
        settings.endpoint_paper = document.getElementById('endpoint_paper').value
    }
    if(document.getElementById('startingBlockNumber').value !== settings.startBlockNumber){
        toRestart = true;
        settings.startBlockNumber = document.getElementById('startingBlockNumber').value
    }
    if(settings.agent !== document.getElementById('referrer').value){
        toRestart = true;
        settings.agent = document.getElementById('referrer').value
    }
    if(settings.ethereumNet !== document.getElementById('ethereumNet').value){
        toRestart = true;
        settings.ethereumNet = document.getElementById('ethereumNet').value
    }
    settings.account = account;
    if(toRestart){
        settings.restart = true
    }
    ipc.send('settings-update', JSON.stringify(settings));
};

ipc.on('ok-to-close', (err, msg) => {
    cancel()
});
ipc.on('error-in-updating-settings', (event, msg) => {
    document.getElementById('settings_msg').innerHTML = msg;
});

body.onload = onBodyLoad;
cancel_btn.onclick = cancel;
ok_btn.onclick = ok;