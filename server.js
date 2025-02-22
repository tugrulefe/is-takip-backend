const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const sequelize = require('./config/db.config');
const { Job, Note, Customer } = require('./models');
const { Op } = require('sequelize');

// Modelleri yükle
require('./models/index');

const app = express();

// İş durumu kontrol fonksiyonu
const checkJobStatus = async () => {
    try {
        const jobs = await Job.findAll({
            where: {
                status: 'yapılacak'
            }
        });

        const now = new Date();
        for (const job of jobs) {
            const updatedAt = new Date(job.updatedAt);
            const diffInMinutes = (now - updatedAt) / (1000 * 60);

            if (diffInMinutes > 1080) { // 18 saat = 1080 dakika
                await job.update({
                    status: 'beklemede'
                });
                console.log(`İş #${job.id} 18 saat içinde tamamlanmadığı için bekleyen işlere taşındı.`);
            }
        }
    } catch (error) {
        console.error('İş durumu kontrol edilirken hata:', error);
    }
};

// Zamanlanmış işleri kontrol eden fonksiyon
const checkScheduledJobs = async () => {
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
            console.log(`Zamanlanmış iş #${job.id} yapılacak işlere taşındı.`);
        }
    } catch (error) {
        console.error('Zamanlanmış işler kontrol edilirken hata:', error);
    }
};

// Hatırlatıcı kontrol fonksiyonu
const checkReminders = async () => {
    try {
        const notes = await Note.findAll({
            where: {
                isReminder: true,
                showInJobList: false,
                isCompleted: false
            }
        });

        const now = new Date();
        for (const note of notes) {
            const reminderDate = new Date(note.reminderDate);
            if (reminderDate <= now) {
                // Notu iş listesinde göster ve sabitle
                await note.update({
                    showInJobList: true,
                    isPinned: true
                });
                console.log(`Not #${note.id} hatırlatma zamanı geldiği için iş listesine eklendi ve sabitlendi.`);
            }
        }
    } catch (error) {
        console.error('Hatırlatıcılar kontrol edilirken hata:', error);
    }
};

// Her 30 saniyede bir iş durumlarını kontrol et
setInterval(checkJobStatus, 30000);

// Her 30 saniyede bir zamanlanmış işleri kontrol et
setInterval(checkScheduledJobs, 30000);

// Her 30 saniyede bir hatırlatıcıları kontrol et
setInterval(checkReminders, 30000);

// Yedekleme klasörünü oluştur
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Veritabanı yedekleme fonksiyonu
const backupDatabase = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.sql`);
    
    const mysqldump = `"C:\\Program Files\\MySQL\\MySQL Server 9.2\\bin\\mysqldump" -u root -p"Efe123sen*" is_takip_sistemi > "${backupPath}"`;
    
    exec(mysqldump, (error, stdout, stderr) => {
        if (error) {
            console.error('Yedekleme sırasında hata:', error);
            return;
        }
        console.log(`Veritabanı yedeklendi: ${backupPath}`);

        // Eski yedekleri temizle (son 5 yedeği tut)
        const backups = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.sql'))
            .sort()
            .reverse();

        if (backups.length > 5) {
            backups.slice(5).forEach(backup => {
                fs.unlinkSync(path.join(backupDir, backup));
            });
        }
    });
};

// Her gün saat 00:00'da yedek al
const scheduleBackup = () => {
    const now = new Date();
    const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0
    );
    const msToMidnight = night.getTime() - now.getTime();

    setTimeout(() => {
        backupDatabase();
        setInterval(backupDatabase, 24 * 60 * 60 * 1000);
    }, msToMidnight);
};

// Middleware
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload klasörlerini oluştur
const uploadDirs = ['uploads/photos', 'uploads/invoices'];
uploadDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// Statik dosyalar için klasörleri tanımla
app.use('/uploads/photos', express.static(path.join(__dirname, 'uploads/photos')));
app.use('/uploads/invoices', express.static(path.join(__dirname, 'uploads/invoices')));

// Routes
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/jobs', require('./routes/job.routes'));
app.use('/api/notes', require('./routes/note.routes'));
app.use('/api/auth', require('./routes/auth.routes'));

// Dosya görüntüleme endpointi
app.get('/api/files/:type/:filename', (req, res) => {
    const { type, filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', type, filename);
    
    // Dosyanın varlığını kontrol et
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Dosya bulunamadı' });
    }

    // Dosya türünü belirle
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    
    // Dosyayı gönder
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});

// Port
const PORT = process.env.PORT || 3001;

// Veritabanı ve sunucu başlatma fonksiyonu
const startServer = async () => {
    try {
        // Veritabanı bağlantısını test et ve modelleri senkronize et
        await sequelize.authenticate()
            .then(() => {
                console.log('Veritabanı bağlantısı başarılı.');
                return sequelize.sync({ alter: true });
            })
            .then(() => {
                console.log('Veritabanı modelleri senkronize edildi.');
            })
            .catch(err => {
                console.error('Veritabanı bağlantısı başarısız:', err);
            });

        // Sunucuyu başlat
        app.listen(PORT, () => {
            console.log(`Server ${PORT} portunda çalışıyor.`);
            // İlk yedeklemeyi yap ve zamanlamayı başlat
            backupDatabase();
            scheduleBackup();
        });
    } catch (error) {
        console.error('Sunucu başlatılırken hata oluştu:', error);
        process.exit(1);
    }
};

// Sunucuyu başlat
startServer();

// Beklenmeyen hataları yakala
process.on('unhandledRejection', (error) => {
    console.error('Beklenmeyen hata:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM sinyali alındı. Sunucu kapatılıyor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Sunucu kapatılıyor...');
    process.exit(0);
}); 