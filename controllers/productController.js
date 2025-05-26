const Product = require('../models/Product');
const Uri = require('uri-js');

// Helper function to validate image URLs
function isValidImageUrl(url) {
  // Special case for Google image URLs
  if (url.includes('gstatic.com')) return true;
  
  try {
    const parsed = Uri.parse(url);
    return parsed.scheme && (parsed.scheme === 'http' || parsed.scheme === 'https');
  } catch (e) {
    return false;
  }
}

// Create Product
exports.createProduct = async (req, res) => {
  try {
    const { name, description, quantity, price, image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image is required'
      });
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0.25) {
      return res.status(400).json({
        success: false,
        message: 'Price must be at least 0.25 and valid'
      });
    }

    const product = new Product({
      vendorId: req.userId,
      name,
      description,
      quantity: parseInt(quantity) || 0,
      price: numericPrice,
      image
    });

    await product.save();

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// Get Random Products
exports.getRandomProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 7;
    const products = await Product.aggregate([
      { $sample: { size: limit } },
      {
        $lookup: {
          from: 'profiles',
          localField: 'vendorId',
          foreignField: 'userId',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },
      {
        $project: {
          name: 1,
          description: 1,
          price: 1,
          image: 1,
          vendorId: 1,
          vendorName: '$vendor.shopName',
          vendorAddress: '$vendor.address'
        }
      }
    ]);

    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get All Products from All Vendors (with vendor details)
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $lookup: {
          from: 'profiles',
          localField: 'vendorId',
          foreignField: 'userId',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },
      {
        $project: {
          name: 1,
          description: 1,
          price: 1,
          image: 1,
          vendorId: 1,
          vendorName: '$vendor.shopName',
          vendorAddress: '$vendor.address'
        }
      }
    ]);

    res.status(200).json({ success: true, data: products });
  } catch (err) {
    console.error('Error getting all products:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get All Products for Vendor
exports.getVendorProducts = async (req, res) => {
  try {
    const products = await Product.find({ vendorId: req.userId });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// Update Product
exports.updateProduct = async (req, res) => {
  try {
    const { price } = req.body;

    if (price !== undefined) {
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice < 0.25) {
        return res.status(400).json({
          success: false,
          message: 'Price must be at least 0.25 and valid'
        });
      }
      req.body.price = numericPrice;
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, vendorId: req.userId },
      req.body,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      vendorId: req.userId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};