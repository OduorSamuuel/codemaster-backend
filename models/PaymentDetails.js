// models/PaymentDetails.js
const mongoose = require('mongoose');

// Define the PaymentDetails Schema
const PaymentDetailsSchema = new mongoose.Schema({
    merchantRequestId: { type: String, required: true },
    checkoutRequestId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
    phoneNumber: { type: String, required: true },
    mpesaReceiptNumber: { type: String },
    transactionDate: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the User model
    paymentDate: { type: Date, default: Date.now }
});

const PaymentDetails = mongoose.model('PaymentDetails', PaymentDetailsSchema);

module.exports = PaymentDetails;
