const AShares = require('./marketdata/ashares');
const FXQuote = require('./marketdata/fx');
const CryptoQuote = require('./marketdata/crypto');
const IVX = require('./marketdata/ivx');

class MarketData {

    constructor(td){
        this.subsciptions = new Map();
        this.ivx = new IVX();
        this.ashares = new AShares();
        this.fx = new FXQuote();
        this.crypto= new CryptoQuote(td);
        this.providers = new Map();
    }

    withIntervals(intervals) {
        this.intervals = intervals;
        return this;
    }

    withProviders(providers) {
        this.providers = providers;
        return this;
    }

    subscribe(subs) {
        subs.forEach(sub =>
            this.subsciptions.set(sub.category,
                (this.subsciptions.get(sub.category)|| []).concat(sub.symbols).filter((v, i, a) => a.indexOf(v) === i)
            )
        );
    }

    unsubscribeAll(){
        this.subsciptions = new Map();
    }

    unsubscribe(unsub) {
        unsub.forEach(f => {
            this.subsciptions.set(f.category,
                (this.subsciptions.get(unsub.category) || []).filter(f => unsub.symbols.indexOf(f) < 0))
        });
        this.subsciptions = new Map(Array.from(this.subsciptions).filter(f => f[1].length > 0));
    }

    onMarketData(useQuote) {
        this.subsciptions.forEach((symbols, category) => {
            switch (category) {
                case 1:
                    this.intervalID1 = setInterval(async () => {
                        try{
                            let quotes = await this.ashares.withProvider(this.providers.get(category.toString())).quotes(this.subsciptions.get(1) || []);
                            useQuote({category: category, quotes: quotes});
                        }catch(err){
                            useQuote({error: err.toString()});
                            console.log(err);
                            clearInterval(this.intervalID1);
                        }
                    }, 1000 * (this.intervals || new Map().set('1', 10)).get(category.toString()));
                    break;
                case 2:
                    this.intervalID2 = setInterval(() => {
                        this.fx.withProvider(this.providers.get(category.toString())).quotes(this.subsciptions.get(2) || [])
                            .then(quotes =>
                                useQuote({category: category, quotes: quotes}))
                            .catch(err => {
                                useQuote({error: err.toString()});
                                console.log(err);
                                clearInterval(this.intervalID2);
                            });
                    }, 1000 * (this.intervals || new Map().set('2', 10)).get(category.toString()));
                    break;
                case 3:
                    this.intervalID3 = setInterval(() => {
                        (this.subsciptions.get(3) || []).forEach(async fe => {
                            try{
                                let quote = await this.ivx.withProvider(this.providers.get(category.toString())).ivx();
                                useQuote({category: category, quotes: [quote]});
                            }catch(err){
                                useQuote({error: err.toString()});
                                console.log(err);
                                clearInterval(this.intervalID3);
                            }
                        })
                    }, 1000 * (this.intervals || new Map().set('3', 30)).get(category.toString()));
                    break;
                case 4:
                    this.intervalID4 = setInterval(() => {
                        this.crypto.withProvider(this.providers.get(category.toString())).quotes(this.subsciptions.get(4) || [])
                            .then(quotes =>
                                useQuote({category: category, quotes: quotes}))
                            .catch(err => {
                                useQuote({error: err.toString()});
                                console.log(err);
                                clearInterval(this.intervalID4);
                            });
                    }, 1000 * (this.intervals || new Map().set('4', 15)).get(category.toString()));
                    break;
            }
        });
    }

    onSnapshot(useQuote) {
        this.subsciptions.forEach((symbols, category) => {
            switch (category) {
                case 1:
                    setImmediate(async () => {
                        try{
                            let quotes = this.ashares.withProvider(this.providers.get(category.toString())).quotes(this.subsciptions.get(1) || []);
                            quotes
                                .then(q => useQuote({category: category, quotes: q}))
                                .catch(err => useQuote({error: `error in retrieving quotes of category ${category}`}));
                        }catch(err){
                            useQuote({error: `error in retrieving quotes of category ${category}`});
                            console.log(err);
                        }
                    });
                    break;
                case 2:
                    setImmediate(() => {
                        this.fx.withProvider(this.providers.get(category.toString())).quotes(this.subsciptions.get(2) || [])
                            .then(quotes => {
                                if(quotes.length === 0){
                                    useQuote({error: `error in retrieving quotes of category ${category}`});
                                }else
                                    useQuote({category: category, quotes: quotes})
                            })
                            .catch(err => {
                                useQuote({error: `error in retrieving quotes of category ${category}`});
                                console.log(err);
                            });
                    });
                    break;
                case 3:
                    setImmediate(() => {
                        (this.subsciptions.get(3) || []).forEach(fe => {
                            if(fe.toUpperCase() !== 'IVX.SS'){
                                useQuote({error: `error in retrieving quotes of category ${category}`});
                                return
                            }

                            try{
                                this.ivx.withProvider(this.providers.get(category.toString())).ivx()
                                    .then(quote => {
                                        useQuote({category: category, quotes: [quote]})
                                    })
                                    .catch(err => useQuote({error: `error in retrieving quotes of category ${category}`}))
                            }catch(err){
                                useQuote({error: `error in retrieving quotes of category ${category}`});
                                console.log(err);
                            }
                        })
                    });
                    break;
                case 4:
                    setImmediate(() => {
                        this.crypto.withProvider(this.providers.get(category.toString())).quotes(this.subsciptions.get(4) || [])
                            .then(quotes => {
                                if(quotes.length === 0){
                                    useQuote({error: `error in retrieving quotes of category ${category}`});
                                }else{
                                    useQuote({category: category, quotes: quotes})
                                }
                            })
                            .catch(err => {
                                useQuote({error: `error in retrieving quotes of category ${category}`});
                                console.log(err);
                            });
                    });
                    break;
            }
        });
    }

    close(){
        clearInterval(this.intervalID1);
        clearInterval(this.intervalID2);
        clearInterval(this.intervalID3);
        clearInterval(this.intervalID4);
    }
}

module.exports = MarketData;