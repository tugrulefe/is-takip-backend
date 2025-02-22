const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Customer = require('./Customer');

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
    description: {
        type: DataTypes.TEXT,
        allowNull: true
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
    paymentType: {
        type: DataTypes.ENUM('nakit', 'havale', 'ödeme alınmadı'),
        defaultValue: 'ödeme alınmadı'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    paidAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    hasVat: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    scheduledDate: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'Job',
    paranoid: true // Soft delete için
});

module.exports = Job; 