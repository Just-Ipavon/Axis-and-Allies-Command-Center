const db = require('../database/connection');

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
    toggleNationalObjective
};
