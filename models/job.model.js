const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Job = sequelize.define('Job', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Customer',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('beklemede', 'yapılacak', 'fatura bekliyor', 'tamamlandı'),
        defaultValue: 'beklemede'
    },
    paymentStatus: {
        type: DataTypes.ENUM('ödeme alınmadı', 'nakit', 'havale'),
        defaultValue: 'ödeme alınmadı',
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    hasVat: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    paymentType: {
        type: DataTypes.ENUM('nakit', 'havale', 'ödeme alınmadı'),
        defaultValue: 'ödeme alınmadı'
    },
    photos: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('photos');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('photos', JSON.stringify(value));
        }
    },
    invoiceFile: {
        type: DataTypes.STRING,
        allowNull: true
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true,
    tableName: 'Job',
    paranoid: true
});

module.exports = Job; 