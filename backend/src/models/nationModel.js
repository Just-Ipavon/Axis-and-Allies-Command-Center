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
                    
                    // Reset purchases_locked for all nations when turn advances
                    db.run('UPDATE nations SET purchases_locked = 0 WHERE game_id = ?', [gameId], () => {
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

// R&D Logic
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
        db.get('SELECT bank, research_tokens FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, nation) => {
            if (err || !nation) return reject(err || new Error('Nation not found'));
            if ((nation.research_tokens || 0) <= 0) return reject(new Error('No tokens to refund'));
            
            const newBank = nation.bank + 5;
            const newTokens = nation.research_tokens - 1;
            
            db.serialize(() => {
                db.run('UPDATE nations SET bank = ?, research_tokens = ? WHERE game_id = ? AND name = ?', [newBank, newTokens, gameId, name]);
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
        db.get('SELECT research_tokens, tech FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, nation) => {
            if (err || !nation) return reject(err || new Error('Nation not found'));
            const tokens = nation.research_tokens || 0;
            if (tokens <= 0) return reject(new Error('No Research Tokens available to roll'));

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
            for (let i = 0; i < tokens; i++) {
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
                    
                    db.run('UPDATE nations SET research_tokens = 0, tech = ? WHERE game_id = ? AND name = ?', [JSON.stringify(ownedTechs), gameId, name]);
                    db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                        [gameId, `🔬 ${name} achieved a Technology Breakthrough on Chart ${chartId}! Rolled: [${rolls.join(', ')}] - SUCCESS! Unlocked: ${randomTech}.`], 
                        (err2) => {
                            if (err2) reject(err2);
                            else resolve(true);
                        }
                    );
                } else {
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

const toggleNationalObjective = (gameId, name, objectiveId, isActive) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT active_objectives FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, nation) => {
            if (err || !nation) return reject(err || new Error('Nation not found'));
            
            let objectives = [];
            try { objectives = JSON.parse(nation.active_objectives || '[]'); } catch(e){}
            
            if (isActive) {
                if (!objectives.includes(objectiveId)) {
                    objectives.push(objectiveId);
                }
            } else {
                objectives = objectives.filter(o => o !== objectiveId);
            }
            
            db.run(
                'UPDATE nations SET active_objectives = ? WHERE game_id = ? AND name = ?',
                [JSON.stringify(objectives), gameId, name],
                (err2) => {
                    if (err2) reject(err2);
                    else resolve(true);
                }
            );
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
    unlockPurchases,
    toggleCapitalStatus,
    buyTechToken,
    refundTechToken,
    rollForTech,
    toggleNationalObjective
};
