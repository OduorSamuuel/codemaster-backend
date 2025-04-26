const request = require("request");
require('dotenv').config();
const { getTimestamp } = require("../utils/timestamp");
const PaymentDetails = require('../models/PaymentDetails'); 
const { User } = require('../models/User'); 
const paymentStore = new Map();

// @desc initiate stk push
// @method POST
// @route /stkPush
// @access public
const initiateSTKPush = async (req, res) => {
    try {
        const { amount, phoneNumber, Order_ID } = req.body;
        const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
        const auth = "Bearer " + req.safaricom_access_token;

        const timestamp = getTimestamp();
        const password = new Buffer.from(process.env.BUSINESS_SHORT_CODE + process.env.PASS_KEY + timestamp).toString('base64');
        const callback_url = "https://42b8-41-90-172-31.ngrok-free.app";

        request(
            {
                url: url,
                method: "POST",
                headers: {
                    "Authorization": auth
                },
                json: {
                    "BusinessShortCode": process.env.BUSINESS_SHORT_CODE,
                    "Password": password,
                    "Timestamp": timestamp,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": amount,
                    "PartyA": "254708374149",
                    "PartyB": process.env.BUSINESS_SHORT_CODE,
                    "PhoneNumber": phoneNumber,
                    "CallBackURL": `${callback_url}/api/stkPushCallback/${Order_ID}`,
                    "AccountReference": "Code Master Platform",
                    "TransactionDesc": "Paid online"
                }
            },
            function (e, response, body) {
                if (e) {
                    console.error("Request error:", e);
                    res.status(503).send({
                        message: "Error with the stk push",
                        error: e
                    });
                } else {
                    // Store the CheckoutRequestID with initial pending status
                    if (body.CheckoutRequestID) {
                        paymentStore.set(body.CheckoutRequestID, {
                            status: 'PENDING',
                            orderId: Order_ID,
                            timestamp: new Date(),
                            amount: amount,
                            phoneNumber: phoneNumber
                        });
                    }
                    console.log("STK push response body:", body);
                    res.status(200).json(body);
                }
            }
        );
    } catch (e) {
        console.error("Error while trying to create LipaNaMpesa details", e);
        res.status(503).send({
            message: "Something went wrong while trying to create LipaNaMpesa details. Contact admin",
            error: e
        });
    }
};


// @desc callback route Safaricom will post transaction status
// @method POST
// @route /stkPushCallback/:Order_ID
// @access public
const stkPushCallback = async(req, res) => {
    try {
        const { Order_ID } = req.params;
        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
        } = req.body.Body.stkCallback;

        // Update payment status in our store
        if (paymentStore.has(CheckoutRequestID)) {
            const paymentData = paymentStore.get(CheckoutRequestID);
            const status = ResultCode === 0 ? 'SUCCESS' : 'FAILED';

            if (CallbackMetadata && CallbackMetadata.Item) {
                const meta = Object.values(CallbackMetadata.Item);
                const mpesaData = {
                    status,
                    resultDesc: ResultDesc,
                    phoneNumber: meta.find(o => o.Name === 'PhoneNumber')?.Value?.toString(),
                    amount: meta.find(o => o.Name === 'Amount')?.Value?.toString(),
                    mpesaReceiptNumber: meta.find(o => o.Name === 'MpesaReceiptNumber')?.Value?.toString(),
                    transactionDate: meta.find(o => o.Name === 'TransactionDate')?.Value?.toString()
                };
                paymentStore.set(CheckoutRequestID, { ...paymentData, ...mpesaData });
console.log("Mpesa data:", mpesaData);
                // If the status is successful (ResultCode 1032), save the payment details to the database
                if (ResultCode === '1032') {
                    console.log("Payment successful. Saving payment details to the database...");
                    // Save payment details in the database
                    const paymentDetails = new PaymentDetails({
                        merchantRequestId: MerchantRequestID,
                        checkoutRequestId: CheckoutRequestID,
                        amount: parseFloat(mpesaData.amount),
                        status: 'SUCCESS',
                        phoneNumber: mpesaData.phoneNumber,
                        mpesaReceiptNumber: mpesaData.mpesaReceiptNumber,
                        transactionDate: mpesaData.transactionDate,
                        userId: paymentData.userId // Link to the user (assumed to be part of paymentData)
                    });
                    console.log("Payment details:", paymentDetails);
                    await paymentDetails.save();

                    // Optionally, update the user subscription to 'premium'
                    const user = await User.findById(paymentData.userId);
                    if (user) {
                        user.subscription.type = 'premium';
                        user.subscription.startedAt = new Date();
                        user.subscription.expiresAt = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); // 1 year subscription
                        await user.save();
                    }
                }
            } else {
                paymentStore.set(CheckoutRequestID, { 
                    ...paymentData, 
                    status, 
                    resultDesc: ResultDesc 
                });
            }
        }

        res.json(true);
    } catch (e) {
        console.error("Error in callback:", e);
        res.status(503).send({
            message: "Something went wrong with the callback",
            error: e.message
        });
    }
};

