/**
 * Router for traffic from the woocommerce shop
 */
const express = require('express');
const router = express.Router();
const discordBot = require('../js/serverJS/discordBot.js')
const {logMessage, LogLevel} = require('../js/serverJS/logger.js');
const staffRoleId = '951561165283160094';
const axios = require('axios');
const {checkNotAuthenticated, permissionCheck} = require("../js/serverJS/sessionChecker");
const userRouter = require("./userRouter");
const encryptLogic = require("../js/serverJS/encryptLogic");
const WooCommerceAPI = require('woocommerce-api');
const {pool} = require("../js/serverJS/database/dbConfig");

/**
 * WooCommerce API configuration for admin
 */
const wooCommerce = new WooCommerceAPI({
    url: 'https://store.teamgenetix.ch',
    consumerKey: process.env.WOOCOMMERECE_CONSUM_KEY,
    consumerSecret: process.env.WOOCOMMERECE_CONSUM_SECRET,
    wpAPI: true,
    version: 'wc/v3'
});

/**
 * POST route for receiving a new order
 */
router.post('/orderCreated', (req, res) => {
    const payload = req.body;

    if (!payload.id) {
        console.log('Ignoring payload without order id');
        res.sendStatus(200);
        return;
    }

    const orderId = payload.id;
    const orderStatus = payload.status;
    const currency = payload.currency;
    const dateCreated = formatDate(payload.date_created);
    const total = payload.total;
    const billing = payload.billing;

    const message = `
**<@&${staffRoleId}> Order Received! 🎉**
**Order ID:** ${orderId}
**Status:** ${orderStatus}
**Currency:** ${currency}
**Date Created:** ${dateCreated}
**Total:** ${currency} ${total}

Billing Information: 
- **First Name:** ${billing.first_name || "Not provided"}
- **Last Name:** ${billing.last_name || "Not provided"}
- **Email:** ${billing.email || "Not provided"}
- **Phone:** ${billing.phone || "Not provided"}
`;

    discordBot.sendMessageToChannel('1147985961955885168', message);
    console.log('Sent Order Received message to Discord');
    res.sendStatus(200);
});

/**
 * POST route for receiving an update on an order
 */
router.post('/orderUpdated', (req, res) => {
    const payload = req.body;

    const orderId = payload.id;
    const orderStatus = payload.status;
    const dateModified = formatDate(payload.date_modified);
    const total = payload.total;
    const billing = payload.billing;

    const message = `
**<@&${staffRoleId}> Order Updated! 🔄**
**Order ID:** ${orderId}
**Status:** ${orderStatus}
**Date Modified:** ${dateModified}
**Total:** ${total}

**Billing Information:**
- **First Name:** ${billing.first_name}
- **Last Name:** ${billing.last_name}
- **Email:** ${billing.email}
- **Phone:** ${billing.phone}
`;

    discordBot.sendMessageToChannel('1147985961955885168', message);
    console.log('Sent Order Updated message to Discord');

    res.sendStatus(200);
});

/**
 * POST route for receiving a new Contact Inquiry
 */
router.post('/newContactInquiry', (req, res) => {
    const payload = req.body;

    const name = payload.fields.name.value;
    const email = payload.fields.email.value;
    const message = payload.fields.message.value;
    const date = payload.meta.date.value;
    const time = payload.meta.time.value;
    const remoteIp = payload.meta.remote_ip.value;

    const discordMessage = `
**<@&${staffRoleId}> New Inquiry 📨**
**Name:** ${name}
**Email:** ${email}
**Message:**
${message}
**Date:** ${date} at ${time}
**Remote IP:** ${remoteIp}
    `;

    discordBot.sendMessageToChannel('1148167251778867201', discordMessage);
    console.log('Sent new Contact Inquiry message to Discord');

    res.sendStatus(200);
});

/**
 * POST route for generating a coupon
 */
router.post('/generateCouponCode', checkNotAuthenticated, permissionCheck('home', 'canOpen'), async (req, res) => {
    try {
        const couponCode = generateCouponCode();
        let expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 24);
        const formattedExpiryDate = expirationDate.toISOString().split('T')[0];

        const couponData = {
            code: couponCode,
            discount_type: 'percent',
            amount: `${req.user.team.salepercentage}`,
            individual_use: true,
            date_expires: `${formattedExpiryDate}`,
            apply_before_tax: true,
            exclude_sale_items: true,
            usage_limit: 1,
        };

        const response = await wooCommerce.post('coupons', couponData);
        insertCouponCode(req.user.id, formattedExpiryDate, couponCode);
        res.json({success: true, couponCode: couponCode});
    } catch (error) {
        console.error('Error generating coupon:', error);
        res.status(500).json({success: false, message: 'Error generating coupon'});
    }
});

/**
 * GET route for getting the current coupon code
 */
router.get('/getLatestCouponCode', checkNotAuthenticated, permissionCheck('home', 'canOpen'), (req, res) => {
    getLatestCouponCode(req.user.id).then((result) => {
        if (result.rows.length === 0) {
            res.status(200).json({success: true, couponCode: '-'});
        } else {
            res.status(200).json({success: true, couponCode: result.rows[0].code});
        }
    }).catch(() => {
        res.status(500).json({success: false, message: 'Error getting coupon code'});
    });
});

/**
 * Generates a unique coupon code
 * @returns {string}
 */
function generateCouponCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/**
 * Inserts the coupon code into the database
 * @param userId
 * @param expDate
 * @param code
 * @returns {Promise<QueryResult<any>>}
 */
function insertCouponCode(userId, expDate, code){
    return pool.query('INSERT INTO couponcodes (account_fk, expirydate, code, creationdate) VALUES ($1, $2, $3, NOW())', [userId, expDate, code]);
}

/**
 * Format a date string to a german date string
 * @param dateString
 * @returns {string}
 */
function formatDate(dateString) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('de-DE', options);
}

/**
 * Returns the latest valid coupon code
 * @param userId
 * @returns {Promise<QueryResult<any>>}
 */
function getLatestCouponCode(userId){
    return pool.query('SELECT * FROM couponcodes WHERE account_fk = $1 AND expirydate > NOW() ORDER BY creationdate DESC LIMIT 1', [userId]);
}

module.exports = router;