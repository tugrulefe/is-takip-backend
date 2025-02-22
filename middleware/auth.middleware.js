const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Yetkilendirme başarısız' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findOne({ where: { id: decoded.id, isActive: true } });

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Lütfen giriş yapın' });
    }
};

// Admin yetkisi kontrolü
const isAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
        }
        next();
    } catch (error) {
        res.status(403).json({ message: 'Yetkilendirme hatası' });
    }
};

module.exports = { auth, isAdmin }; 