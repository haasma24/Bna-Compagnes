const mysql = require('mysql2/promise'); 

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
