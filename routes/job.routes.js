const Job = require('../models/Job');
const Customer = require('../models/Customer');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const transporter = require('../config/mail.config');
const { Op } = require('sequelize');

// Dosya yükleme konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const type = req.path.includes('invoice') ? 'invoices' : 'photos';
        const dir = path.join(__dirname, `../uploads/${type}`);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Bekleyen işleri getir
router.get('/pending', async (req, res) => {
    try {
        const jobs = await Job.findAll({
            where: { status: 'beklemede' },
            include: [{
                model: Customer,
                as: 'customer'
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Ödeme bekleyen işleri getir
router.get('/pending-payment', async (req, res) => {
    try {
        const jobs = await Job.findAll({
            where: { 
                status: 'tamamlandı',
                paymentStatus: 'ödeme alınmadı'
            },
            include: [{
                model: Customer,
                as: 'customer'
            }],
            order: [['completedAt', 'DESC']]
        });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Yapılacak işleri getir
router.get('/todo', async (req, res) => {
    try {
        const jobs = await Job.findAll({
            where: { status: 'yapılacak' },
            include: [{
                model: Customer,
                as: 'customer'
            }],
            order: [['displayOrder', 'ASC']]
        });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Fatura bekleyen işleri getir
router.get('/pending-invoice', async (req, res) => {
    try {
        const jobs = await Job.findAll({
            where: { status: 'fatura bekliyor' },
            include: [{
                model: Customer,
                as: 'customer'
            }]
        });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Tüm işleri getir
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.findAll({
            where: { status: 'tamamlandı' },
            include: [{
                model: Customer,
                as: 'customer'
            }],
            order: [['completedAt', 'DESC']]
        });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Yeni iş oluştur
router.post('/', async (req, res) => {
    try {
        const job = await Job.create(req.body);
        res.json(job);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// İş fotoğrafı yükle
router.post('/:id/photos', upload.array('photos', 5), async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id);
        if (!job) {
            return res.status(404).json({ message: 'İş bulunamadı' });
        }

        const photosPaths = req.files.map(file => file.path);
        const currentPhotos = job.photos || [];
        job.photos = [...currentPhotos, ...photosPaths];
        await job.save();

        res.json(job);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Fatura yükleme
router.post('/:id/upload-invoice', upload.single('invoice'), async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id, {
            include: [{
                model: Customer,
                as: 'customer'
            }]
        });
        
        if (!job) {
            return res.status(404).json({ message: 'İş bulunamadı' });
        }

        // Müşteri e-postası güncelleme
        if (req.body.customerEmail && (!job.customer.email || req.body.updateCustomerEmail === 'true')) {
            try {
                await job.customer.update({
                    email: req.body.customerEmail
                });
                console.log('Müşteri e-postası güncellendi:', req.body.customerEmail);
            } catch (emailError) {
                console.error('Müşteri e-postası güncellenirken hata:', emailError);
            }
        }

        // Fatura dosyası varsa kaydet
        if (req.file) {
            job.invoiceFile = req.file.filename;
        }

        // Fiyat, KDV ve ödeme bilgilerini güncelle
        job.price = req.body.price;
        job.hasVat = req.body.hasVat === 'true';
        job.paymentStatus = req.body.paymentStatus;
        job.paymentType = req.body.paymentType;
        job.status = 'tamamlandı';
        job.completedAt = new Date();

        await job.save();

        // Eğer müşteri e-postası varsa ve mail gönderme seçeneği işaretlenmişse faturayı gönder
        if (job.customer.email && req.body.sendEmail === 'true' && req.file) {
            try {
                const mailOptions = {
                    from: 'thugroll17@gmail.com',
                    to: job.customer.email,
                    subject: 'Fatura',
                    text: 'Faturanız ekte yer almaktadır.',
                    attachments: [{
                        filename: req.file.originalname,
                        path: req.file.path
                    }]
                };

                await transporter.sendMail(mailOptions);
                console.log('Fatura e-postası gönderildi:', job.customer.email);
            } catch (mailError) {
                console.error('Fatura e-postası gönderilirken hata:', mailError);
            }
        }

        // Güncel iş bilgilerini getir
        const updatedJob = await Job.findByPk(job.id, {
            include: [{
                model: Customer,
                as: 'customer'
            }]
        });

        res.json(updatedJob);
    } catch (error) {
        console.error('Fatura yüklenirken hata:', error);
        res.status(500).json({ message: 'Fatura yüklenirken bir hata oluştu' });
    }
});

// İş durumunu güncelle
router.put('/:id/status', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id, {
            include: [{
                model: Customer,
                as: 'customer'
            }]
        });
        
        if (!job) {
            return res.status(404).json({ message: 'İş bulunamadı' });
        }

        const { status, price, hasVat, customerEmail, paymentStatus, paymentType, description, note, scheduledDate } = req.body;
        
        // Müşteri e-postası güncelleme
        if (customerEmail && (!job.customer.email || req.body.updateCustomerEmail)) {
            try {
                await job.customer.update({
                    email: customerEmail
                });
            } catch (emailError) {
                console.error('Müşteri e-postası güncellenirken hata:', emailError);
            }
        }

        // İş güncelleme
        const updateData = {
            status: status || job.status,
            price: price !== undefined ? price : job.price,
            hasVat: hasVat !== undefined ? hasVat : job.hasVat,
            paymentStatus: status === 'fatura bekliyor' ? paymentStatus : job.paymentStatus,
            paymentType: paymentType || job.paymentType,
            note: note !== undefined ? note : job.note,
            scheduledDate: scheduledDate !== undefined ? scheduledDate : job.scheduledDate
        };

        // Debug için log
        console.log('Gelen ödeme durumu:', paymentStatus);
        console.log('Güncelleme verisi:', updateData);

        // Eğer iş yapılacak durumuna geçiyorsa zamanlayıcıyı sıfırla
        if (status === 'yapılacak') {
            updateData.scheduledDate = null;
        }

        if (description) {
            updateData.description = description;
        }

        if (status === 'tamamlandı' && !job.completedAt) {
            updateData.completedAt = new Date();
        }

        await job.update(updateData);

        const updatedJob = await Job.findByPk(job.id, {
            include: [{
                model: Customer,
                as: 'customer'
            }]
        });

        res.json(updatedJob);
    } catch (error) {
        console.error('İş güncellenirken hata:', error);
        res.status(500).json({ 
            message: 'İş güncellenirken bir hata oluştu',
            error: error.message 
        });
    }
});

// Ödeme durumunu güncelle
router.put('/:id/payment-status', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id);
        if (!job) {
            return res.status(404).json({ message: 'İş bulunamadı' });
        }

        const { paymentStatus, paidAmount } = req.body;
        // Sayıları 2 ondalık basamağa yuvarlayalım
        const currentPaidAmount = Number((parseFloat(job.paidAmount) || 0).toFixed(2));
        const totalPrice = Number((parseFloat(job.price) || 0).toFixed(2));
        
        // KDV'li toplam fiyatı hesapla ve yuvarla
        const totalPriceWithVat = Number((job.hasVat ? totalPrice * 1.20 : totalPrice).toFixed(2));

        // Yeni ödeme miktarını ekle ve yuvarla
        const newPaidAmount = Number((currentPaidAmount + (parseFloat(paidAmount) || 0)).toFixed(2));

        // Hassasiyet sorunlarını önlemek için küçük bir tolerans ekleyelim
        const tolerance = 0.01;
        
        // Toplam ödeme tutarı, KDV'li toplam fiyatı geçemez (tolerans dahil)
        if (newPaidAmount > (totalPriceWithVat + tolerance)) {
            return res.status(400).json({ 
                message: 'Ödenen miktar toplam tutardan fazla olamaz' 
            });
        }

        // Ödeme durumunu güncelle
        let updatedPaymentStatus = paymentStatus;
        // Tolerans dahilinde tam ödeme kontrolü
        if (Math.abs(newPaidAmount - totalPriceWithVat) <= tolerance) {
            updatedPaymentStatus = paymentStatus; // Kullanıcının seçtiği ödeme türünü koru
        } else if (newPaidAmount > 0) {
            updatedPaymentStatus = 'ödeme alınmadı'; // Kısmi ödemede durumu değiştirme
        }

        await job.update({
            paymentStatus: updatedPaymentStatus,
            paidAmount: newPaidAmount
        });

        const updatedJob = await Job.findByPk(job.id, {
            include: [{
                model: Customer,
                as: 'customer'
            }]
        });

        res.json(updatedJob);
    } catch (error) {
        console.error('Ödeme durumu güncellenirken hata:', error);
        res.status(500).json({ message: error.message });
    }
});

// İşlerin sırasını güncelle
router.put('/reorder', async (req, res) => {
    const { jobOrders } = req.body;
    
    try {
        await Promise.all(
            Object.entries(jobOrders).map(([jobId, order]) => 
                Job.update(
                    { displayOrder: order },
                    { where: { id: jobId } }
                )
            )
        );
        
        res.json({ message: 'Sıralama güncellendi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Fatura dosyasını sil
router.delete('/:id/invoice', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id);
        if (!job) {
            return res.status(404).json({ message: 'İş bulunamadı' });
        }

        if (!job.invoiceFile) {
            return res.status(404).json({ message: 'Bu işe ait fatura bulunamadı' });
        }

        // Dosyayı fiziksel olarak sil
        const filePath = path.join(__dirname, '..', job.invoiceFile);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Veritabanındaki fatura referansını temizle
        await job.update({
            invoiceFile: null
        });

        res.json({ message: 'Fatura başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// İşi sil
router.delete('/:id', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id);
        if (!job) {
            return res.status(404).json({ message: 'İş bulunamadı' });
        }
        await job.destroy();
        res.json({ message: 'İş başarıyla silindi' });
    } catch (error) {
        console.error('İş silinirken hata:', error);
        res.status(500).json({ message: error.message });
    }
});

// Zamanlayıcı kontrolü için endpoint
router.get('/check-scheduled', async (req, res) => {
    try {
        const now = new Date();
        const scheduledJobs = await Job.findAll({
            where: {
                status: 'beklemede',
                scheduledDate: {
                    [Op.lte]: now,
                    [Op.ne]: null
                }
            }
        });

        for (const job of scheduledJobs) {
            await job.update({
                status: 'yapılacak',
                scheduledDate: null
            });
        }

        res.json({ success: true, updatedJobs: scheduledJobs.length });
    } catch (error) {
        console.error('Zamanlayıcı kontrolü sırasında hata:', error);
        res.status(500).json({ error: 'Zamanlayıcı kontrolü sırasında bir hata oluştu' });
    }
});

// İşi güncelle
router.put('/:id', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id, {
            include: [{
                model: Customer,
                as: 'customer'
            }]
        });
        
        if (!job) {
            return res.status(404).json({ message: 'İş bulunamadı' });
        }

        const { description, note, scheduledDate } = req.body;
        
        // İş güncelleme
        const updateData = {
            description: description || job.description,
            note: note !== undefined ? note : job.note,
            scheduledDate: scheduledDate !== undefined ? scheduledDate : job.scheduledDate
        };

        await job.update(updateData);

        const updatedJob = await Job.findByPk(job.id, {
            include: [{
                model: Customer,
                as: 'customer'
            }]
        });

        res.json(updatedJob);
    } catch (error) {
        console.error('İş güncellenirken hata:', error);
        res.status(500).json({ 
            message: 'İş güncellenirken bir hata oluştu',
            error: error.message 
        });
    }
});

// Rapor verilerini getir
router.get('/reports', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Tamamlanmış işleri getir
        const completedJobs = await Job.findAll({
            where: {
                completedAt: {
                    [Op.between]: [start, end]
                },
                status: 'tamamlandı'
            }
        });

        // Bekleyen ödemeleri getir
        const pendingPayments = await Job.findAll({
            where: {
                status: 'tamamlandı',
                paymentStatus: 'ödeme alınmadı'
            }
        });

        let totalRevenue = 0;
        let cashPayments = 0;
        let transferPayments = 0;
        let totalVat = 0;
        let taxBase = 0; // Matrah
        let pendingAmount = 0;

        // Tamamlanmış işlerin analizini yap
        completedJobs.forEach(job => {
            const basePrice = parseFloat(job.price) || 0;
            const paidAmount = parseFloat(job.paidAmount) || 0;
            const totalPriceWithVat = job.hasVat ? basePrice * 1.20 : basePrice;
            
            // Sadece ödenmiş tutarları hesaplamaya dahil et
            if (job.paymentStatus !== 'ödeme alınmadı') {
                // KDV hesaplama - sadece ödenmiş tutarlar için
                if (job.hasVat) {
                    const vatAmount = basePrice * 0.20;
                    totalVat += vatAmount;
                }

                // Ödeme türüne göre dağılım
                if (job.paymentStatus === 'nakit') {
                    cashPayments += totalPriceWithVat;
                } else if (job.paymentStatus === 'havale') {
                    transferPayments += totalPriceWithVat;
                }

                // Toplam gelir ve matrah hesaplama
                totalRevenue += totalPriceWithVat;
                taxBase += basePrice;
            }
        });

        // Bekleyen ödemeleri hesapla
        pendingPayments.forEach(job => {
            const basePrice = parseFloat(job.price) || 0;
            const paidAmount = parseFloat(job.paidAmount) || 0;
            const totalPrice = job.hasVat ? basePrice * 1.20 : basePrice;
            pendingAmount += (totalPrice - paidAmount);
        });

        // Aylık gelir dağılımını hesapla
        const months = {};
        completedJobs.forEach(job => {
            const date = new Date(job.completedAt);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const monthName = date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
            
            if (!months[monthKey]) {
                months[monthKey] = {
                    month: monthName,
                    revenue: 0,
                    vat: 0,
                    taxBase: 0
                };
            }

            const basePrice = parseFloat(job.price) || 0;
            const totalPriceWithVat = job.hasVat ? basePrice * 1.20 : basePrice;
            const vatAmount = job.hasVat ? basePrice * 0.20 : 0;

            // Sadece ödenmiş tutarları aylık gelire ekle
            if (job.paymentStatus !== 'ödeme alınmadı') {
                months[monthKey].revenue += totalPriceWithVat;
                months[monthKey].vat += vatAmount;
                months[monthKey].taxBase += basePrice; // Aylık matrah
            }
        });

        const monthlyRevenue = Object.values(months);

        // Ödeme türü dağılımını hesapla (sadece nakit ve havale)
        const paymentTypeDistribution = [
            { name: 'Nakit', value: cashPayments },
            { name: 'Havale', value: transferPayments }
        ];

        res.json({
            totalRevenue,
            taxBase,
            cashPayments,
            transferPayments,
            totalVat,
            monthlyRevenue,
            paymentTypeDistribution,
            pendingPayments: pendingAmount
        });

    } catch (error) {
        console.error('Rapor verileri alınırken hata:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 