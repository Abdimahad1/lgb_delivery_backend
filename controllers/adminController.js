const User = require('../models/User');
const Payment = require('../models/Payment');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// GET /admin/total-users
exports.getTotalUsers = async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.status(200).json({ success: true, totalUsers: count || 0 });
  } catch (err) {
    console.error('Error getting total users:', err);
    res.status(500).json({ success: false, message: 'Failed to get total users', totalUsers: 0 });
  }
};

// GET /admin/total-orders
exports.getTotalOrders = async (req, res) => {
  try {
    const count = await Payment.countDocuments();
    res.status(200).json({ success: true, totalOrders: count || 0 });
  } catch (err) {
    console.error('Error getting total orders:', err);
    res.status(500).json({ success: false, message: 'Failed to get total orders', totalOrders: 0 });
  }
};

// GET /admin/total-successful-payments
exports.getTotalSuccessfulPayments = async (req, res) => {
  try {
    const count = await Payment.countDocuments({ status: 'success' });
    res.status(200).json({ success: true, totalSuccessfulPayments: count || 0 });
  } catch (err) {
    console.error('Error getting successful payments:', err);
    res.status(500).json({ success: false, message: 'Failed to get successful payments', totalSuccessfulPayments: 0 });
  }
};

// GET /admin/recent-transactions
exports.getRecentTransactions = async (req, res) => {
  try {
    const transactions = await Payment.find({ status: 'success' })
      .sort({ timestamp: -1 })
      .limit(5)
      .populate({ path: 'userId', select: 'name email' })
      .lean();

    const enriched = transactions.map(txn => ({
      ...txn,
      customerName: txn.userId?.name || txn.userId?.email || 'N/A'
    }));

    res.status(200).json({ success: true, recentTransactions: enriched });
  } catch (err) {
    console.error('Error getting recent transactions:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch recent transactions', recentTransactions: [] });
  }
};

// GET /admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().lean();
    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
};

// POST /admin/users
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone: "0000000000" // default phone if not provided
    });

    res.status(201).json({ success: true, message: 'User created successfully', user: newUser });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

// PATCH /admin/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const updated = await User.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User updated', user: updated });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

// DELETE /admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

// GET /admin/report
exports.getReportData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required' });
    }

    // Convert dates to JS Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // include the full end day

    // Sample aggregations (replace with actual models and logic as needed)
    const totalRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'success',
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    const totalOrders = await Payment.countDocuments({
      status: 'success',
      timestamp: { $gte: start, $lte: end }
    });

    const newUsers = await User.countDocuments({
      createdAt: { $gte: start, $lte: end }
    });

    res.status(200).json({
      success: true,
      totalRevenue: totalRevenue[0]?.revenue || 0,
      revenueChange: 7, 
      totalOrders,
      orderChange: 5,   
      newUsers,
      userChange: -2,   
      topProducts: [],  
      userActivity: []  
    });
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};

// POST /admin/generate-report-pdf
exports.generateReportPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required' });
    }

    // Generate a unique filename
    const filename = `report_${Date.now()}.pdf`;
    const reportsDir = path.join(__dirname, '../temp-reports');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }

    const filePath = path.join(reportsDir, filename);

    // Create PDF document
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    // Add content to PDF
    doc.fontSize(20).text('Analytics Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`);
    doc.moveDown();

    // Get report data (similar to getReportData but formatted for PDF)
    const reportData = await this.getReportDataForPDF(startDate, endDate);

    // Add report data to PDF
    doc.fontSize(16).text('Summary Statistics', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total Revenue: $${reportData.totalRevenue.toFixed(2)}`);
    doc.text(`Total Orders: ${reportData.totalOrders}`);
    doc.text(`New Users: ${reportData.newUsers}`);
    doc.moveDown();

    // Add charts or tables as needed
    // ... (additional PDF formatting)

    doc.end();

    res.status(200).json({ 
      success: true, 
      message: 'PDF generated successfully',
      filename 
    });

  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

// Helper function to get data formatted for PDF
exports.getReportDataForPDF = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const totalRevenue = await Payment.aggregate([
    {
      $match: {
        status: 'success',
        timestamp: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$amount' }
      }
    }
  ]);

  const totalOrders = await Payment.countDocuments({
    status: 'success',
    timestamp: { $gte: start, $lte: end }
  });

  const newUsers = await User.countDocuments({
    createdAt: { $gte: start, $lte: end }
  });

  return {
    totalRevenue: totalRevenue[0]?.revenue || 0,
    totalOrders,
    newUsers
  };
};

// GET /admin/download-report-pdf
exports.downloadReportPDF = async (req, res) => {
  try {
    const { filename } = req.query;
    const reportsDir = path.join(__dirname, '../temp-reports');
    const filePath = path.join(reportsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Clean up file after download
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp PDF:', err);
      });
    });

  } catch (err) {
    console.error('Error downloading PDF:', err);
    res.status(500).json({ success: false, message: 'Failed to download PDF' });
  }
};
