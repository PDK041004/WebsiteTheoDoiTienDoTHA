const mysql = require('mysql2');

const database = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Quanghuy2004', 
    database: 'thihanhan'
});

database.connect(err => {
    if (err) {
        console.log('❌ Lỗi kết nối:', err);
    } else {
        console.log('✅ Kết nối MySQL thành công');
    }
});

module.exports = database;