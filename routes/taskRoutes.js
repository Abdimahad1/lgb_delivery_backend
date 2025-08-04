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
        message: "Missing required order information" 
      });
    }

    // Check for active tasks (only Pending or Accepted status)
    const activeTasks = await AssignedTask.find({
      deliveryPersonId,
      status: { $in: ['Pending', 'Accepted'] }
    });

    // Check if already has THIS EXACT order assigned (prevent duplicates)
    const hasSameOrder = activeTasks.some(task => task.orderId === order.orderId);
    if (hasSameOrder) {
      return res.status(409).json({
        success: false,
        message: "This order is already assigned to the delivery person",
        code: "DUPLICATE_ORDER"
      });
    }

    // Check if has any active tasks (regardless of product)
    if (activeTasks.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Delivery person already has active tasks",
        code: "HAS_ACTIVE_TASKS",
        data: {
          activeTaskCount: activeTasks.length,
          // Only include minimal task info
          activeTasks: activeTasks.map(t => ({
            product: t.product,
            status: t.status,
            assignedAt: t.assignedAt
          }))
        }
      });
    }

    // Verify the order exists
    const payment = await Payment.findById(order.orderId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Order not found in system",
        code: "ORDER_NOT_FOUND"
      });
    }

    // Create new task
    const newTask = await AssignedTask.create({
      deliveryPersonId,
      vendorId: req.userId,
      orderId: order.orderId,
      product: order.product,
      customer: order.customer,
      address: order.address,
      customerId: payment.userId,
      status: 'Pending',
      assignedAt: new Date()
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Task assigned successfully",
      data: {
        taskId: newTask._id,
        product: newTask.product,
        assignedAt: newTask.assignedAt
      }
    });

  } catch (err) {
    console.error("Assignment error:", err);
    
    // Handle specific error cases
    if (err.name === 'MongoError' && err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This task assignment already exists",
        code: "DUPLICATE_ASSIGNMENT"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during assignment",
      code: "INTERNAL_ERROR",
      systemMessage: err.message
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
