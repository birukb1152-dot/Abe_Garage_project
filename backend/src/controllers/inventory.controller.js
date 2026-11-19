import pool from "../config/db.js";

// Get all inventory items
export const getInventory = async (req, res) => {
  try {
    const sql = `
      SELECT
        i.id,
        i.part_name,
        i.part_number,
        i.description,
        i.quantity,
        i.unit_price,
        i.supplier_id,
        s.supplier_name,
        i.created_at,
        i.updated_at
      FROM inventory i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      ORDER BY i.id
    `;

    const [rows] = await pool.execute(sql);

    res.status(200).json({
      status: "ok",
      count: rows.length,
      inventory: rows,
    });
  } catch (error) {
    console.error("Failed to fetch inventory:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch inventory",
    });
  }
};

// Get one inventory item by ID
export const getInventoryById = async (req, res) => {
  const id = Number(req.params.id);

  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid inventory ID",
    });
  }

  try {
    const sql = `
      SELECT
        i.id,
        i.part_name,
        i.part_number,
        i.description,
        i.quantity,
        i.unit_price,
        i.supplier_id,
        s.supplier_name,
        i.created_at,
        i.updated_at
      FROM inventory i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.id = ?
    `;

    const [rows] = await pool.execute(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Inventory item not found",
      });
    }

    res.status(200).json({
      status: "ok",
      inventory: rows[0],
    });
  } catch (error) {
    console.error("Failed to get inventory item:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to get inventory item",
    });
  }
};

