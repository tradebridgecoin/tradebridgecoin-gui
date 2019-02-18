
class PromiOrderEvent{

    constructor(){
    }

    on(verb, func){
        switch (verb){
            case 'submitted':
                this.submitFunc = func;
                return this;
            case 'filled':
                this.filledFunc = func;
                return this;
            case 'error':
                this.errFunc = func;
                return this;
            case 'log':
                this.logfunc = func;
                return this;
        }
    }
}

module.exports = PromiOrderEvent;
