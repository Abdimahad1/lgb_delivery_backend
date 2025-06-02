const express = require('express');
const router = express.Router();
const AssignedTask = require('../models/AssignedTask');
const Payment = require('../models/Payment'); // ✅ Needed to fetch customerId
const auth = require('../middlewares/authMiddleware');
const paymentController = require('../controllers/paymentController');

// 🔐 Assign task to delivery person
router.post('/assign', auth, async (req, res) => {
  try {
    const { deliveryPersonId, order } = req.body;

    if (!deliveryPersonId || !order || !order.product || !order.address || !order.orderId) {
      return res.status(400).json({ success: false, message: "Missing required data" });
    }

    // ✅ Check if already assigned to same product
    const alreadyAssigned = await AssignedTask.findOne({
      deliveryPersonId,
      product: order.product,
    });

    if (alreadyAssigned) {
      return res.status(409).json({
        success: false,
        message: "This delivery person already has this product assigned",
      });
    }

    // ✅ Check for existing active task
    const hasActiveTask = await AssignedTask.exists({
      deliveryPersonId,
      status: { $in: ['Pending', 'Accepted'] },
    });

    if (hasActiveTask) {
      return res.status(409).json({
        success: false,
        message: "This delivery person already has an active task",
      });
    }

    // ✅ Fetch the order/payment to get customerId
    const payment = await Payment.findById(order.orderId).lean();

    if (!payment || !payment.userId) {
      return res.status(404).json({
        success: false,
        message: "Customer for this order not found",
      });
    }

    // ✅ Create the assigned task with customerId included
    const task = await AssignedTask.create({
      deliveryPersonId,
      vendorId: req.userId,
      orderId: order.orderId,
      product: order.product,
      customer: order.customer,
      address: order.address,
      customerId: payment.userId, // ✅ Now properly included
    });

    res.status(200).json({ success: true, message: "Task assigned", data: task });
  } catch (err) {
    console.error("❌ Assign task error:", err);
    res.status(500).json({ success: false, message: "Failed to assign task" });
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
