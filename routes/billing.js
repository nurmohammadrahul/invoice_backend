import express from 'express';
import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';

const router = express.Router();

// Enhanced mock data storage with persistence
let tempMockInvoices = [
  {
    _id: 'mock-1',
    invoiceNumber: 'INV-001',
    from: {
      name: 'Your Company',
      address: '123 Business St',
      city: 'Your City, State 12345',
      phone: '(555) 123-4567',
      email: 'billing@company.com'
    },
    to: {
      name: 'Client Company',
      address: '456 Client Ave',
      city: 'Client City, State 67890', 
      phone: '(555) 987-6543',
      email: 'accounting@client.com'
    },
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    items: [
      { 
        _id: new mongoose.Types.ObjectId(),
        description: 'Web Development Services', 
        quantity: 10, 
        price: 100, 
        total: 1000 
      },
      { 
        _id: new mongoose.Types.ObjectId(),
        description: 'Consulting Hours', 
        quantity: 5, 
        price: 150, 
        total: 750 
      }
    ],
    subtotal: 1750,
    taxRate: 10,
    taxAmount: 175,
    total: 1925,
    notes: 'Thank you for your business! Payment is due within 30 days.',
    status: 'sent',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Helper function to check database connection
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Generate unique ID for mock invoices
const generateMockId = () => `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// GET /api/billing/invoices - Get all invoices
router.get('/invoices', async (req, res) => {
  try {
    console.log('📋 Fetching invoices...');
    
    if (isDatabaseConnected()) {
      // Try to get user ID from token (in real app, this would be from auth middleware)
      const userId = req.user?.id || '65f1a2b3c4d5e6f7a8b9c0d1';
      const invoices = await Invoice.find({ createdBy: userId })
        .sort({ createdAt: -1 })
        .lean();
      
      console.log(`✅ Found ${invoices.length} invoices in database`);
      
      return res.json({
        success: true,
        invoices,
        totalInvoices: invoices.length,
        source: 'database'
      });
    } else {
      throw new Error('Database not connected');
    }
    
  } catch (error) {
    console.log('💡 Using mock data:', error.message);
    
    // Return mock invoices sorted by creation date (newest first)
    const sortedInvoices = tempMockInvoices.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    res.json({
      success: true,
      invoices: sortedInvoices,
      totalInvoices: sortedInvoices.length,
      source: 'mock'
    });
  }
});

// GET /api/billing/invoices/:id - Get single invoice
router.get('/invoices/:id', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    console.log(`📄 Fetching invoice: ${invoiceId}`);
    
    if (isDatabaseConnected()) {
      const userId = req.user?.id || '65f1a2b3c4d5e6f7a8b9c0d1';
      const invoice = await Invoice.findOne({ 
        _id: invoiceId, 
        createdBy: userId 
      }).lean();
      
      if (invoice) {
        return res.json({
          success: true,
          invoice,
          source: 'database'
        });
      } else {
        return res.status(404).json({ 
          success: false,
          error: 'Invoice not found' 
        });
      }
    } else {
      throw new Error('Database not connected');
    }
    
  } catch (error) {
    console.log('💡 Searching in mock data:', error.message);
    
    // Search in mock data
    const invoice = tempMockInvoices.find(inv => inv._id === req.params.id);
    if (!invoice) {
      return res.status(404).json({ 
        success: false,
        error: 'Invoice not found' 
      });
    }
    
    res.json({
      success: true,
      invoice,
      source: 'mock'
    });
  }
});

// POST /api/billing/invoices - Create new invoice
router.post('/invoices', async (req, res) => {
  try {
    console.log('🆕 Creating new invoice...');
    
    if (isDatabaseConnected()) {
      const userId = req.user?.id || '65f1a2b3c4d5e6f7a8b9c0d1';
      
      // Generate invoice number
      const lastInvoice = await Invoice.findOne({ createdBy: userId })
        .sort({ createdAt: -1 });
      const nextNumber = lastInvoice ? 
        parseInt(lastInvoice.invoiceNumber.split('-')[1]) + 1 : 1;
      const invoiceNumber = `INV-${String(nextNumber).padStart(3, '0')}`;
      
      // Add item IDs and calculate totals
      const itemsWithIds = req.body.items.map(item => ({
        ...item,
        _id: new mongoose.Types.ObjectId(),
        total: item.quantity * item.price
      }));
      
      const subtotal = itemsWithIds.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = (subtotal * req.body.taxRate) / 100;
      const total = subtotal + taxAmount;
      
      const newInvoice = new Invoice({
        ...req.body,
        items: itemsWithIds,
        subtotal,
        taxAmount,
        total,
        invoiceNumber,
        createdBy: userId
      });
      
      await newInvoice.save();
      
      console.log('✅ Invoice saved to database:', newInvoice.invoiceNumber);
      
      return res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        invoice: newInvoice,
        source: 'database'
      });
    } else {
      throw new Error('Database not connected');
    }
    
  } catch (error) {
    console.log('💡 Saving to mock data:', error.message);
    
    // Generate invoice number for mock data
    const lastMockInvoice = tempMockInvoices
      .sort((a, b) => parseInt(b.invoiceNumber.split('-')[1]) - parseInt(a.invoiceNumber.split('-')[1]))[0];
    const nextNumber = lastMockInvoice ? 
      parseInt(lastMockInvoice.invoiceNumber.split('-')[1]) + 1 : 1;
    const invoiceNumber = `INV-${String(nextNumber).padStart(3, '0')}`;
    
    // Calculate totals
    const itemsWithIds = req.body.items.map(item => ({
      ...item,
      _id: new mongoose.Types.ObjectId(),
      total: item.quantity * item.price
    }));
    
    const subtotal = itemsWithIds.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = (subtotal * req.body.taxRate) / 100;
    const total = subtotal + taxAmount;
    
    const newInvoice = {
      _id: generateMockId(),
      invoiceNumber,
      ...req.body,
      items: itemsWithIds,
      subtotal,
      taxAmount,
      total,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    tempMockInvoices.unshift(newInvoice); // Add to beginning for newest first
    
    console.log('✅ Invoice saved to mock storage:', newInvoice.invoiceNumber);
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully (mock storage)',
      invoice: newInvoice,
      source: 'mock'
    });
  }
});

// PUT /api/billing/invoices/:id - Update invoice
router.put('/invoices/:id', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    console.log(`✏️ Updating invoice: ${invoiceId}`);
    
    if (isDatabaseConnected()) {
      const userId = req.user?.id || '65f1a2b3c4d5e6f7a8b9c0d1';
      
      // If items are being updated, recalculate totals
      let updateData = { ...req.body, updatedAt: new Date() };
      
      if (req.body.items) {
        const itemsWithIds = req.body.items.map(item => ({
          ...item,
          _id: item._id || new mongoose.Types.ObjectId(),
          total: item.quantity * item.price
        }));
        
        const subtotal = itemsWithIds.reduce((sum, item) => sum + item.total, 0);
        const taxAmount = (subtotal * (req.body.taxRate || 10)) / 100;
        const total = subtotal + taxAmount;
        
        updateData = {
          ...updateData,
          items: itemsWithIds,
          subtotal,
          taxAmount,
          total
        };
      }
      
      const invoice = await Invoice.findOneAndUpdate(
        { _id: invoiceId, createdBy: userId },
        updateData,
        { new: true, runValidators: true }
      );
      
      if (invoice) {
        return res.json({
          success: true,
          message: 'Invoice updated successfully',
          invoice,
          source: 'database'
        });
      } else {
        return res.status(404).json({ 
          success: false,
          error: 'Invoice not found' 
        });
      }
    } else {
      throw new Error('Database not connected');
    }
    
  } catch (error) {
    console.log('💡 Updating mock data:', error.message);
    
    const index = tempMockInvoices.findIndex(inv => inv._id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Invoice not found' 
      });
    }
    
    // Update the invoice
    let updatedInvoice = { 
      ...tempMockInvoices[index], 
      ...req.body, 
      updatedAt: new Date() 
    };
    
    // Recalculate totals if items were updated
    if (req.body.items) {
      const subtotal = req.body.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const taxAmount = (subtotal * updatedInvoice.taxRate) / 100;
      const total = subtotal + taxAmount;
      
      updatedInvoice = {
        ...updatedInvoice,
        subtotal,
        taxAmount,
        total
      };
    }
    
    tempMockInvoices[index] = updatedInvoice;
    
    res.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice: updatedInvoice,
      source: 'mock'
    });
  }
});

// DELETE /api/billing/invoices/:id - Delete invoice
router.delete('/invoices/:id', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    console.log(`🗑️ Deleting invoice: ${invoiceId}`);
    
    if (isDatabaseConnected()) {
      const userId = req.user?.id || '65f1a2b3c4d5e6f7a8b9c0d1';
      const invoice = await Invoice.findOneAndDelete({ 
        _id: invoiceId, 
        createdBy: userId 
      });
      
      if (invoice) {
        return res.json({
          success: true,
          message: 'Invoice deleted successfully',
          source: 'database'
        });
      } else {
        return res.status(404).json({ 
          success: false,
          error: 'Invoice not found' 
        });
      }
    } else {
      throw new Error('Database not connected');
    }
    
  } catch (error) {
    console.log('💡 Deleting from mock data:', error.message);
    
    const index = tempMockInvoices.findIndex(inv => inv._id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Invoice not found' 
      });
    }
    
    const deletedInvoice = tempMockInvoices[index];
    tempMockInvoices.splice(index, 1);
    
    res.json({
      success: true,
      message: 'Invoice deleted successfully',
      deletedInvoice: deletedInvoice.invoiceNumber,
      source: 'mock'
    });
  }
});

// GET /api/billing/invoices/:id/pdf - Generate PDF
router.get('/invoices/:id/pdf', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    console.log(`📄 Generating PDF for invoice: ${invoiceId}`);
    
    let invoice;
    
    // Try database first
    if (isDatabaseConnected()) {
      const userId = req.user?.id || '65f1a2b3c4d5e6f7a8b9c0d1';
      invoice = await Invoice.findOne({ 
        _id: invoiceId, 
        createdBy: userId 
      }).lean();
    }
    
    // Fallback to mock data
    if (!invoice) {
      invoice = tempMockInvoices.find(inv => inv._id === invoiceId);
    }
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false,
        error: 'Invoice not found' 
      });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(25)
       .font('Helvetica-Bold')
       .fillColor('#333333')
       .text('INVOICE', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Invoice details
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#666666')
       .text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'left' })
       .text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, { align: 'left' })
       .text(`Status: ${invoice.status.toUpperCase()}`, { align: 'left' });
    
    doc.moveDown();
    
    // From and To sections side by side
    const columnWidth = 250;
    
    // From section
    doc.font('Helvetica-Bold')
       .fillColor('#333333')
       .text('FROM:', 50, doc.y);
    
    doc.font('Helvetica')
       .fillColor('#666666')
       .text(invoice.from.name, 50, doc.y + 20);
    
    if (invoice.from.address) {
      doc.text(invoice.from.address, 50, doc.y + 5);
    }
    if (invoice.from.city) {
      doc.text(invoice.from.city, 50, doc.y + 5);
    }
    if (invoice.from.phone) {
      doc.text(invoice.from.phone, 50, doc.y + 5);
    }
    if (invoice.from.email) {
      doc.text(invoice.from.email, 50, doc.y + 5);
    }
    
    // To section
    const toSectionY = doc.y - 80; // Reset to same level as From section
    doc.font('Helvetica-Bold')
       .fillColor('#333333')
       .text('TO:', 50 + columnWidth, toSectionY);
    
    doc.font('Helvetica')
       .fillColor('#666666')
       .text(invoice.to.name, 50 + columnWidth, toSectionY + 20);
    
    if (invoice.to.address) {
      doc.text(invoice.to.address, 50 + columnWidth, doc.y + 5);
    }
    if (invoice.to.city) {
      doc.text(invoice.to.city, 50 + columnWidth, doc.y + 5);
    }
    if (invoice.to.phone) {
      doc.text(invoice.to.phone, 50 + columnWidth, doc.y + 5);
    }
    if (invoice.to.email) {
      doc.text(invoice.to.email, 50 + columnWidth, doc.y + 5);
    }
    
    doc.moveDown(3);
    
    // Due date if exists
    if (invoice.dueDate) {
      doc.font('Helvetica-Bold')
         .fillColor('#333333')
         .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, { align: 'right' });
    }
    
    doc.moveDown();
    
    // Items table header
    const tableTop = doc.y;
    
    doc.font('Helvetica-Bold')
       .fillColor('#ffffff')
       .rect(50, tableTop, 500, 20)
       .fill('#667eea');
    
    doc.text('Description', 60, tableTop + 5)
       .text('Qty', 350, tableTop + 5)
       .text('Price', 400, tableTop + 5)
       .text('Total', 470, tableTop + 5);
    
    // Items rows
    let y = tableTop + 25;
    doc.font('Helvetica')
       .fillColor('#333333');
    
    invoice.items.forEach((item, index) => {
      if (y > 700) { // Add new page if needed
        doc.addPage();
        y = 50;
      }
      
      // Alternate row colors
      if (index % 2 === 0) {
        doc.fillColor('#f8f9fa')
           .rect(50, y, 500, 20)
           .fill();
      }
      
      doc.fillColor('#333333')
         .text(item.description, 60, y + 5, { width: 280 })
         .text(item.quantity.toString(), 350, y + 5)
         .text(`$${item.price.toFixed(2)}`, 400, y + 5)
         .text(`$${item.total.toFixed(2)}`, 470, y + 5);
      
      y += 25;
    });
    
    // Totals
    const totalsY = y + 20;
    
    doc.font('Helvetica')
       .text('Subtotal:', 400, totalsY)
       .text(`$${invoice.subtotal.toFixed(2)}`, 470, totalsY)
       
       .text(`Tax (${invoice.taxRate}%):`, 400, totalsY + 20)
       .text(`$${invoice.taxAmount.toFixed(2)}`, 470, totalsY + 20)
       
       .font('Helvetica-Bold')
       .text('Total:', 400, totalsY + 40)
       .text(`$${invoice.total.toFixed(2)}`, 470, totalsY + 40);
    
    // Notes
    if (invoice.notes) {
      doc.moveDown(3)
         .font('Helvetica-Bold')
         .text('Notes:', 50, doc.y)
         .font('Helvetica')
         .text(invoice.notes, 50, doc.y + 15, { width: 500 });
    }
    
    // Footer
    const footerY = 750;
    doc.fontSize(10)
       .fillColor('#666666')
       .text('Thank you for your business!', 50, footerY, { align: 'center', width: 500 });
    
    doc.end();
    
    console.log('✅ PDF generated successfully');

  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate PDF',
      message: error.message 
    });
  }
});

// GET /api/billing/stats - Get invoice statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching invoice statistics...');
    
    let invoices = [];
    
    if (isDatabaseConnected()) {
      const userId = req.user?.id || '65f1a2b3c4d5e6f7a8b9c0d1';
      invoices = await Invoice.find({ createdBy: userId }).lean();
    } else {
      invoices = tempMockInvoices;
    }
    
    const stats = {
      totalInvoices: invoices.length,
      totalRevenue: invoices.reduce((sum, inv) => sum + inv.total, 0),
      pendingInvoices: invoices.filter(inv => inv.status === 'sent' || inv.status === 'draft').length,
      paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
      overdueInvoices: invoices.filter(inv => inv.status === 'overdue').length,
      byStatus: {
        draft: invoices.filter(inv => inv.status === 'draft').length,
        sent: invoices.filter(inv => inv.status === 'sent').length,
        paid: invoices.filter(inv => inv.status === 'paid').length,
        overdue: invoices.filter(inv => inv.status === 'overdue').length
      }
    };
    
    res.json({
      success: true,
      stats,
      source: isDatabaseConnected() ? 'database' : 'mock'
    });
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// PATCH /api/billing/invoices/:id/status - Update only status
router.patch('/invoices/:id/status', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { status } = req.body;
    
    if (!status || !['draft', 'sent', 'paid', 'overdue'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required: draft, sent, paid, or overdue'
      });
    }
    
    console.log(`🔄 Updating invoice ${invoiceId} status to: ${status}`);
    
    if (isDatabaseConnected()) {
      const userId = req.user?.id || '65f1a2b3c4d5e6f7a8b9c0d1';
      const invoice = await Invoice.findOneAndUpdate(
        { _id: invoiceId, createdBy: userId },
        { status, updatedAt: new Date() },
        { new: true }
      );
      
      if (invoice) {
        return res.json({
          success: true,
          message: `Invoice status updated to ${status}`,
          invoice,
          source: 'database'
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
    } else {
      throw new Error('Database not connected');
    }
    
  } catch (error) {
    console.log('💡 Updating status in mock data:', error.message);
    
    const index = tempMockInvoices.findIndex(inv => inv._id === req.params.id);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    tempMockInvoices[index] = {
      ...tempMockInvoices[index],
      status: req.body.status,
      updatedAt: new Date()
    };
    
    res.json({
      success: true,
      message: `Invoice status updated to ${req.body.status}`,
      invoice: tempMockInvoices[index],
      source: 'mock'
    });
  }
});

export default router;