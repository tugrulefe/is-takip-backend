const { Sequelize } = require('sequelize');
const { User } = require('./models/user.model.js');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite'
});

async function createAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Veritabanı bağlantısı başarılı.');

        const admin = await User.create({
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            isActive: true
        });
        console.log('Admin kullanıcısı başarıyla oluşturuldu:', admin.toJSON());
    } catch (error) {
        console.error('Hata:', error);
    } finally {
        await sequelize.close();
    }
}

createAdmin();