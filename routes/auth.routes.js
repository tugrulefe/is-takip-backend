const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { auth, isAdmin } = require('../middleware/auth.middleware');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Giriş yapma
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username, isActive: true } });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Kullanıcı adı veya şifre hatalı' });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// Kullanıcı oluşturma (Sadece admin)
router.post('/users', auth, isAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const user = await User.create({ username, password, role });
        
        res.status(201).json({
            id: user.id,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
        }
        res.status(500).json({ message: 'Kullanıcı oluşturulurken hata oluştu' });
    }
});

// Kullanıcıları listeleme (Sadece admin)
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'role', 'isActive', 'createdAt']
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcılar listelenirken hata oluştu' });
    }
});

// Kullanıcı güncelleme (Sadece admin)
router.put('/users/:id', auth, isAdmin, async (req, res) => {
    try {
        const { username, password, role, isActive } = req.body;
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        const updateData = {};
        if (username) updateData.username = username;
        if (password) updateData.password = password;
        if (role) updateData.role = role;
        if (typeof isActive === 'boolean') updateData.isActive = isActive;

        await user.update(updateData);

        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            isActive: user.isActive
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
        }
        res.status(500).json({ message: 'Kullanıcı güncellenirken hata oluştu' });
    }
});

// Kullanıcı silme (Sadece admin)
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        await user.destroy();
        res.json({ message: 'Kullanıcı başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcı silinirken hata oluştu' });
    }
});

// Mevcut kullanıcı bilgilerini getir
router.get('/me', auth, async (req, res) => {
    try {
        res.json({
            id: req.user.id,
            username: req.user.username,
            role: req.user.role
        });
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcı bilgileri alınırken hata oluştu' });
    }
});

module.exports = router; 