import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Item description is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  total: {
    type: Number,
    required: true
  }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true
  },
  from: {
    name: {
      type: String,
      required: true
    },
    address: String,
    city: String,
    phone: String,
    email: String
  },
  to: {
    name: {
      type: String,
      required: [true, 'Client name is required']
    },
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
  items: [itemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  taxRate: {
    type: Number,
    default: 10
  },
  taxAmount: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  notes: String,
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

invoiceSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  this.taxAmount = (this.subtotal * this.taxRate) / 100;
  this.total = this.subtotal + this.taxAmount;
  next();
});

export default mongoose.model('Invoice', invoiceSchema);