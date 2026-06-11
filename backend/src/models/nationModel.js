const db = require('../database/connection');
const { getTurnOrder } = require('../config/gameConfig');

const getNations = (gameId) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM nations WHERE game_id = ?', [gameId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const updateNationStatus = (gameId, name, income, bank, purchases, playerName) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE nations SET income = ?, bank = ?, purchases = ?, player_name = ? WHERE game_id = ? AND name = ?',
            [income, bank, JSON.stringify(purchases), playerName, gameId, name],
            (err) => {
                if (err) reject(err);
                resolve(true);
            }
        );
    });
};

const collectIncome = (gameId, name, logMessage) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT current_turn, game_version FROM games WHERE id = ?', [gameId], (err, game) => {
            if (err || !game) return reject(err || new Error('Game not found'));
            
            db.get('SELECT bank, income, purchases, player_name, capital_captured, active_objectives FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, nation) => {
                if (err || !nation) return reject(err || new Error('Nation not found'));

                const turnOrder = getTurnOrder(game.game_version);
                const currIdx = Math.max(0, turnOrder.indexOf(game.current_turn));
                const nextTurn = turnOrder[(currIdx + 1) % turnOrder.length];

                // Calculate Objectives bonus
                let bonus = 0;
                let bonusDetails = [];
                if (game.game_version.startsWith('anniversary') && !nation.capital_captured) {
                    try {
                        const objectives = JSON.parse(nation.active_objectives || '[]');
                        objectives.forEach(objId => {
                            if (objId === 'no_ussr_2') {
                                bonus += 10;
                                bonusDetails.push('Soviet Expansion (+10 IPC)');
                            } else {
                                bonus += 5;
                                const friendlyNames = {
                                    'no_germany_1': 'Lebensraum (France/NW Europe/Poland/Baltic/Bulgaria)',
                                    'no_germany_2': 'Eastern Front (Baltic/East Poland/Belorussia/Ukraine)',
                                    'no_germany_3': 'Caucasus/Karelia Control',
                                    'no_ussr_1': 'Archangelsk Security',
                                    'no_japan_1': 'Greater East Asia Co-Prosperity Sphere',
                                    'no_japan_2': 'Pacific Islands Hegemony',
                                    'no_japan_3': 'India/Australia/Hawaii Control',
                                    'no_uk_1': 'Japanese Territory Capture',
                                    'no_uk_2': 'British Empire Integrity',
                                    'no_uk_3': 'France/Balkans Liberation',
                                    'no_italy_1': 'Mediterranean Dominance',
                                    'no_italy_2': 'Roman Empire Revival',
                                    'no_usa_1': 'Pacific Security Zone',
                                    'no_usa_2': 'Western Hemisphere Security',
                                    'no_usa_3': 'Liberation of France'
                                };
                                const friendlyName = friendlyNames[objId] || objId;
                                bonusDetails.push(`${friendlyName} (+5 IPC)`);
                            }
                        });
                    } catch(e) {}
                }

                db.serialize(() => {
                    // 1. Update Game Turn & reset China reinforcements flag
                    db.run('UPDATE games SET current_turn = ?, china_reinforcements_placed = 0 WHERE id = ?', [nextTurn, gameId]);

                    // 2. Update Nation Bank & Save Purchases to last_purchases
                    const collectedIncome = nation.capital_captured ? 0 : (nation.income + bonus);
                    db.run(
                        'UPDATE nations SET bank = bank + ?, last_purchases = purchases, purchases = ?, purchases_locked = 0 WHERE game_id = ? AND name = ?',
                        [collectedIncome, JSON.stringify({}), gameId, name]
                    );

                    // 3. Log
                    let finalLogMessage = logMessage;
                    if (bonus > 0) {
                        finalLogMessage = `${logMessage} (including +${bonus} IPC from National Objectives: ${bonusDetails.join(', ')})`;
                    }
                    db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', [gameId, finalLogMessage]);

                    // 4. Global maintenance (reset factory repairs etc)
                    db.all('SELECT name, factories FROM nations WHERE game_id = ?', [gameId], (err, rows) => {
                        if (err) return resolve(nextTurn);
                        const stmt = db.prepare('UPDATE nations SET factories = ? WHERE game_id = ? AND name = ?');
                        rows.forEach(row => {
                            try {
                                const f = JSON.parse(row.factories || '[]');
                                f.forEach(fact => { fact.repairedThisTurn = 0; });
                                stmt.run([JSON.stringify(f), gameId, row.name]);
                            } catch(e) {}
                        });
                        stmt.finalize();

                        // Force unlock all and reset tokens_rolled count
                        db.run('UPDATE nations SET purchases_locked = 0, tokens_rolled = 0 WHERE game_id = ?', [gameId], () => {
                            resolve(nextTurn);
                        });
                    });
                });
            });
        });
    });
};

