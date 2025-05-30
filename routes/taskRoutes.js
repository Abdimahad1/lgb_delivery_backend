const express = require('express');
const router = express.Router();
const AssignedTask = require('../models/AssignedTask');
const auth = require('../middlewares/authMiddleware');

router.post('/assign', auth, async (req, res) => {
  try {
    const { deliveryPersonId, order } = req.body;

    if (!deliveryPersonId || !order || !order.product || !order.address) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    const task = await AssignedTask.create({
      deliveryPersonId,
      vendorId: req.userId,
      orderId: order.orderId,
      product: order.product,
      customer: order.customer,
      address: order.address,
    });

    res.status(200).json({ success: true, message: "Task assigned", data: task });
  } catch (err) {
    console.error("❌ Assign task error:", err);
    res.status(500).json({ success: false, message: "Failed to assign task" });
  }
});

router.get('/my-tasks', auth, async (req, res) => {
  try {
    const deliveryPersonId = req.userId; // Coming from auth middleware
    const tasks = await AssignedTask.find({ deliveryPersonId });

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    console.error("❌ Fetch tasks error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tasks" });
  }
});

router.patch('/update/:taskId', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Accepted', 'Rejected', 'Pending'].includes(status)) {
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


module.exports = router;
