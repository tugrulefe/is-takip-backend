router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, price, hasVat } = req.body;

        const job = await Job.findByPk(id);
        if (!job) {
            return res.status(404).json({ message: 'İş bulunamadı' });
        }

        await job.update({
            status,
            price: price || null,
            hasVat: hasVat || false
        });

        res.json(job);
    } catch (error) {
        console.error('İş durumu güncellenirken hata:', error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
}); 