const advanceTurn = (gameId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT current_turn, game_version FROM games WHERE id = ?', [gameId], (err, game) => {
            if (err) return reject(err);
            if (!game) return reject(new Error('Game not found'));
            
            const turnOrder = getTurnOrder(game.game_version);
            const currIdx = Math.max(0, turnOrder.indexOf(game.current_turn));
            const nextTurn = turnOrder[(currIdx + 1) % turnOrder.length];
            
            db.serialize(() => {
                db.run('UPDATE games SET current_turn = ?, china_reinforcements_placed = 0 WHERE id = ?', [nextTurn, gameId]);
                
                // Reset repairedThisTurn for all factories when turn advances
                db.all('SELECT name, factories FROM nations WHERE game_id = ?', [gameId], (err, rows) => {
                    if (err) return resolve(nextTurn);
                    const stmt = db.prepare('UPDATE nations SET factories = ? WHERE game_id = ? AND name = ?');
                    rows.forEach(row => {
                        try {
                            const f = JSON.parse(row.factories || '[]');
                            f.forEach(fact => { fact.repairedThisTurn = 0; });
                            stmt.run([JSON.stringify(f), gameId, row.name]);
                        } catch(e) {}
                    });
                    stmt.finalize();
                    
                    // Reset purchases_locked and tokens_rolled count for all nations when turn advances
                    db.run('UPDATE nations SET purchases_locked = 0, tokens_rolled = 0 WHERE game_id = ?', [gameId], () => {
                        resolve(nextTurn);
                    });
                });
            });
        });
    });
};

const conquerTerritory = (gameId, conqueror, victim, value, targetType = 'income', liberatedFor = null) => {
    return new Promise((resolve, reject) => {
        const val = parseInt(value) || 0;
        if (val <= 0) return reject(new Error("Invalid value"));
        
        if (targetType === 'capital') {
            db.get('SELECT bank FROM nations WHERE game_id = ? AND name = ?', [gameId, victim], (err, victimRow) => {
                if (err || !victimRow) return reject(err || new Error("Victim not found"));
                const victimBank = victimRow.bank;
                
                db.serialize(() => {
                    db.run('UPDATE nations SET income = CASE WHEN income - ? < 0 THEN 0 ELSE income - ? END, bank = 0, capital_captured = 1 WHERE game_id = ? AND name = ?', [val, val, gameId, victim]);
                    db.run('UPDATE nations SET income = income + ?, bank = bank + ? WHERE game_id = ? AND name = ?', [val, victimBank, gameId, conqueror], (err) => {
                        if(err) return reject(err);
                        db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                            [gameId, `🏆 ${conqueror} conquered the CAPITAL of ${victim} worth ${val} Income, plundering ${victimBank} IPCs from their bank!`], 
                            (err) => {
                                if (err) reject(err);
                                else resolve(true);
                            }
                        );
                    });
                });
            });
        } else {
            db.run('UPDATE nations SET income = CASE WHEN income - ? < 0 THEN 0 ELSE income - ? END WHERE game_id = ? AND name = ?', [val, val, gameId, victim], (err) => {
                if(err) return reject(err);
                
                if (liberatedFor) {
                    db.run('UPDATE nations SET income = income + ? WHERE game_id = ? AND name = ?', [val, gameId, liberatedFor], (err) => {
                        if(err) return reject(err);
                        db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                            [gameId, `🕊️ ${conqueror} liberated territory from ${victim} for ${liberatedFor} (+${val} Income for ${liberatedFor}).`], 
                            (err) => {
                                if (err) reject(err);
                                else resolve(true);
                            }
                        );
                    });
                } else {
                    db.run('UPDATE nations SET income = income + ? WHERE game_id = ? AND name = ?', [val, gameId, conqueror], (err) => {
                        if(err) return reject(err);
                        db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                            [gameId, `${conqueror} conquered territory from ${victim} worth ${val} Income.`], 
                            (err) => {
                                if (err) reject(err);
                                else resolve(true);
                            }
                        );
                    });
                }
            });
        }
    });
};

const toggleCapitalStatus = (gameId, name, isCaptured) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE nations SET capital_captured = ? WHERE game_id = ? AND name = ?', [isCaptured ? 1 : 0, gameId, name], (err) => {
            if (err) return reject(err);
            const status = isCaptured ? 'CAPTURED' : 'LIBERATED';
            db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                [gameId, `The capital of ${name} has been marked as ${status}.`], 
                (err2) => {
                    if (err2) reject(err2);
                    else resolve(true);
                }
            );
        });
    });
};

