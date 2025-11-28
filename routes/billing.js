import express from 'express';
import PDFDocument from 'pdfkit';

const router = express.Router();

// GET all invoices
router.get('/invoices', async (req, res) => {
  try {
    console.log('📋 Fetching invoices...');
    
    // Import Invoice model
    const { default: Invoice } = await import('../models/Invoice.js');
    
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    
    console.log(`✅ Found ${invoices.length} invoices`);
    
    res.json({
      success: true,
      invoices,
      totalInvoices: invoices.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
      message: error.message
    });
  }
});

// GET single invoice
router.get('/invoices/:id', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    console.log(`📄 Fetching invoice: ${invoiceId}`);
    
    const { default: Invoice } = await import('../models/Invoice.js');
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false,
        error: 'Invoice not found' 
      });
    }
    
    res.json({
      success: true,
      invoice
    });
    
  } catch (error) {
    console.error('❌ Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice details',
      message: error.message
    });
  }
});

// POST create invoice
router.post('/invoices', async (req, res) => {
  try {
    console.log('🆕 Creating new invoice...');
    
    const { default: Invoice } = await import('../models/Invoice.js');
    
    const newInvoice = new Invoice(req.body);
    await newInvoice.save();
    
    console.log('✅ Invoice created successfully:', newInvoice.invoiceNumber);
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice: newInvoice
    });
    
  } catch (error) {
    console.error('❌ Error creating invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create invoice',
      message: error.message
    });
  }
});

export default router;