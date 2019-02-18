const m = process.env.TBCTMP === 'LIVE' ? require('./metadata_live') : require('./metadata_paper');

module.exports = Object.freeze({
    metadata: m.metadata
});