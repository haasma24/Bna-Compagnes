/*const mysql = require('mysql2/promise');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'comapgneassurances'
});
db.connect((err) => {
    console.log(err ? err : 'Connected');
});*/
/*console.log('Connexion à la base de données (avec promesses) prête.');

module.exports = db;*/






// Fichier : db.js
const mysql = require('mysql2/promise'); // On garde cette version, c'est la bonne

// On utilise createPool au lieu de createConnection. C'est la meilleure pratique pour les applications web.
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'ha+56645533',
    database: 'comapgneassurances',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('Pool de connexions MySQL (avec promesses) est prêt.');

module.exports = pool; 
