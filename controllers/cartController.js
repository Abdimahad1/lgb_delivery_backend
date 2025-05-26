const CartItem = require('../models/CartItem');

// Get user's cart
exports.getUserCart = async (req, res) => {
  try {
    const cartItems = await CartItem.find({ userId: req.userId });
    res.status(200).json({ success: true, data: cartItems });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Add or update cart item
exports.addToCart = async (req, res) => {
  try {
    const { productId, vendorId, title, imagePath, price, quantity, location } = req.body;

    let cartItem = await CartItem.findOne({
      userId: req.userId,
      productId,
      vendorId,
      location
    });

    if (cartItem) {
      cartItem.quantity += quantity;
    } else {
      cartItem = new CartItem({
        userId: req.userId,
        productId,
        vendorId,
        title,
        imagePath,
        price,
        quantity,
        location
      });
    }

    await cartItem.save();
    res.status(200).json({ success: true, message: 'Cart updated', data: cartItem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating cart', error: err.message });
  }
};

// Delete item from cart
// Delete item from cart by productId
exports.deleteCartItemByProduct = async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.userId;
  
      console.log(`Deleting item with productId ${productId} for user ${userId}`);
  
      // First verify the item exists
      const item = await CartItem.findOne({ productId, userId });
      
      if (!item) {
        console.log('Item not found or does not belong to user');
        return res.status(404).json({ 
          success: false, 
          message: 'Item not found in your cart' 
        });
      }
  
      // Delete the item
      const result = await CartItem.deleteOne({ productId, userId });
      
      console.log('Delete result:', result);
      
      if (result.deletedCount === 1) {
        return res.status(200).json({ 
          success: true, 
          message: 'Item removed successfully',
          deletedItemId: item._id // Return the MongoDB _id for reference
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Delete operation completed but no items were deleted' 
      });
    } catch (err) {
      console.error('Delete by productId error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Server error', 
        error: err.message 
      });
    }
  };

// Clear all user cart
exports.clearCart = async (req, res) => {
  try {
    await CartItem.deleteMany({ userId: req.userId });
    res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};