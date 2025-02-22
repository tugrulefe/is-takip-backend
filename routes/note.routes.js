const Note = require('../models/note.model');
const { Op } = require('sequelize');
const express = require('express');
const router = express.Router();

// Tüm notları getir
router.get('/', async (req, res) => {
    try {
        const notes = await Note.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Ana ekrandaki notları getir (hatırlatma olmayan veya zamanı gelmiş hatırlatmalar)
router.get('/dashboard', async (req, res) => {
    try {
        const notes = await Note.findAll({
            where: {
                [Op.or]: [
                    { isReminder: false },
                    {
                        isReminder: true,
                        reminderDate: {
                            [Op.lte]: new Date()
                        },
                        isCompleted: false
                    }
                ]
            },
            order: [
                ['isPinned', 'DESC'],
                ['createdAt', 'DESC']
            ]
        });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Yeni not oluştur
router.post('/', async (req, res) => {
    try {
        const note = await Note.create(req.body);
        res.status(201).json(note);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Not güncelle
router.put('/:id', async (req, res) => {
    try {
        const note = await Note.findByPk(req.params.id);
        if (note) {
            await note.update(req.body);
            res.json(note);
        } else {
            res.status(404).json({ message: 'Not bulunamadı' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Not sil
router.delete('/:id', async (req, res) => {
    try {
        const note = await Note.findByPk(req.params.id);
        if (note) {
            await note.destroy();
            res.json({ message: 'Not silindi' });
        } else {
            res.status(404).json({ message: 'Not bulunamadı' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Not pozisyonunu güncelle
router.put('/:id/position', async (req, res) => {
    try {
        const note = await Note.findByPk(req.params.id);
        if (note) {
            await note.update({
                position: req.body.position
            });
            res.json(note);
        } else {
            res.status(404).json({ message: 'Not bulunamadı' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Hatırlatmayı tamamla veya ertele
router.put('/:id/reminder', async (req, res) => {
    try {
        const note = await Note.findByPk(req.params.id);
        if (note) {
            const { action, newDate } = req.body;
            if (action === 'complete') {
                await note.update({ isCompleted: true });
            } else if (action === 'postpone' && newDate) {
                await note.update({ reminderDate: newDate });
            }
            res.json(note);
        } else {
            res.status(404).json({ message: 'Not bulunamadı' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 