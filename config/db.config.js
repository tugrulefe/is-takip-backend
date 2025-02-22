const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'sqlite::memory:', {
    dialect: process.env.DATABASE_URL ? 'postgres' : 'sqlite',
    dialectOptions: process.env.DATABASE_URL ? {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    } : {},
    logging: false
});

// Veritabanı bağlantısını test et
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Veritabanı bağlantısı başarılı.');
    } catch (error) {
        console.error('Veritabanı bağlantısı başarısız:', error);
    }
};

testConnection();

module.exports = sequelize; 