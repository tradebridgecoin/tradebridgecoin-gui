

class TxWrapper {
    constructor(initArgs, _web3, accIdx){
        this.accIdx = accIdx;
        this.web3 = _web3;
        this.args = initArgs;
        this.from = _web3.eth.accounts.wallet[accIdx === undefined ? 0 : accIdx].address;
        this.key = _web3.eth.accounts.wallet[accIdx === undefined ? 0 : accIdx].privateKey;
    }

    wrap(tx, web3){
        let newTW = new TxWrapper(this.args, web3 || this.web3, this.accIdx);
        newTW.encodedABI = tx.encodeABI();
        return newTW;
    }

    clone(web3){
        return new TxWrapper(this.args, web3 || this.web3, this.accIdx);
    }

    sendPayable(txArgs){
        if(txArgs.from === undefined || txArgs.to === undefined || txArgs.value === undefined){
            this.onError('Please set from, to and value fields correctly');
            return this;
        }

        let  rawTx = {
            nonce: this.args.nonce,
            gasPrice: txArgs.gasPrice === undefined ? this.args.gasPrice : txArgs.gasPrice,
            gas: txArgs.gasLimit === undefined ? (txArgs.gas === undefined ? this.args.gasLimit :  txArgs.gas) : txArgs.gasLimit,
            from: txArgs.from,
            to: txArgs.to,
            value: txArgs.value
        };
        if(txArgs.data !== undefined)
            rawTx.data = txArgs.data;

        this.args.nonce += 1;
        this.web3.eth.accounts.signTransaction(rawTx, this.key)
            .then(signedTx =>
                this.web3.eth.sendSignedTransaction(signedTx.rawTransaction)
                    .on('receipt', receipt => {
                        if(this.onReceipt !== undefined)
                            this.onReceipt(receipt)
                    })
                    .on('error', err => {
                        let reject = Promise.reject(err);
                        reject.catch(e =>{});
                        if(this.onError !== undefined)
                            this.onError(err)
                    })
                    .on('confirmation', (confNumber, receipt) => {
                        if(this.onConfirmation !== undefined)
                            this.onConfirmation(confNumber, receipt);
                        if(confNumber >= 24){
                            console.log('dereference signed tx object');
                            delete this;
                        }else{
                            // console.log(`wrapper confirmation: ${confNumber}`)
                        }
                    })
                    .on('transactionHash', transactionHash =>
                        this.onTransactionHash === undefined ? '' : this.onTransactionHash(transactionHash)
                    )
                    .catch(err => console.log)
            );
        return this;
    }

    send(txArgs){
        let  rawTx = {
            nonce: this.args.nonce,
            gasPrice: txArgs.gasPrice === undefined ? this.args.gasPrice : txArgs.gasPrice,
            gas: txArgs.gasLimit === undefined ? (txArgs.gas === undefined ? this.args.gasLimit :  txArgs.gas) : txArgs.gasLimit,
            from: txArgs.from === undefined ? this.from : txArgs.from,
            to: this.args.tbcAddress,
            value: '0x00',
            data: this.encodedABI
        };
        this.args.nonce += 1;
        this.web3.eth.accounts.signTransaction(rawTx, this.key)
            .then(signedTx =>
                this.web3.eth.sendSignedTransaction(signedTx.rawTransaction)
                    .on('receipt', receipt => {
                        if(this.onReceipt !== undefined)
                            this.onReceipt(receipt)
                    })
                    .on('error', err => {
                        let reject = Promise.reject(err);
                        reject.catch(e =>{});
                        if(this.onError !== undefined)
                            this.onError(err)
                    })
                    .on('confirmation', (confNumber, receipt) => {
                        if(this.onConfirmation !== undefined)
                            this.onConfirmation(confNumber, receipt);
                        if(confNumber >= 24){
                            console.log('dereference signed tx object');
                            delete this;
                        }else{
                            // console.log(`wrapper confirmation: ${confNumber}`)
                        }
                    })
                    .on('transactionHash', transactionHash =>
                        this.onTransactionHash === undefined ? '' : this.onTransactionHash(transactionHash))
                    .catch(err => {})
            );
        return this;
    }

    on(verb, f){
        switch(verb) {
            case 'receipt':
                this.onReceipt = f;
                return this;
            case 'error':
                this.onError = f;
                return this;
            case 'confirmation':
                this.onConfirmation = f;
                return this;
            case 'transactionHash':
                this.onTransactionHash = f;
                return this;
        }
    }
}

module.exports = TxWrapper;