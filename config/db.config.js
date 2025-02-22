const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
    // Production environment (Render)
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false
    });
} else {
    // Development environment (Local)
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false
    });
}

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