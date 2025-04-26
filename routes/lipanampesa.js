const express = require('express');
const router = express.Router();
const {
    initiateSTKPush,
    stkPushCallback,
    getPaymentStatus
} = require("../controllers/lipanampesa.js");
const authMiddleware = require('../middleware/auth');

const { accessToken } = require("../middleware/generateAccessToken.js");

router.route('/stkPush').post(accessToken, initiateSTKPush);
router.route('/stkPushCallback/:Order_ID').post(stkPushCallback);
router.route('/paymentStatus/:CheckoutRequestID')
  .get(authMiddleware, accessToken, getPaymentStatus);  // Apply both middlewares


module.exports = router;