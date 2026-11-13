import pool from "../config/db.js";

// Issue parts to a service job
export const issuePartsToServiceJob = async (req, res) => {
  const { service_job_id, inventory_id, quantity } = req.body;

  // 1. Validate service job ID
  if (!Number.isSafeInteger(service_job_id) || service_job_id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Valid service job ID is required",
    });
  }

  // 2. Validate inventory ID
  if (!Number.isSafeInteger(inventory_id) || inventory_id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Valid inventory ID is required",
    });
  }

  // 3. Validate quantity
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Quantity must be a positive integer",
    });
  }

  // 4. Check user authorization
  const { id: userId, role } = req.user;

  if (!["admin", "receptionist", "mechanic"].includes(role)) {
    return res.status(403).json({
      status: "error",
      message: "You are not authorized to issue parts",
    });
  }

  let connection;

  try {
    // 5. Get database connection
    connection = await pool.getConnection();

    // 6. Start transaction
    await connection.beginTransaction();

    // 7. Find and lock service job
    const [jobs] = await connection.query(
      `SELECT id, status, assigned_mechanic_id
       FROM service_jobs
       WHERE id = ?
       FOR UPDATE`,
      [service_job_id],
    );

    if (jobs.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Service job not found",
      });
    }

    const serviceJob = jobs[0];

    // 8. Verify mechanic assignment
    if (role === "mechanic" && serviceJob.assigned_mechanic_id !== userId) {
      await connection.rollback();

      return res.status(403).json({
        status: "error",
        message: "You can only issue parts to your assigned service jobs",
      });
    }

    // 9. Prevent issuing parts to completed or cancelled jobs
    if (["completed", "cancelled"].includes(serviceJob.status)) {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: "Parts cannot be issued to completed or cancelled jobs",
      });
    }

    // 10. Find and lock inventory item
    const [inventoryItems] = await connection.query(
      `SELECT id, part_name, quantity, unit_price
       FROM inventory
       WHERE id = ?
       FOR UPDATE`,
      [inventory_id],
    );

    if (inventoryItems.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Inventory item not found",
      });
    }

    const inventoryItem = inventoryItems[0];

    // 11. Check available stock
    if (inventoryItem.quantity < quantity) {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: "Insufficient inventory stock",
        available_quantity: inventoryItem.quantity,
        requested_quantity: quantity,
      });
    }

    const previousQuantity = inventoryItem.quantity;
    const newQuantity = previousQuantity - quantity;

    // 12. Record part usage on service job
    const [partResult] = await connection.query(
      `INSERT INTO service_job_parts
       (service_job_id, inventory_id, quantity, unit_price, issued_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        service_job_id,
        inventory_id,
        quantity,
        inventoryItem.unit_price,
        userId,
      ],
    );

    // 13. Update inventory quantity
    await connection.query(
      `UPDATE inventory
       SET quantity = ?
       WHERE id = ?`,
      [newQuantity, inventory_id],
    );

    // 14. Record stock movement
    await connection.query(
      `INSERT INTO stock_movements
       (
         inventory_id,
         service_job_id,
         movement_type,
         quantity,
         previous_quantity,
         new_quantity,
         reason,
         performed_by
       )
       VALUES (?, ?, 'stock_out', ?, ?, ?, ?, ?)`,
      [
        inventory_id,
        service_job_id,
        quantity,
        previousQuantity,
        newQuantity,
        `Parts issued to service job #${service_job_id}`,
        userId,
      ],
    );

    // 15. Commit transaction
    await connection.commit();

    return res.status(201).json({
      status: "success",
      message: "Parts issued to service job successfully",
      data: {
        service_job_part_id: partResult.insertId,
        service_job_id,
        inventory_id,
        part_name: inventoryItem.part_name,
        quantity_issued: quantity,
        unit_price: inventoryItem.unit_price,
        previous_stock: previousQuantity,
        remaining_stock: newQuantity,
        issued_by: userId,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Issue parts error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to issue parts to service job",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Get all parts used on a service job

// Get all parts used on a service job
export const getPartsUsedOnServiceJob = async (req, res) => {
  const jobId = Number(req.params.jobId);

  // 1. Validate service job ID
  if (!Number.isSafeInteger(jobId) || jobId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Valid service job ID is required",
    });
  }

  // 2. Check authorization
  const { id: userId, role } = req.user;

  if (!["admin", "receptionist", "mechanic"].includes(role)) {
    return res.status(403).json({
      status: "error",
      message: "You are not authorized to view service job parts",
    });
  }

  try {
    // 3. Check whether service job exists
    const [jobs] = await pool.execute(
      `SELECT id, assigned_mechanic_id
       FROM service_jobs
       WHERE id = ?`,
      [jobId]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Service job not found",
      });
    }

    // 4. Check mechanic assignment
    if (
      role === "mechanic" &&
      Number(jobs[0].assigned_mechanic_id) !== Number(userId)
    ) {
      return res.status(403).json({
        status: "error",
        message: "You can only view parts for your assigned service jobs",
      });
    }

    // 5. Get parts used on this service job
    const [parts] = await pool.execute(
      `SELECT
         sjp.id,
         sjp.service_job_id,
         sjp.inventory_id,
         i.part_name,
         i.part_number,
         sjp.quantity,
         sjp.returned_quantity,
         (sjp.quantity - sjp.returned_quantity) AS remaining_issued_quantity,
         sjp.unit_price,
         sjp.issued_by,
         sjp.created_at
       FROM service_job_parts sjp
       INNER JOIN inventory i
         ON sjp.inventory_id = i.id
       WHERE sjp.service_job_id = ?
       ORDER BY sjp.created_at DESC`,
      [jobId]
    );

    // 6. Return results
    return res.status(200).json({
      status: "success",
      service_job_id: jobId,
      count: parts.length,
      parts,
    });

  } catch (error) {
    console.error("Get service job parts error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve service job parts",
    });
  }
};


