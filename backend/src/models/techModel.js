const db = require('../database/connection');

const buyTechToken = (gameId, name) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT bank, research_tokens FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, nation) => {
            if (err || !nation) return reject(err || new Error('Nation not found'));
            if (nation.bank < 5) return reject(new Error('Not enough IPCs to buy a Research Token'));
            
            const newBank = nation.bank - 5;
            const newTokens = (nation.research_tokens || 0) + 1;
            
            db.serialize(() => {
                db.run('UPDATE nations SET bank = ?, research_tokens = ? WHERE game_id = ? AND name = ?', [newBank, newTokens, gameId, name]);
                db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', [gameId, `${name} purchased a Research Token for 5 IPCs (Total Tokens: ${newTokens}).`], (err2) => {
                    if (err2) reject(err2);
                    else resolve(true);
                });
            });
        });
    });
};

const refundTechToken = (gameId, name) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT bank, research_tokens, tokens_rolled FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, nation) => {
            if (err || !nation) return reject(err || new Error('Nation not found'));
            if ((nation.research_tokens || 0) <= 0) return reject(new Error('No tokens to refund'));
            
            const newBank = nation.bank + 5;
            const newTokens = nation.research_tokens - 1;
            const rolled = nation.tokens_rolled || 0;
            const newRolled = Math.min(rolled, newTokens);
            
            db.serialize(() => {
                db.run('UPDATE nations SET bank = ?, research_tokens = ?, tokens_rolled = ? WHERE game_id = ? AND name = ?', [newBank, newTokens, newRolled, gameId, name]);
                db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', [gameId, `${name} refunded a Research Token (Total Tokens: ${newTokens}).`], (err2) => {
                    if (err2) reject(err2);
                    else resolve(true);
                });
            });
        });
    });
};

const rollForTech = (gameId, name, chartId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT research_tokens, tech, tokens_rolled FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, nation) => {
            if (err || !nation) return reject(err || new Error('Nation not found'));
            const tokens = nation.research_tokens || 0;
            const rolled = nation.tokens_rolled || 0;
            const unrolledTokens = tokens - rolled;
            
            if (unrolledTokens <= 0) {
                return reject(new Error('No unrolled Research Tokens available to roll in this turn!'));
            }

            const CHART_TECHS = {
                1: [
                    'Advanced Artillery',
                    'Rockets',
                    'Paratroopers',
                    'Increased Factory Production',
                    'War Bonds',
                    'Mechanized Infantry'
                ],
                2: [
                    'Super Submarines',
                    'Jet Fighters',
                    'Improved Shipyards',
                    'Radar',
                    'Long-Range Aircraft',
                    'Heavy Bombers'
                ]
            };

            let ownedTechs = [];
            try { ownedTechs = JSON.parse(nation.tech || '[]'); } catch(e){}

            const availableTechs = CHART_TECHS[chartId].filter(t => !ownedTechs.includes(t));
            if (availableTechs.length === 0) {
                return reject(new Error(`All technologies on Chart ${chartId} have already been unlocked!`));
            }

            // Perform rolls
            const rolls = [];
            let success = false;
            for (let i = 0; i < unrolledTokens; i++) {
                const roll = Math.floor(Math.random() * 6) + 1;
                rolls.push(roll);
                if (roll === 6) {
                    success = true;
                }
            }

            db.serialize(() => {
                if (success) {
                    // Pick random unowned tech
                    const randomTech = availableTechs[Math.floor(Math.random() * availableTechs.length)];
                    ownedTechs.push(randomTech);
                    
                    db.run('UPDATE nations SET research_tokens = 0, tech = ?, tokens_rolled = 0 WHERE game_id = ? AND name = ?', [JSON.stringify(ownedTechs), gameId, name]);
                    db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                        [gameId, `🔬 ${name} achieved a Technology Breakthrough on Chart ${chartId}! Rolled: [${rolls.join(', ')}] - SUCCESS! Unlocked: ${randomTech}.`], 
                        (err2) => {
                            if (err2) reject(err2);
                            else resolve(true);
                        }
                    );
                } else {
                    db.run('UPDATE nations SET tokens_rolled = ? WHERE game_id = ? AND name = ?', [tokens, gameId, name]);
                    db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                        [gameId, `🔬 ${name} rolled for technology on Chart ${chartId}. Rolled: [${rolls.join(', ')}] - FAILURE. (Tokens retained).`], 
                        (err2) => {
                            if (err2) reject(err2);
                            else resolve(true);
                        }
                    );
                }
            });
        });
    });
};

const toggleTechnology = (gameId, name, techName, isActive) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT tech FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, nation) => {
            if (err || !nation) return reject(err || new Error('Nation not found'));
            
            let techs = [];
            try { techs = JSON.parse(nation.tech || '[]'); } catch(e){}
            
            if (isActive) {
                if (!techs.includes(techName)) {
                    techs.push(techName);
                }
            } else {
                techs = techs.filter(t => t !== techName);
            }
            
            db.run(
                'UPDATE nations SET tech = ? WHERE game_id = ? AND name = ?',
                [JSON.stringify(techs), gameId, name],
                (err2) => {
                    if (err2) return reject(err2);
                    const status = isActive ? 'DEVELOPED' : 'REMOVED';
                    db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                        [gameId, `🔬 Technology ${techName} has been ${status} for ${name}.`],
                        (err3) => {
                            if (err3) reject(err3);
                            else resolve(true);
                        }
                    );
                }
            );
        });
    });
};

module.exports = {
    buyTechToken,
    refundTechToken,
    rollForTech,
    toggleTechnology
};
