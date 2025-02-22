const Customer = require('./Customer');
const Job = require('./Job');
const Note = require('./note.model');

// İlişkileri tanımla
Job.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer',
    onDelete: 'CASCADE'
});

Customer.hasMany(Job, {
    foreignKey: 'customerId',
    as: 'jobs',
    onDelete: 'CASCADE'
});

module.exports = {
    Customer,
    Job,
    Note
}; 