const getPaymentStatus = async (req, res) => {
    try {
        const { CheckoutRequestID } = req.params;
      

        // Check if the payment record exists in the store
        if (paymentStore.has(CheckoutRequestID)) {
            const paymentData = paymentStore.get(CheckoutRequestID);

            // Query Safaricom if status is still pending and within 5 minutes
            if (
                paymentData.status === 'PENDING' &&
                new Date() - paymentData.timestamp < 300000
            ) {
                const status = await queryMpesaStatus(
                    CheckoutRequestID,
                    req.safaricom_access_token,  // Pass access token from accessToken middleware
                    req  
                );
                if (status) {
                    // Update with the raw status code and description
                    paymentData.statusCode = status.ResultCode;
                    paymentData.resultDesc = getMpesaStatusMessage(status.ResultCode);
                    paymentStore.set(CheckoutRequestID, paymentData);
                }
            }

            // Return the updated payment status
            const responseData = paymentStore.get(CheckoutRequestID);
            return res.status(200).json({
                statusCode: responseData.statusCode, // Safaricom's status code
                resultDesc: responseData.resultDesc, // Friendly message
            });
        }

        // Payment record not found
        res.status(404).json({ message: 'Payment record not found' });
    } catch (e) {
        console.error('Error checking payment status:', e);
        res.status(503).json({
            message: 'Error checking payment status',
            error: e.message,
        });
    }
};


// Modified backend helper function for more accurate status messages
const getMpesaStatusMessage = (resultCode) => {
    const statusMessages = {
        '0': 'transaction cancelled', // Changed to be more concise
        '1': 'Insufficient balance in your M-Pesa account',
        '1032': 'successful',
        '1037': 'Transaction timed out. Please try again',
        '2001': 'Invalid payment credentials',
        '2006': 'Payment service error. Please try again',
        default: 'Payment processing error. Please try again',
    };

    return statusMessages[resultCode] || statusMessages['default'];
};




// Helper function to query Mpesa status
const queryMpesaStatus = async (CheckoutRequestID, access_token, req) => {
    console.log("Querying Mpesa status...");
    console.log("req.user._id:", req);
    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query";
    const timestamp = getTimestamp();
    const password = new Buffer.from(
        process.env.BUSINESS_SHORT_CODE + 
        process.env.PASS_KEY + 
        timestamp
    ).toString('base64');

    try {
        const response = await new Promise((resolve, reject) => {
            request({
                url,
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + access_token
                },
                json: {
                    "BusinessShortCode": process.env.BUSINESS_SHORT_CODE,
                    "Password": password,
                    "Timestamp": timestamp,
                    "CheckoutRequestID": CheckoutRequestID
                }
            }, (error, response, body) => {
                if (error) reject(error);
                else resolve(body);
            });
        });

        console.log("Mpesa status response:", response.ResultCode);

        // If the result code is 1032 (successful payment), save the payment details
        if (response.ResultCode === "1032") {
            console.log("Payment successful. Saving payment details to the database...");
            console.log("Mpesa response:", response);

            // Retrieve phoneNumber and amount from paymentStore using CheckoutRequestID
            const tempData = paymentStore.get(CheckoutRequestID);

            if (!tempData) {
                console.log("No temporary data found for CheckoutRequestID:", CheckoutRequestID);
                return;
            }

            const { phoneNumber, amount } = tempData;
console.log("user:", req.user);
            // Save payment details to the database using req.user._id for the user ID
            const paymentDetails = new PaymentDetails({
                merchantRequestId: response.MerchantRequestID,
                checkoutRequestId: response.CheckoutRequestID,
                amount: amount, // Using the stored amount
                status: 'SUCCESS',
                phoneNumber: phoneNumber, // Using the stored phone number
                mpesaReceiptNumber: response.MpesaReceiptNumber,
                transactionDate: response.TransactionDate,
                userId: req.user.id // Use the authenticated user's ID
            });

            await paymentDetails.save();

            // Now update the user’s subscription to premium
            const user = await User.findById(req.user.id); // Use req.user._id for the authenticated user
console.log("this is the user user:", user);
            if (user) {
                // Update subscription to premium
                user.subscription.type = 'premium';
                user.subscription.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days expiry

                await user.save();
                console.log(`User ${user.username}'s subscription has been updated to premium.`);
            } else {
                console.log("User not found for the payment.");
            }
        }

        return response; // Return the response from Safaricom

    } catch (error) {
        console.error("Error querying Mpesa status:", error);
        throw new Error("Error querying Mpesa status");
    }
};


module.exports = {
    initiateSTKPush,
    stkPushCallback,
    getPaymentStatus
};