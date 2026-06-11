const db = require('../database/connection');

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
        db.get('SELECT factories, bank, tech FROM nations WHERE game_id = ? AND name = ?', [gameId, name], (err, row) => {
            if(err) return reject(err);
            let f = [];
            let bank = row.bank;
            let tech = [];
            try { f = JSON.parse(row.factories || '[]'); } catch(e){}
            try { tech = JSON.parse(row.tech || '[]'); } catch(e){}
            
            const factory = f.find(x => x.id === factoryId);
            if(!factory) return reject(new Error('Factory not found'));
            
            const cap = factory.capacity;
            let newDamage = Math.max(0, Math.min(factory.damage + damageDelta, cap * 2));
            const hasIncreasedProd = tech.includes('Increased Factory Production');
            
            // If damageDelta < 0, it means REPAIR. It costs IPC and we track it
            if (damageDelta < 0) {
                if (!isFree) {
                    const pointsToRepair = factory.damage - newDamage;
                    if (pointsToRepair > 0) {
                        const oldRepaired = factory.repairedThisTurn || 0;
                        const newRepaired = oldRepaired + pointsToRepair;
                        
                        let cost = pointsToRepair;
                        if (hasIncreasedProd) {
                            cost = Math.ceil(newRepaired / 2) - Math.ceil(oldRepaired / 2);
                        }
                        
                        if (bank < cost) return reject(new Error('Not enough Bank IPC to repair'));
                        bank -= cost;
                        factory.repairedThisTurn = newRepaired;
                    }
                }
            } 
            else if (damageDelta > 0 && isUndo) {
                // If it's an undo, it adds damage back, but we refund if we repaired this turn
                const addedDamage = newDamage - factory.damage;
                if (addedDamage > 0) {
                    const pointsToRefund = Math.min(addedDamage, factory.repairedThisTurn || 0);
                    if (pointsToRefund < addedDamage) return reject(new Error('Cannot undo more damage than was repaired this turn'));
                    
                    const oldRepaired = factory.repairedThisTurn || 0;
                    const newRepaired = oldRepaired - pointsToRefund;
                    
                    let refundAmount = pointsToRefund;
                    if (hasIncreasedProd) {
                        refundAmount = Math.ceil(oldRepaired / 2) - Math.ceil(newRepaired / 2);
                    }
                    
                    bank += refundAmount;
                    factory.repairedThisTurn = newRepaired;
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
                            (err2) => {
                                if (err2) reject(err2);
                                else resolve(true);
                            }
                        );
                    });
                });
            });
        });
    });
};

module.exports = {
    addFactory,
    removeFactory,
    updateFactoryDamage,
    transferFactory
};
