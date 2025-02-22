const Customer = require('../models/Customer');
const Job = require('../models/Job');
const express = require('express');
const router = express.Router();

// Yeni müşteri oluştur
router.post('/', async (req, res) => {
    try {
        console.log('Müşteri oluşturma isteği:', req.body);
        
        if (!req.body.name) {
            return res.status(400).json({ 
                message: 'Müşteri adı zorunludur' 
            });
        }

        const customer = await Customer.create({
            name: req.body.name,
            authorizedPerson: req.body.authorizedPerson || null,
            phone: req.body.phone || null,
            invoiceAddress: req.body.invoiceAddress || null,
            taxNumber: req.body.taxNumber || null,
            taxOffice: req.body.taxOffice || null,
            address: req.body.address || null,
            email: req.body.email || null
        });

        console.log('Müşteri başarıyla oluşturuldu:', customer.toJSON());
        
        const customerWithJobs = await Customer.findByPk(customer.id, {
            include: [{
                model: Job,
                as: 'jobs'
            }]
        });

        res.status(201).json(customerWithJobs);
    } catch (error) {
        console.error('Müşteri oluşturulurken hata:', error);
        res.status(500).json({ 
            message: 'Müşteri oluşturulurken bir hata oluştu',
            error: error.message 
        });
    }
});

// Tüm müşterileri getir
router.get('/', async (req, res) => {
    try {
        const customers = await Customer.findAll({
            include: [{
                model: Job,
                as: 'jobs'
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json(customers);
    } catch (error) {
        console.error('Müşteriler listelenirken hata:', error);
        res.status(500).json({ 
            message: 'Müşteriler listelenirken bir hata oluştu',
            error: error.message 
        });
    }
});

// Belirli bir müşteriyi getir
router.get('/:id', async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id, {
            include: [{
                model: Job,
                as: 'jobs'
            }]
        });
        if (customer) {
            res.json(customer);
        } else {
            res.status(404).json({ message: 'Müşteri bulunamadı' });
        }
    } catch (error) {
        console.error('Müşteri getirilirken hata:', error);
        res.status(500).json({ 
            message: 'Müşteri getirilirken bir hata oluştu',
            error: error.message 
        });
    }
});

// Müşteri bilgilerini güncelle
router.put('/:id', async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (customer) {
            await customer.update({
                name: req.body.name,
                authorizedPerson: req.body.authorizedPerson || null,
                phone: req.body.phone || null,
                invoiceAddress: req.body.invoiceAddress || null,
                taxNumber: req.body.taxNumber || null,
                taxOffice: req.body.taxOffice || null,
                address: req.body.address || null,
                email: req.body.email || null
            });

            const updatedCustomer = await Customer.findByPk(customer.id, {
                include: [{
                    model: Job,
                    as: 'jobs'
                }]
            });

            res.json(updatedCustomer);
        } else {
            res.status(404).json({ message: 'Müşteri bulunamadı' });
        }
    } catch (error) {
        console.error('Müşteri güncellenirken hata:', error);
        res.status(500).json({ 
            message: 'Müşteri güncellenirken bir hata oluştu',
            error: error.message 
        });
    }
});

// Müşteriyi sil
router.delete('/:id', async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (customer) {
            await customer.destroy();
            res.json({ message: 'Müşteri silindi' });
        } else {
            res.status(404).json({ message: 'Müşteri bulunamadı' });
        }
    } catch (error) {
        console.error('Müşteri silinirken hata:', error);
        res.status(500).json({ 
            message: 'Müşteri silinirken bir hata oluştu',
            error: error.message 
        });
    }
});

module.exports = router; 