const CartItem = require('../models/CartItem');

exports.getUserCart = async (req, res) => {
  try {
    const cartItems = await CartItem.find({ userId: req.userId });
    res.status(200).json({ success: true, data: cartItems });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, vendorId, title, imagePath, price, quantity, location, vendorPhone } = req.body;

    // Validate required fields
    if (!productId || !vendorId || !title || !imagePath || !price || !location) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    let cartItem = await CartItem.findOne({
      userId: req.userId,
      productId: productId
    });

    if (cartItem) {
      cartItem.quantity += quantity || 1;
    } else {
      cartItem = new CartItem({
        userId: req.userId,
        productId,
        vendorId,
        title,
        imagePath,
        price,
        quantity: quantity || 1,
        location,
        vendorPhone: vendorPhone || ''
      });
    }

    await cartItem.save();
    res.status(200).json({ 
      success: true, 
      message: 'Cart updated', 
      data: cartItem 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating cart', 
      error: err.message 
    });
  }
};

exports.deleteCartItemByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await CartItem.deleteOne({ 
      userId: req.userId, 
      productId: productId 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found in cart' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Item removed from cart' 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
};

exports.clearCart = async (req, res) => {
  try {
    await CartItem.deleteMany({ userId: req.userId });
    res.status(200).json({ 
      success: true, 
      message: 'Cart cleared' 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
};