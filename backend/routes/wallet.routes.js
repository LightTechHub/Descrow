// backend/routes/wallet.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const walletController = require('../controllers/wallet.controller');

router.use(authenticate);

router.get('/', walletController.getWallet);
router.get('/transactions', walletController.getWalletTransactions);
router.get('/withdrawals', walletController.getWithdrawals);
router.post('/withdraw', walletController.requestWithdrawal);
router.get('/banks', walletController.getBankList);
router.post('/verify-account', walletController.verifyBankAccount);

module.exports = router;
