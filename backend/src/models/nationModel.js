const db = require('../database/connection');
const { TURN_ORDER } = require('../config/gameConfig');

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
        db.get('SELECT current_turn FROM games WHERE id = ?', [gameId], (err, game) => {
            if (err || !game) return reject(err || new Error('Game not found'));
            
            db.get('SELECT bank, income, purchases, player_name FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, nation) => {
                if (err || !nation) return reject(err || new Error('Nation not found'));

                const currIdx = TURN_ORDER.indexOf(game.current_turn) || 0;
                const nextTurn = TURN_ORDER[(currIdx + 1) % TURN_ORDER.length];

                db.serialize(() => {
                    // 1. Update Game Turn
                    db.run('UPDATE games SET current_turn = ? WHERE id = ?', [nextTurn, gameId]);

                    // 2. Update Nation Bank & Save Purchases to last_purchases
                    db.run(
                        'UPDATE nations SET bank = bank + ?, last_purchases = purchases, purchases = ?, purchases_locked = 0 WHERE game_id = ? AND name = ?',
                        [nation.income, JSON.stringify({}), gameId, name]
                    );

                    // 3. Log
                    db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', [gameId, logMessage]);

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

                        // Force unlock all (redundant but safe)
                        db.run('UPDATE nations SET purchases_locked = 0 WHERE game_id = ?', [gameId], () => {
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
        db.get('SELECT current_turn FROM games WHERE id = ?', [gameId], (err, game) => {
            if (err) return reject(err);
            if (!game) return reject(new Error('Game not found'));
            
            const currIdx = TURN_ORDER.indexOf(game.current_turn) || 0;
            const nextTurn = TURN_ORDER[(currIdx + 1) % TURN_ORDER.length];
            
            db.run('UPDATE games SET current_turn = ? WHERE id = ?', [nextTurn, gameId], (err) => {
                if (err) return reject(err);
                
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
                    
                    // Reset purchases_locked for all nations when turn advances
                    db.run('UPDATE nations SET purchases_locked = 0 WHERE game_id = ?', [gameId], () => {
                        resolve(nextTurn);
                    });
                });
            });
        });
    });
};

const conquerTerritory = (gameId, conqueror, victim, value, targetType = 'income') => {
    return new Promise((resolve, reject) => {
        const val = parseInt(value) || 0;
        if (val <= 0) return reject(new Error("Invalid value"));
        
        if (targetType === 'bank') {
            db.run('UPDATE nations SET bank = CASE WHEN bank - ? < 0 THEN 0 ELSE bank - ? END WHERE game_id = ? AND name = ?', [val, val, gameId, victim], (err) => {
                if(err) return reject(err);
                db.run('UPDATE nations SET bank = bank + ? WHERE game_id = ? AND name = ?', [val, gameId, conqueror], (err) => {
                    if(err) return reject(err);
                    db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                        [gameId, `${conqueror} plundered ${val} IPCs from the bank of ${victim}.`], 
                        (err) => {
                            if (err) reject(err);
                            else resolve(true);
                        }
                    );
                });
            });
        } else {
            db.run('UPDATE nations SET income = CASE WHEN income - ? < 0 THEN 0 ELSE income - ? END WHERE game_id = ? AND name = ?', [val, val, gameId, victim], (err) => {
                if(err) return reject(err);
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
            });
        }
    });
};

const addFactory = (gameId, name, territoryName, capacity) => {
    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substr(2, 9);
        db.get('SELECT factories FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, row) => {
            if(err) return reject(err);
            let f = [];
            try { f = JSON.parse(row.factories || '[]'); } catch(e){}
            f.push({ id, name: territoryName, capacity: parseInt(capacity), damage: 0, repairedThisTurn: 0 });
            db.run('UPDATE nations SET factories = ? WHERE game_id = ? AND name = ?', [JSON.stringify(f), gameId, name], (e) => {
                if(e) reject(e); else resolve(true);
            });
        });
    });
};

const removeFactory = (gameId, name, factoryId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT factories FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, row) => {
            if(err) return reject(err);
            let f = [];
            try { f = JSON.parse(row.factories || '[]'); } catch(e){}
            f = f.filter(x => x.id !== factoryId);
            db.run('UPDATE nations SET factories = ? WHERE game_id = ? AND name = ?', [JSON.stringify(f), gameId, name], (e) => {
                if(e) reject(e); else resolve(true);
            });
        });
    });
};

