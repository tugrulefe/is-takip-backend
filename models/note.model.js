const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Note = sequelize.define('Note', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    color: {
        type: DataTypes.STRING,
        defaultValue: '#fff9c4' // Varsayılan sarı renk
    },
    position: {
        type: DataTypes.JSON,
        defaultValue: { x: 0, y: 0 }
    },
    isReminder: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    reminderDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isCompleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isPinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    showInJobList: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: true,
    tableName: 'Note',
    paranoid: true
});

module.exports = Note; 