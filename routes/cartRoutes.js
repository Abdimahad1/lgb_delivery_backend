const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getUserCart,
  addToCart,
  deleteCartItemByProduct,
  clearCart
} = require('../controllers/cartController');

router.use(authMiddleware);

router.get('/', getUserCart);
router.post('/add', addToCart);
// Change from itemId to productId
router.delete('/remove-by-product/:productId', deleteCartItemByProduct);
router.delete('/clear', clearCart);

module.exports = router;