import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  from: {
    name: { type: String, default: 'VQS' },
    address: { type: String, default: '256, Old Police Quarter, Shahid Shahidullah Kayser Sarak' },
    city: { type: String, default: 'Feni City, Feni-3900, Bangladesh' },
    phone: { type: String, default: '01842956166' },
    email: { type: String, default: 'tipucbc@gmail.com' }
  },
  to: {
    name: { type: String, required: true },
    address: String,
    city: String,
    phone: String,
    email: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  }],
  subtotal: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  notes: String,
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Calculate totals before saving
invoiceSchema.pre('save', function(next) {
  this.items.forEach(item => {
    item.total = item.quantity * item.price;
  });
  
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  this.taxAmount = (this.subtotal * this.taxRate) / 100;
  this.total = this.subtotal + this.taxAmount;
  
  next();
});

// Auto-generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;