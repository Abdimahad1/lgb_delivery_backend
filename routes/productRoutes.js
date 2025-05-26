const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  createProduct,
  getVendorProducts,
  updateProduct,
  deleteProduct,
  getRandomProducts,
} = require('../controllers/productController');

// Protected routes
router.use(authMiddleware);

router.route('/')
  .post(createProduct)
  .get(getVendorProducts);

router.route('/random')
  .get(getRandomProducts);

router.route('/:id')
  .put(updateProduct)
  .delete(deleteProduct);

  const { getAllProducts } = require('../controllers/productController');

router.get('/all', getAllProducts);


module.exports = router;