// Return issued parts from a service job
export const returnPartsFromServiceJob = async (req, res) => {
  const partId = Number(req.params.id);
  const { quantity } = req.body;

  // 1. Validate service job part ID
  if (!Number.isSafeInteger(partId) || partId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Valid service job part ID is required",
    });
  }

  // 2. Validate return quantity
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Return quantity must be a positive integer",
    });
  }

  // 3. Only admin and receptionist can return parts
  const { id: userId, role } = req.user;

  if (!["admin", "receptionist"].includes(role)) {
    return res.status(403).json({
      status: "error",
      message: "You are not authorized to return parts",
    });
  }

  let connection;

  try {
    // 4. Get database connection
    connection = await pool.getConnection();

    // 5. Start transaction
    await connection.beginTransaction();

    // 6. Find and lock issued part record
    const [parts] = await connection.query(
      `SELECT
         id,
         service_job_id,
         inventory_id,
         quantity,
         returned_quantity
       FROM service_job_parts
       WHERE id = ?
       FOR UPDATE`,
      [partId]
    );

    if (parts.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Issued service job part not found",
      });
    }

    const part = parts[0];

    const remainingQuantity =
      part.quantity - part.returned_quantity;

    // 7. Check outstanding quantity
    if (quantity > remainingQuantity) {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: "Return quantity exceeds outstanding issued quantity",
        outstanding_quantity: remainingQuantity,
        requested_return_quantity: quantity,
      });
    }

    // 8. Find and lock inventory item
    const [inventoryItems] = await connection.query(
      `SELECT id, part_name, quantity
       FROM inventory
       WHERE id = ?
       FOR UPDATE`,
      [part.inventory_id]
    );

    if (inventoryItems.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Inventory item not found",
      });
    }

    const inventoryItem = inventoryItems[0];

    const previousQuantity = inventoryItem.quantity;
    const newQuantity = previousQuantity + quantity;

    const newReturnedQuantity =
      part.returned_quantity + quantity;

    // 9. Update returned quantity
    await connection.query(
      `UPDATE service_job_parts
       SET returned_quantity = ?
       WHERE id = ?`,
      [newReturnedQuantity, partId]
    );

    // 10. Restore inventory stock
    await connection.query(
      `UPDATE inventory
       SET quantity = ?
       WHERE id = ?`,
      [newQuantity, part.inventory_id]
    );

    // 11. Record stock movement
    await connection.query(
      `INSERT INTO stock_movements
       (
         inventory_id,
         service_job_id,
         movement_type,
         quantity,
         previous_quantity,
         new_quantity,
         reason,
         performed_by
       )
       VALUES (?, ?, 'stock_in', ?, ?, ?, ?, ?)`,
      [
        part.inventory_id,
        part.service_job_id,
        quantity,
        previousQuantity,
        newQuantity,
        `Parts returned from service job #${part.service_job_id}`,
        userId,
      ]
    );

    // 12. Commit transaction
    await connection.commit();

    return res.status(200).json({
      status: "success",
      message: "Parts returned successfully",
      data: {
        service_job_part_id: partId,
        service_job_id: part.service_job_id,
        inventory_id: part.inventory_id,
        part_name: inventoryItem.part_name,
        quantity_returned: quantity,
        total_returned_quantity: newReturnedQuantity,
        remaining_issued_quantity:
          part.quantity - newReturnedQuantity,
        previous_stock: previousQuantity,
        new_stock: newQuantity,
        returned_by: userId,
      },
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Return service job parts error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to return service job parts",
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
};
