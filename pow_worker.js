const sha1 = require('./sha1.js');

const solve = (prefix, difficulty) => {
    var m = diff[(difficulty & 3)];
    for(let i = 0; ; i++) {
        var str = `${prefix}${i}${prefix}`;
        if (solvesDifficulty(sha1(str), difficulty, m)) return `${prefix}:${i}`;
    }
};

const solvesDifficulty = (hash, difficulty, mask2) => {
    if (hash[0]) return false; 
    if (difficulty == 20 && hash[1]) return false;
    else if ((hash[1] & mask2) !== mask2) return false; 

    return true;
};

var diff = {
    3: 7,
    2: 3,
    1: 1,
    0: 0
};

module.exports = solve;