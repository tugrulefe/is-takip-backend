const nodemailer = require('nodemailer');

// Mail sunucusu konfigürasyonu
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'thugroll17@gmail.com',
        pass: 'bygt nrkj byra uczn'
    },
    tls: {
        rejectUnauthorized: false
    },
    debug: true, // Debug modunu aktif et
    logger: true // Logger'ı aktif et
});

// Bağlantı testi
console.log('Mail sunucusu bağlantı testi başlıyor...');
transporter.verify(function(error, success) {
    if (error) {
        console.error('Mail sunucusu bağlantı hatası:', {
            error: error.message,
            code: error.code,
            command: error.command,
            responseCode: error.responseCode,
            response: error.response
        });
    } else {
        console.log('Mail sunucusu bağlantısı başarılı:', {
            success,
            host: transporter.options.host,
            port: transporter.options.port,
            secure: transporter.options.secure
        });
    }
});

module.exports = transporter;