// Create a new inventory item
export const createInventory = async (req, res) => {
  const {
    part_name,
    part_number,
    description,
    quantity,
    unit_price,
    supplier_id,
  } = req.body;

  // Validate required fields
  if (
    typeof part_name !== "string" ||
    !part_name.trim() ||
    typeof part_number !== "string" ||
    !part_number.trim()
  ) {
    return res.status(400).json({
      status: "error",
      message: "Part name and part number are required",
    });
  }

  if (part_name.trim().length > 150 || part_number.trim().length > 100) {
    return res.status(400).json({
      status: "error",
      message: "Part name or part number exceeds the maximum length",
    });
  }

  // Validate quantity
  if (
    quantity !== undefined &&
    (!Number.isSafeInteger(quantity) || quantity < 0)
  ) {
    return res.status(400).json({
      status: "error",
      message: "Quantity must be a non-negative integer",
    });
  }

  // Validate unit price
  if (
    unit_price !== undefined &&
    (typeof unit_price !== "number" ||
      !Number.isFinite(unit_price) ||
      unit_price < 0 ||
      !/^\d{1,8}(\.\d{1,2})?$/.test(String(unit_price)))
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "Unit price must be a non-negative number with up to 2 decimal places",
    });
  }

  // Validate supplier ID
  if (
    supplier_id !== undefined &&
    supplier_id !== null &&
    (!Number.isSafeInteger(supplier_id) || supplier_id <= 0)
  ) {
    return res.status(400).json({
      status: "error",
      message: "Invalid supplier ID",
    });
  }

  try {
    // Check supplier exists
    if (supplier_id !== undefined && supplier_id !== null) {
      const [suppliers] = await pool.execute(
        "SELECT id FROM suppliers WHERE id = ?",
        [supplier_id],
      );

      if (suppliers.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Supplier not found",
        });
      }
    }

    const sql = `
      INSERT INTO inventory
      (part_name, part_number, description, quantity, unit_price, supplier_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      part_name.trim(),
      part_number.trim(),
      description ?? null,
      quantity ?? 0,
      unit_price ?? 0,
      supplier_id ?? null,
    ];

    const [result] = await pool.execute(sql, values);

    res.status(201).json({
      status: "ok",
      message: "Inventory item created successfully",
      inventory: {
        id: result.insertId,
        part_name: part_name.trim(),
        part_number: part_number.trim(),
        description: description ?? null,
        quantity: quantity ?? 0,
        unit_price: unit_price ?? 0,
        supplier_id: supplier_id ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to create inventory item:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "Part number already exists",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to create inventory item",
    });
  }
};

// Update an inventory item
export const updateInventory = async (req, res) => {
  let connection ;
  try{
    connection = await pool.getConnection();
    const {id} = req.params;

    const {
    part_name,
    part_number,
    description,
    quantity,
    unit_price,
    supplier_id,
  } = req.body;


  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid inventory ID",
    });
  }

if (
    quantity !== undefined
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "Stock quantity cannot be changed here. Use the stock adjustment endpoint.",
    });
  }

  await connection.beginTransaction();

  const [items] = await connection.execute(
    `SELECT * FROM inventory WHERE id = ? FOR UPDATE`,
    [id]
  );

  if (items.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Inventory item not found",
      });
    }

const existing = items[0];

const updatedPartName = 
part_name === undefined ? existing.part_name : part_name;

const updatedPartNumber = 
part_number === undefined ? existing.part_number : part_number;

const updatedDescription = 
description === undefined ? existing.description : description;

const updatedUnitPrice =
unit_price === undefined ? existing.unit_price : unit_price;

const updatedSupplierId =
supplier_id === undefined ? existing.supplier_id : supplier_id;


  if (
    typeof updatedPartName !== "string" ||
    !updatedPartName.trim() 
  ) {

    await connection.rollback();

    return res.status(400).json({
      status: "error",
      message: "Part name must be a non-empty string",
    });
  }

 if (
      typeof updatedPartNumber !== "string" ||
      !updatedPartNumber.trim()
    ) {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: "Part number must be a non-empty string",
      });
    }

if (
      updatedDescription !== null &&
      updatedDescription !== undefined &&
      typeof updatedDescription !== "string"
    ) {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: "Description must be a string or null",
      });
    }

if (
      !Number.isFinite(Number(updatedUnitPrice)) ||
      Number(updatedUnitPrice) < 0
    ) {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: "Unit price must be a non-negative number",
      });
    }


    if (
      updatedSupplierId !== null &&
      (!Number.isInteger(Number(updatedSupplierId)) ||
        Number(updatedSupplierId) <= 0)
    ) {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: "Invalid supplier ID",
      });
    }


     if (updatedSupplierId !== null) {
      const [suppliers] = await connection.execute(
        "SELECT id FROM suppliers WHERE id = ?",
        [updatedSupplierId]
      );

      if (suppliers.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          status: "error",
          message: "Supplier not found",
        });
      }
    }


    await connection.execute(
      `UPDATE inventory
       SET part_name = ?,
           part_number = ?,
           description = ?,
           unit_price = ?,
           supplier_id = ?
       WHERE id = ?`,
      [
        updatedPartName.trim(),
        updatedPartNumber.trim(),
        updatedDescription,
        Number(updatedUnitPrice),
        updatedSupplierId,
        id,
      ]
    );

    await connection.commit();

    return res.status(200).json({
      status: "success",
      message: "Inventory item updated successfully",
      data: {
        id: Number(id),
        part_name: updatedPartName.trim(),
        part_number: updatedPartNumber.trim(),
        description: updatedDescription,
        quantity: existing.quantity,
        unit_price: Number(updatedUnitPrice),
        supplier_id: updatedSupplierId,
      },
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "Part number already exists",
      });
    }

    console.error("Update inventory error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to update inventory item",
    });
  } finally {
    if(connection){
      connection.release();
    }
  }
};

// Update inventory stock
export const updateInventoryStock = async (req, res) => {
  const id = Number(req.params.id);
  const { quantity, reason } = req.body;

  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid inventory ID",
    });
  }

  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    return res.status(400).json({
      status: "error",
      message: "Quantity must be a non-negative integer",
    });
  }

  if (
    reason !== undefined &&
    reason !== null &&
    (typeof reason !== "string" || reason.length > 255)
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "Reason must be a string with a maximum length of 255 characters",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT id, part_name, part_number, quantity FROM inventory WHERE id = ? FOR UPDATE",
      [id],
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Inventory item not found",
      });
    }

    const previousQuantity = rows[0].quantity;

    if (previousQuantity !== quantity) {
      await connection.execute(
        "UPDATE inventory SET quantity = ? WHERE id = ?",
        [quantity, id],
      );

      await connection.execute(
        `INSERT INTO stock_movements
  (inventory_id, movement_type, quantity,
   previous_quantity, new_quantity, reason, performed_by)
        VALUES (?, 'adjustment', ?, ?, ?, ?, ?)`,
        [
          id,
          Math.abs(quantity - previousQuantity),
          previousQuantity,
          quantity,
          reason?.trim() || null,
          req.user.id,
        ],
      );
    }

    await connection.commit();

    return res.status(200).json({
      status: "ok",
      message: "Inventory stock updated successfully",
      inventory: {
        id,
        part_name: rows[0].part_name,
        part_number: rows[0].part_number,
        quantity,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Failed to update inventory stock:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to update inventory stock",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Handle stock in for an inventory item
export const stockIn = async (req, res) => {
  const id = Number(req.params.id);
  const { quantity, reason } = req.body;

  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid inventory ID",
    });
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Quantity must be a positive integer",
    });
  }

  if (
    reason !== undefined &&
    reason !== null &&
    (typeof reason !== "string" || reason.length > 255)
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "Reason must be a string with a maximum length of 255 characters",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT id, part_name, part_number, quantity FROM inventory WHERE id = ? FOR UPDATE",
      [id],
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Inventory item not found",
      });
    }

    const previousQuantity = rows[0].quantity;
    const newQuantity = previousQuantity + quantity;

    if (!Number.isSafeInteger(newQuantity) || newQuantity > 2147483647) {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: "Resulting stock quantity exceeds the allowed limit",
      });
    }

    await connection.execute("UPDATE inventory SET quantity = ? WHERE id = ?", [
      newQuantity,
      id,
    ]);

    await connection.execute(
      `INSERT INTO stock_movements
      (inventory_id, movement_type, quantity,
       previous_quantity, new_quantity, reason, performed_by)
      VALUES (?, 'stock_in', ?, ?, ?, ?, ?)`,
      [
        id,
        quantity,
        previousQuantity,
        newQuantity,
        reason?.trim() || null,
        req.user.id,
      ],
    );

    await connection.commit();

    return res.status(200).json({
      status: "ok",
      message: "Stock received successfully",
      inventory: {
        id,
        part_name: rows[0].part_name,
        part_number: rows[0].part_number,
        previous_quantity: previousQuantity,
        quantity_added: quantity,
        new_quantity: newQuantity,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Failed to receive stock:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Failed to receive stock",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Handle stock out for an inventory item
export const stockOut = async (req, res) => {
  const id = Number(req.params.id);
  const { quantity, reason } = req.body;

  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid inventory ID",
    });
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Quantity must be a positive integer",
    });
  }

  if (
    reason !== undefined &&
    reason !== null &&
    (typeof reason !== "string" || reason.length > 255)
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "Reason must be a string with a maximum length of 255 characters",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT id, part_name, part_number, quantity FROM inventory WHERE id = ? FOR UPDATE",
      [id],
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "Inventory item not found",
      });
    }

    const previousQuantity = rows[0].quantity;

    if (quantity > previousQuantity) {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: "Insufficient stock available",
        available_quantity: previousQuantity,
        requested_quantity: quantity,
      });
    }

    const newQuantity = previousQuantity - quantity;

    await connection.execute("UPDATE inventory SET quantity = ? WHERE id = ?", [
      newQuantity,
      id,
    ]);

    await connection.execute(
      `INSERT INTO stock_movements
      (inventory_id, movement_type, quantity,
       previous_quantity, new_quantity, reason, performed_by)
      VALUES (?, 'stock_out', ?, ?, ?, ?, ?)`,
      [
        id,
        quantity,
        previousQuantity,
        newQuantity,
        reason?.trim() || null,
        req.user.id,
      ],
    );

    await connection.commit();

    return res.status(200).json({
      status: "ok",
      message: "Stock issued successfully",
      inventory: {
        id,
        part_name: rows[0].part_name,
        part_number: rows[0].part_number,
        previous_quantity: previousQuantity,
        quantity_removed: quantity,
        new_quantity: newQuantity,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Failed to issue stock:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Failed to issue stock",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Get stock movements for an inventory item
export const getStockMovements = async (req, res) => {
  const id = Number(req.params.id);

  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid inventory ID",
    });
  }

  try {
    const [items] = await pool.execute(
      "SELECT id FROM inventory WHERE id = ?",
      [id],
    );

    if (items.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Inventory item not found",
      });
    }

    const [movements] = await pool.execute(
      `SELECT
        sm.id,
        sm.inventory_id,
        sm.movement_type,
        sm.service_job_id,
        sm.quantity,
        sm.previous_quantity,
        sm.new_quantity,
        sm.reason,
        sm.performed_by,
        u.first_name,
        u.last_name,
        sm.created_at
      FROM stock_movements sm
      LEFT JOIN users u ON sm.performed_by = u.id
      WHERE sm.inventory_id = ?
      ORDER BY sm.created_at DESC, sm.id DESC`,
      [id],
    );

    return res.status(200).json({
      status: "ok",
      count: movements.length,
      movements,
    });
  } catch (error) {
    console.error("Failed to retrieve stock movements:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve stock movements",
    });
  }
};

// Delete an inventory item
export const deleteInventory = async (req, res) => {
  const id = Number(req.params.id);

  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid inventory ID",
    });
  }

  try {
    const [result] = await pool.execute("DELETE FROM inventory WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Inventory item not found",
      });
    }

    res.status(200).json({
      status: "ok",
      message: "Inventory item deleted successfully",
      inventoryId: id,
    });
  } catch (error) {
    console.error("Failed to delete inventory item:", error.message);

    if(error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.errno === 1451
    ){
return res.status(409).json({
  status: "error",
  message:
    "Cannot delete this inventory item because it is referenced by existing service records or stock movements.",
});
    }

    res.status(500).json({
      status: "error",
      message: "Failed to delete inventory item",
    });
  }
};
