const express = require('express');
const router = express.Router();
const AssignedTask = require('../models/AssignedTask');
const Payment = require('../models/Payment'); // ✅ Needed to fetch customerId
const auth = require('../middlewares/authMiddleware');
const paymentController = require('../controllers/paymentController');

// 🔐 Enhanced Assign Task Endpoint
router.post('/assign', auth, async (req, res) => {
  try {
    const { deliveryPersonId, order } = req.body;

    // Validate required fields
    if (!deliveryPersonId || !order || !order.product || !order.address || !order.orderId) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required data. Please provide all necessary order details." 
      });
    }

    // ✅ Check for existing active tasks (including same product)
    const activeTasks = await AssignedTask.find({
      deliveryPersonId,
      status: { $in: ['Pending', 'Accepted'] }
    }).lean();

    // Check if already has this product assigned in active tasks
    const hasSameProduct = activeTasks.some(task => 
      task.product === order.product && 
      task.orderId !== order.orderId
    );

    if (hasSameProduct) {
      return res.status(409).json({
        success: false,
        message: "This delivery person already has an active task for the same product",
        code: "DUPLICATE_PRODUCT"
      });
    }

    // Check if has any active tasks (regardless of product)
    if (activeTasks.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This delivery person already has active tasks",
        code: "HAS_ACTIVE_TASKS",
        activeTasks: activeTasks.map(task => ({
          orderId: task.orderId,
          product: task.product,
          status: task.status
        }))
      });
    }

    // ✅ Verify the order exists and get customer info
    const payment = await Payment.findById(order.orderId).lean();
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
        code: "ORDER_NOT_FOUND"
      });
    }

    if (!payment.userId) {
      return res.status(400).json({
        success: false,
        message: "Customer information missing from order",
        code: "MISSING_CUSTOMER"
      });
    }

    // ✅ Create the assigned task
    const task = await AssignedTask.create({
      deliveryPersonId,
      vendorId: req.userId,
      orderId: order.orderId,
      product: order.product,
      customer: order.customer,
      address: order.address,
      customerId: payment.userId,
      status: 'Pending',
      assignedAt: new Date(),
      locationHistory: [{
        timestamp: new Date(),
        status: 'Assigned',
        location: order.address
      }]
    });

    // Emit real-time update
    io.emit(`task-update-${deliveryPersonId}`, {
      event: 'new-assignment',
      task: task
    });

    res.status(200).json({ 
      success: true, 
      message: "Task assigned successfully", 
      data: task,
      assignedAt: task.assignedAt
    });

  } catch (err) {
    console.error("❌ Assign task error:", err);
    
    // Handle specific MongoDB errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation failed: " + Object.values(err.errors).map(e => e.message).join(', '),
        code: "VALIDATION_ERROR"
      });
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This task assignment already exists",
        code: "DUPLICATE_ASSIGNMENT"
      });
    }

    res.status(500).json({ 
      success: false, 
      message: "Internal server error while assigning task",
      code: "INTERNAL_ERROR"
    });
  }
});

// 📦 Get all tasks for current delivery person
router.get('/my-tasks', auth, async (req, res) => {
  try {
    const deliveryPersonId = req.userId;
    const tasks = await AssignedTask.find({ deliveryPersonId }).lean();
    res.status(200).json({ success: true, data: tasks });
  } catch (err) {
    console.error("❌ Fetch tasks error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tasks" });
  }
});

// 📥 Get all assigned tasks (admin/vendor)
router.get('/all', auth, async (req, res) => {
  try {
    const tasks = await AssignedTask.find().lean();
    res.status(200).json({ success: true, data: tasks });
  } catch (err) {
    console.error("❌ Fetch all tasks error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch all tasks" });
  }
});

// ✅ General status update (includes Delivered now)
router.patch('/update/:taskId', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Accepted', 'Rejected', 'Pending', 'Delivered'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updated = await AssignedTask.findByIdAndUpdate(
      req.params.taskId,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(200).json({ success: true, message: 'Task updated', data: updated });
  } catch (err) {
    console.error("❌ Update task error:", err);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
});

// ✅ Specific route to mark task as delivered
router.patch('/mark-delivered/:taskId', auth, async (req, res) => {
  try {
    const updated = await AssignedTask.findByIdAndUpdate(
      req.params.taskId,
      { status: 'Delivered' },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(200).json({ success: true, message: 'Marked as delivered', data: updated });
  } catch (err) {
    console.error("❌ Delivery status error:", err);
    res.status(500).json({ success: false, message: 'Failed to mark as delivered' });
  }
});

// 🗑 Delete task
router.delete('/:taskId', auth, async (req, res) => {
  try {
    const { taskId } = req.params;

    const deleted = await AssignedTask.findByIdAndDelete(taskId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(200).json({ success: true, message: 'Task unassigned/deleted' });
  } catch (err) {
    console.error("❌ Delete task error:", err);
    res.status(500).json({ success: false, message: 'Failed to unassign task' });
  }
});

// 🆕 Vendor orders with delivery info
router.get('/vendor-orders', auth, paymentController.getVendorOrdersWithDeliveryStatus);

module.exports = router;
