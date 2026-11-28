import pool from "../config/db.js";
import { randomBytes } from "crypto";

// Create a new order
export const createOrder = async (req, res) => {
  const { vehicle_id, items, notes, expected_completion_date } = req.body;

  const vehicleId = Number(vehicle_id);

  if (!Number.isSafeInteger(vehicleId) || vehicleId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "A valid vehicle_id is required",
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "At least one order item is required",
    });
  }

  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return res.status(400).json({
      status: "error",
      message: "Notes must be a string or null",
    });
  }

  if (
    expected_completion_date !== undefined &&
    expected_completion_date !== null &&
    (typeof expected_completion_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expected_completion_date) ||
      (() => {
        const date = new Date(`${expected_completion_date}T00:00:00Z`);

        return (
          Number.isNaN(date.getTime()) ||
          date.toISOString().slice(0, 10) !== expected_completion_date
        );
      })())
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "Expected completion date must be a valid date in YYYY-MM-DD format",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verify that the vehicle exists
    // Verify and lock the vehicle while creating the order
    const [vehicles] = await connection.execute(
      `SELECT id
      FROM vehicles
      WHERE id = ?
      FOR UPDATE`,
      [vehicleId],
    );

    if (vehicles.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Vehicle not found",
      });
    }

    let totalCents = 0;
    const preparedItems = [];

    // Validate and prepare every order item
    for (const item of items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        await connection.rollback();

        return res.status(400).json({
          status: "error",
          message: "Each order item must be a valid object",
        });
      }

      const { item_type, service_id, inventory_id, quantity } = item;

      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        await connection.rollback();

        return res.status(400).json({
          status: "error",
          message: "Each item must have a positive integer quantity",
        });
      }

      let description;
      let unitPriceCents;
      let serviceId = null;
      let inventoryId = null;

      if (item_type === "service") {
        if (
          !Number.isSafeInteger(Number(service_id)) ||
          Number(service_id) <= 0 ||
          (inventory_id !== undefined && inventory_id !== null)
        ) {
          await connection.rollback();

          return res.status(400).json({
            status: "error",
            message: "A service item requires only a valid service_id",
          });
        }

        serviceId = Number(service_id);

        const [services] = await connection.execute(
          `SELECT service_name, price
           FROM services
           WHERE id = ? AND is_active = 1
           FOR UPDATE`,
          [serviceId],
        );

        if (services.length === 0) {
          await connection.rollback();

          return res.status(404).json({
            status: "error",
            message: `Active service ${serviceId} not found`,
          });
        }

        description = services[0].service_name;
        unitPriceCents = Math.round(Number(services[0].price) * 100);
      } else if (item_type === "part") {
        if (
          !Number.isSafeInteger(Number(inventory_id)) ||
          Number(inventory_id) <= 0 ||
          (service_id !== undefined && service_id !== null)
        ) {
          await connection.rollback();

          return res.status(400).json({
            status: "error",
            message: "A part item requires only a valid inventory_id",
          });
        }

        inventoryId = Number(inventory_id);

        const [parts] = await connection.execute(
          `SELECT part_name, unit_price
           FROM inventory
           WHERE id = ?
           FOR UPDATE`,
          [inventoryId],
        );

        if (parts.length === 0) {
          await connection.rollback();

          return res.status(404).json({
            status: "error",
            message: `Inventory item ${inventoryId} not found`,
          });
        }

        description = parts[0].part_name;
        unitPriceCents = Math.round(Number(parts[0].unit_price) * 100);
      } else {
        await connection.rollback();

        return res.status(400).json({
          status: "error",
          message: "item_type must be service or part",
        });
      }

      const subtotalCents = unitPriceCents * quantity;

      if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
        await connection.rollback();

        return res.status(400).json({
          status: "error",
          message: "Invalid item subtotal",
        });
      }

      totalCents += subtotalCents;

      if (!Number.isSafeInteger(totalCents) || totalCents > 9999999999) {
        await connection.rollback();

        return res.status(400).json({
          status: "error",
          message: "Order total exceeds the allowed amount",
        });
      }

      preparedItems.push({
        serviceId,
        inventoryId,
        itemType: item_type,
        description,
        quantity,
        unitPrice: (unitPriceCents / 100).toFixed(2),
        subtotal: (subtotalCents / 100).toFixed(2),
      });
    }

    // Generate a unique order number
    const orderNumber = `ORD-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;

    const totalAmount = (totalCents / 100).toFixed(2);

    // Insert the main order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        order_number,
        vehicle_id,
        total_amount,
        notes,
        expected_completion_date
      )
      VALUES (?, ?, ?, ?, ?)`,
      [
        orderNumber,
        vehicleId,
        totalAmount,
        notes?.trim() || null,
        expected_completion_date ?? null,
      ],
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of preparedItems) {
      await connection.execute(
        `INSERT INTO order_items (
          order_id,
          service_id,
          inventory_id,
          item_type,
          description,
          quantity,
          unit_price,
          subtotal
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.serviceId,
          item.inventoryId,
          item.itemType,
          item.description,
          item.quantity,
          item.unitPrice,
          item.subtotal,
        ],
      );
    }

    await connection.commit();

    return res.status(201).json({
      status: "success",
      message: "Order created successfully",
      order: {
        id: orderId,
        order_number: orderNumber,
        vehicle_id: vehicleId,
        status: "pending",
        total_amount: totalAmount,
        items: preparedItems,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Failed to create order:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Failed to create order",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Get all orders
export const getOrders = async (req, res) => {
  try {
    const sql = `
      SELECT
        o.id,
        o.order_number,
        o.vehicle_id,
        o.status,
        o.total_amount,
        o.notes,
        o.order_date,
        o.expected_completion_date,
        o.completed_at,
        o.created_at,

        v.plate_number,
        v.make,
        v.model,

        c.id AS customer_id,
        c.first_name AS customer_first_name,
        c.last_name AS customer_last_name,
        c.phone AS customer_phone,

        COUNT(oi.id) AS item_count

      FROM orders o

      INNER JOIN vehicles v
        ON o.vehicle_id = v.id

      INNER JOIN customers c
        ON v.customer_id = c.id

      LEFT JOIN order_items oi
        ON o.id = oi.order_id

      GROUP BY
        o.id,
        o.order_number,
        o.vehicle_id,
        o.status,
        o.total_amount,
        o.notes,
        o.order_date,
        o.expected_completion_date,
        o.completed_at,
        o.created_at,
        v.plate_number,
        v.make,
        v.model,
        c.id,
        c.first_name,
        c.last_name,
        c.phone

      ORDER BY o.created_at DESC
    `;

    const [orders] = await pool.execute(sql);

    return res.status(200).json({
      status: "success",
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Failed to fetch orders:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Failed to fetch orders",
    });
  }
};

// Get one order by ID
export const getOrderById = async (req, res) => {
  const orderId = Number(req.params.id);

  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(orderId)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order ID",
    });
  }

  try {
    const [orders] = await pool.execute(
      `SELECT
        o.id,
        o.order_number,
        o.vehicle_id,
        o.status,
        o.total_amount,
        o.notes,
        o.order_date,
        o.expected_completion_date,
        o.completed_at,
        o.created_at,
        o.updated_at,

        v.plate_number,
        v.make,
        v.model,

        c.id AS customer_id,
        c.first_name AS customer_first_name,
        c.last_name AS customer_last_name,
        c.phone AS customer_phone

       FROM orders o

       INNER JOIN vehicles v
         ON o.vehicle_id = v.id

       INNER JOIN customers c
         ON v.customer_id = c.id

       WHERE o.id = ?`,
      [orderId],
    );

    if (orders.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    const [items] = await pool.execute(
      `SELECT
        id,
        order_id,
        item_type,
        service_id,
        inventory_id,
        description,
        quantity,
        unit_price,
        subtotal,
        created_at

       FROM order_items
       WHERE order_id = ?
       ORDER BY id`,
      [orderId],
    );

    return res.status(200).json({
      status: "success",
      order: {
        ...orders[0],
        items,
      },
    });
  } catch (error) {
    console.error("Failed to fetch order:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Failed to fetch order",
    });
  }
};

// Update an existing pending order
export const updateOrder = async (req, res) => {
  const orderId = Number(req.params.id);

  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(orderId)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order ID",
    });
  }

  const { vehicle_id, notes, expected_completion_date } = req.body;

  if (
    vehicle_id === undefined &&
    notes === undefined &&
    expected_completion_date === undefined
  ) {
    return res.status(400).json({
      status: "error",
      message: "At least one field must be provided",
    });
  }

  if (
    vehicle_id !== undefined &&
    (!/^[1-9]\d*$/.test(String(vehicle_id)) ||
      !Number.isSafeInteger(Number(vehicle_id)))
  ) {
    return res.status(400).json({
      status: "error",
      message: "Invalid vehicle_id",
    });
  }

  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return res.status(400).json({
      status: "error",
      message: "Notes must be a string or null",
    });
  }

  if (
    expected_completion_date !== undefined &&
    expected_completion_date !== null &&
    (typeof expected_completion_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expected_completion_date) ||
      (() => {
        const date = new Date(`${expected_completion_date}T00:00:00Z`);

        return (
          Number.isNaN(date.getTime()) ||
          date.toISOString().slice(0, 10) !== expected_completion_date
        );
      })())
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "Expected completion date must be a valid date in YYYY-MM-DD format",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      `SELECT id, status
       FROM orders
       WHERE id = ?
       FOR UPDATE`,
      [orderId],
    );

    if (orders.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    if (orders[0].status !== "pending") {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: "Only pending orders can be updated",
      });
    }

    if (vehicle_id !== undefined) {
      const [vehicles] = await connection.execute(
        "SELECT id FROM vehicles WHERE id = ?",
        [Number(vehicle_id)],
      );

      if (vehicles.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          status: "error",
          message: "Vehicle not found",
        });
      }
    }

    const updates = [];
    const values = [];

    if (vehicle_id !== undefined) {
      updates.push("vehicle_id = ?");
      values.push(Number(vehicle_id));
    }

    if (notes !== undefined) {
      updates.push("notes = ?");
      values.push(notes === null ? null : notes.trim() || null);
    }

    if (expected_completion_date !== undefined) {
      updates.push("expected_completion_date = ?");
      values.push(expected_completion_date);
    }

    values.push(orderId);

    await connection.execute(
      `UPDATE orders
       SET ${updates.join(", ")}
       WHERE id = ?`,
      values,
    );

    await connection.commit();

    const [updatedOrders] = await pool.execute(
      `SELECT *
       FROM orders
       WHERE id = ?`,
      [orderId],
    );

    return res.status(200).json({
      status: "success",
      message: "Order updated successfully",
      order: updatedOrders[0],
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Failed to update order:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Failed to update order",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Update order status and manage inventory stock
export const updateOrderStatus = async (req, res) => {
  const orderId = Number(req.params.id);
  const { status: newStatus } = req.body;

  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(orderId)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order ID",
    });
  }

  const allowedStatuses = ["approved", "in_progress", "completed", "cancelled"];

  if (!allowedStatuses.includes(newStatus)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order status",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock the order to prevent simultaneous status changes
    const [orders] = await connection.execute(
      `SELECT id, order_number, status
       FROM orders
       WHERE id = ?
       FOR UPDATE`,
      [orderId],
    );

    if (orders.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    const order = orders[0];
    const currentStatus = order.status;

    const allowedTransitions = {
      pending: ["approved", "cancelled"],
      approved: ["in_progress", "cancelled"],
      in_progress: ["completed"],
      completed: [],
      cancelled: [],
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: `Cannot change order status from ${currentStatus} to ${newStatus}`,
      });
    }

    // Retrieve order spare parts
    const [parts] = await connection.execute(
      `SELECT
        inventory_id,
        SUM(quantity) AS total_quantity
       FROM order_items
       WHERE order_id = ?
         AND item_type = 'part'
       GROUP BY inventory_id
       ORDER BY inventory_id`,
      [orderId],
    );

    // Deduct stock when approving an order
    if (newStatus === "approved") {
      for (const part of parts) {
        const [inventory] = await connection.execute(
          `SELECT id, part_name, quantity
           FROM inventory
           WHERE id = ?
           FOR UPDATE`,
          [part.inventory_id],
        );

        if (inventory.length === 0) {
          throw new Error(
            `Inventory item ${part.inventory_id} no longer exists`,
          );
        }

        const requiredQuantity = Number(part.total_quantity);
        const previousQuantity = Number(inventory[0].quantity);

        if (previousQuantity < requiredQuantity) {
          await connection.rollback();

          return res.status(400).json({
            status: "error",
            message: `Insufficient stock for ${inventory[0].part_name}. Available: ${previousQuantity}, required: ${requiredQuantity}`,
          });
        }

        const newQuantity = previousQuantity - requiredQuantity;

        await connection.execute(
          `UPDATE inventory
           SET quantity = ?
           WHERE id = ?`,
          [newQuantity, part.inventory_id],
        );

        await connection.execute(
          `INSERT INTO stock_movements (
            inventory_id,
            order_id,
            movement_type,
            quantity,
            previous_quantity,
            new_quantity,
            reason,
            performed_by
          )
          VALUES (?, ?, 'stock_out', ?, ?, ?, ?, ?)`,
          [
            part.inventory_id,
            orderId,
            requiredQuantity,
            previousQuantity,
            newQuantity,
            `Approved order ${order.order_number}`,
            req.user.id,
          ],
        );
      }
    }

    // Restore stock when cancelling an approved or in-progress order
   if (newStatus === "cancelled" && currentStatus === "approved") {
     for (const part of parts) {
       const [inventory] = await connection.execute(
         `SELECT id, quantity
           FROM inventory
           WHERE id = ?
           FOR UPDATE`,
         [part.inventory_id],
       );

       if (inventory.length === 0) {
         throw new Error(
           `Inventory item ${part.inventory_id} no longer exists`,
         );
       }

       const restoredQuantity = Number(part.total_quantity);
       const previousQuantity = Number(inventory[0].quantity);

       const newQuantity = previousQuantity + restoredQuantity;

       if (
         !Number.isSafeInteger(newQuantity) ||
         newQuantity < 0 ||
         newQuantity > 2147483647
       ) {
         throw new Error(
           "Restored inventory quantity exceeds the allowed database limit",
         );
       }

       await connection.execute(
         `UPDATE inventory
           SET quantity = ?
           WHERE id = ?`,
         [newQuantity, part.inventory_id],
       );

       await connection.execute(
         `INSERT INTO stock_movements (
            inventory_id,
            order_id,
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
           orderId,
           restoredQuantity,
           previousQuantity,
           newQuantity,
           `Cancelled order ${order.order_number}`,
           req.user.id,
         ],
       );
     }
   }

    // Update the order status
    if (newStatus === "completed") {
      await connection.execute(
        `UPDATE orders
         SET status = ?, completed_at = NOW()
         WHERE id = ?`,
        [newStatus, orderId],
      );
    } else {
      await connection.execute(
        `UPDATE orders
         SET status = ?
         WHERE id = ?`,
        [newStatus, orderId],
      );
    }

    await connection.commit();

    return res.status(200).json({
      status: "success",
      message: "Order status updated successfully",
      order: {
        id: orderId,
        order_number: order.order_number,
        previous_status: currentStatus,
        status: newStatus,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Failed to update order status:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Failed to update order status",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