const undoTurn = (gameId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT current_turn, game_version FROM games WHERE id = ?', [gameId], (err, game) => {
            if (err || !game) return reject(err || new Error('Game not found'));
            
            const turnOrder = getTurnOrder(game.game_version);
            const currIdx = Math.max(0, turnOrder.indexOf(game.current_turn));
            const prevIdx = (currIdx - 1 + turnOrder.length) % turnOrder.length;
            const prevTurn = turnOrder[prevIdx];
            
            db.run('UPDATE games SET current_turn = ?, china_reinforcements_placed = 0 WHERE id = ?', [prevTurn, gameId], (err) => {
                if (err) return reject(err);
                
                db.get('SELECT bank, income, last_purchases, active_objectives FROM nations WHERE game_id = ? AND name = ?', [gameId, prevTurn], (err, row) => {
                    if (err || !row) return resolve(prevTurn);
                    
                    let bonus = 0;
                    if (game.game_version.startsWith('anniversary')) {
                        try {
                            const objectives = JSON.parse(row.active_objectives || '[]');
                            objectives.forEach(objId => {
                                if (objId === 'no_ussr_2') {
                                    bonus += 10;
                                } else {
                                    bonus += 5;
                                }
                            });
                        } catch(e) {}
                    }

                    const totalCollected = row.income + bonus;
                    const newBank = Math.max(0, row.bank - totalCollected);
                    const restoredPurchases = row.last_purchases || JSON.stringify({});
                    
                    db.serialize(() => {
                        db.run(
                            'UPDATE nations SET bank = ?, purchases = ?, last_purchases = NULL, purchases_locked = 0 WHERE game_id = ? AND name = ?', 
                            [newBank, restoredPurchases, gameId, prevTurn]
                        );
                        
                        // Delete the most recent 'collects income' log for this nation
                        db.run(`DELETE FROM logs WHERE id IN (
                            SELECT id FROM logs 
                            WHERE game_id = ? AND message LIKE ? 
                            ORDER BY timestamp DESC LIMIT 1
                        )`, [gameId, `${prevTurn} collects income%`]);
                        
                        db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                           [gameId, `The Banker has undone the turn. Reverted +${totalCollected} IPC (Income: ${row.income}, Objectives: ${bonus}) and restored mobilization cart for ${prevTurn}.`], 
                           () => resolve(prevTurn)
                        );
                    });
                });
            });
        });
    });
};

const lockPurchases = (gameId, name, logMessage) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT purchases, factories FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(true);

            let purchases = {};
            let factories = [];
            try { purchases = JSON.parse(row.purchases || '{}'); } catch(e){}
            try { factories = JSON.parse(row.factories || '[]'); } catch(e){}

            let modifiedFactories = false;
            let finalPurchases = {};

            Object.entries(purchases).forEach(([key, qty]) => {
                if (key.startsWith('repair_')) {
                    const factoryId = key.split('_')[1];
                    const factory = factories.find(f => f.id === factoryId);
                    if (factory && qty > 0) {
                        factory.damage = Math.max(0, factory.damage - qty);
                        modifiedFactories = true;
                    }
                } else {
                    finalPurchases[key] = qty;
                }
            });

            db.serialize(() => {
                if (modifiedFactories) {
                    db.run('UPDATE nations SET purchases_locked = 1, factories = ?, purchases = ? WHERE game_id = ? AND name = ?', [JSON.stringify(factories), JSON.stringify(finalPurchases), gameId, name]);
                } else {
                    db.run('UPDATE nations SET purchases_locked = 1 WHERE game_id = ? AND name = ?', [gameId, name]);
                }

                if (logMessage) {
                    db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', [gameId, logMessage], (err2) => {
                        if (err2) reject(err2);
                        else resolve(true);
                    });
                } else {
                    resolve(true);
                }
            });
        });
    });
};

const unlockPurchases = (gameId, name) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE nations SET purchases_locked = 0 WHERE game_id = ? AND name = ?', [gameId, name], (err) => {
            if (err) return reject(err);
            
            // Delete the most recent 'conferma acquisti' log for this nation
            db.run(`DELETE FROM logs WHERE id IN (
                SELECT id FROM logs 
                WHERE game_id = ? AND message LIKE ? 
                ORDER BY timestamp DESC LIMIT 1
            )`, [gameId, `${name} confirms purchases:%`], (err2) => {
                if (err2) reject(err2);
                else resolve(true);
            });
        });
    });
};

module.exports = {
    getNations,
    updateNationStatus,
    collectIncome,
    advanceTurn,
    conquerTerritory,
    undoTurn,
    lockPurchases,
    unlockPurchases,
    toggleCapitalStatus
};