const updateFactoryDamage = (gameId, name, factoryId, damageDelta, isUndo = false, isFree = false) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT factories, bank FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, row) => {
            if(err) return reject(err);
            let f = [];
            let bank = row.bank;
            try { f = JSON.parse(row.factories || '[]'); } catch(e){}
            
            const factory = f.find(x => x.id === factoryId);
            if(!factory) return reject(new Error('Factory not found'));
            
            const cap = factory.capacity;
            let newDamage = Math.max(0, Math.min(factory.damage + damageDelta, cap * 2));
            
            // If damageDelta < 0, it means REPAIR. It costs IPC and we track it
            if (damageDelta < 0) {
                if (!isFree) {
                    const cost = factory.damage - newDamage;
                    if (cost > 0) {
                        if (bank < cost) return reject(new Error('Not enough Bank IPC to repair'));
                        bank -= cost;
                        factory.repairedThisTurn = (factory.repairedThisTurn || 0) + cost;
                    }
                }
            } 
            else if (damageDelta > 0 && isUndo) {
                // If it's an undo, it adds damage back, but we refund if we repaired this turn
                const addedDamage = newDamage - factory.damage;
                if (addedDamage > 0) {
                    const refundAmount = Math.min(addedDamage, factory.repairedThisTurn || 0);
                    if (refundAmount < addedDamage) return reject(new Error('Cannot undo more damage than was repaired this turn'));
                    bank += refundAmount;
                    factory.repairedThisTurn -= refundAmount;
                }
            }
            
            factory.damage = newDamage;
            
            db.run('UPDATE nations SET factories = ?, bank = ? WHERE game_id = ? AND name = ?', [JSON.stringify(f), bank, gameId, name], (e) => {
                if(e) reject(e); else resolve(true);
            });
        });
    });
};

const transferFactory = (gameId, oldNation, newNation, factoryId) => {
    return new Promise((resolve, reject) => {
        if (oldNation === newNation) return resolve(true);
        db.get('SELECT factories, income FROM nations WHERE game_id = ? AND name = ?', [gameId, oldNation], (err, victimRow) => {
            if(err || !victimRow) return reject(err || new Error('Victim not found'));
            
            db.get('SELECT factories, income FROM nations WHERE game_id = ? AND name = ?', [gameId, newNation], (err, conquerorRow) => {
                if(err || !conquerorRow) return reject(err || new Error('Conqueror not found'));
                
                let victimFactories = [];
                try { victimFactories = JSON.parse(victimRow.factories || '[]'); } catch(e){}
                let conquerorFactories = [];
                try { conquerorFactories = JSON.parse(conquerorRow.factories || '[]'); } catch(e){}
                
                const factoryIndex = victimFactories.findIndex(x => x.id === factoryId);
                if (factoryIndex === -1) return reject(new Error('Factory not found on victim'));
                
                const factory = victimFactories.splice(factoryIndex, 1)[0];
                factory.repairedThisTurn = 0; // reset this
                conquerorFactories.push(factory);
                
                const val = factory.capacity;
                const victimNewIncome = Math.max(0, victimRow.income - val);
                const conquerorNewIncome = conquerorRow.income + val;
                
                db.serialize(() => {
                    db.run('UPDATE nations SET factories = ?, income = ? WHERE game_id = ? AND name = ?', 
                        [JSON.stringify(victimFactories), victimNewIncome, gameId, oldNation]);
                    db.run('UPDATE nations SET factories = ?, income = ? WHERE game_id = ? AND name = ?', 
                        [JSON.stringify(conquerorFactories), conquerorNewIncome, gameId, newNation], (err) => {
                        if (err) return reject(err);
                        db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                            [gameId, `${newNation} conquered the factory in ${factory.name} from ${oldNation} (+${val} IPC).`], 
                            (err) => {
                                if (err) reject(err);
                                else resolve(true);
                            }
                        );
                    });
                });
            });
        });
    });
};

const undoTurn = (gameId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT current_turn FROM games WHERE id = ?', [gameId], (err, game) => {
            if (err || !game) return reject(err || new Error('Game not found'));
            
            const currIdx = TURN_ORDER.indexOf(game.current_turn);
            const prevIdx = (currIdx - 1 + TURN_ORDER.length) % TURN_ORDER.length;
            const prevTurn = TURN_ORDER[prevIdx];
            
            db.run('UPDATE games SET current_turn = ? WHERE id = ?', [prevTurn, gameId], (err) => {
                if (err) return reject(err);
                
                db.get('SELECT bank, income, last_purchases FROM nations WHERE game_id = ? AND name = ?', [gameId, prevTurn], (err, row) => {
                    if (err || !row) return resolve(prevTurn);
                    const newBank = Math.max(0, row.bank - row.income);
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
                           [gameId, `The Banker has undone the turn. Reverted +${row.income} IPC and restored mobilization cart for ${prevTurn}.`], 
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
        db.run('UPDATE nations SET purchases_locked = 1 WHERE game_id = ? AND name = ?', [gameId, name], (err) => {
            if (err) return reject(err);
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
    addFactory,
    removeFactory,
    updateFactoryDamage,
    transferFactory,
    undoTurn,
    lockPurchases,
    unlockPurchases
};
