import pool from '../config/db.js';


//get all customers
export const getCustomer = async (req, res) => {
  try {
    const sql = `SELECT id, first_name, last_name, phone FROM customers ORDER BY id`;

    const [rows] = await pool.query(sql);
    res.status(200).json({
      status: "ok",
      count: rows.length,
      customers: rows,
    });
  } catch (error) {
    console.error("Failed to fetch customers:", error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch customers",
    });
  }
};

//get one customer 
export const getCustomerById = async (req, res) => {
  const id = Number(req.params.id);

  if (!/^[1-9]\d*$/.test(req.params.id)||
    !Number.isSafeInteger(id)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid customer ID",
    });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT id, first_name , last_name, phone , created_at FROM customers WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }

    res.status(200).json({
      status: "ok",
      customer: rows[0],
    });
  } catch (error) {
    console.error("Failed to get customer", error);

    res.status(500).json({
      status: "error",
      message: "Failed to get customer",
    });
  }
};


//post (create) customers
export const createCustomer = async (req, res) => {
  const { first_name, last_name, phone } = req.body;

  if (
    typeof first_name !== "string" ||
    typeof last_name !== "string" ||
    typeof phone !== "string" ||
    !first_name.trim() ||
    !last_name.trim() ||
    !phone.trim()
  ) {
    return res.status(400).json({
      status: "error",
      message: "First name , last name and phone are required",
    });
  }

  
  if (
    first_name.trim().length > 50 ||
    last_name.trim().length > 50 ||
    phone.trim().length > 20
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "First name must be at most 50 characters, last name at most 50 characters, and phone at most 20 characters",
    });
  }

  
if (!/^\+251[1-9]\d{8}$/.test(phone.trim())) {
  return res.status(400).json({
    status: "error",
    message:"Phone number must use Ethiopian international format, e.g. +251912345678",
  });
}


  try {
    const sql = `INSERT INTO customers (first_name, last_name, phone) VALUES (?,?,?)`;

    const values = [first_name.trim(), last_name.trim(), phone.trim()];

    const [result] = await pool.execute(sql, values);

    res.status(201).json({
      status: "ok",
      message: "customers created successfully",
      customerId: {
        id: result.insertId,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
      },
    });
  } catch (error) {
    console.error("Failed to create customers:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to create customers",
    });
  }
};

//update (PUT) customer by id
export const updateCustomer = async (req, res) => {
  const id = Number(req.params.id);
  const { first_name, last_name, phone } = req.body;

  if (!/^[0-9]\d*$/.test(req.params.id) ||
  !Number.isSafeInteger(id)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid customer ID",
    });
  }

  if (
    typeof first_name !== "string" ||
    typeof last_name !== "string" ||
    typeof phone !== "string" ||
    !first_name.trim() ||
    !last_name.trim() ||
    !phone.trim()
  ) {
    return res.status(400).json({
      status: "error",
      message: "First name, last name and phone are required",
    });
  }

  if (
    first_name.trim().length > 50 ||
    last_name.trim().length > 50 ||
    phone.trim().length > 20
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "First name must be at most 50 characters, last name at most 50 characters, and phone at most 20 characters",
    });
  }

  if (!/^\+251[1-9]\d{8}$/.test(phone.trim())) {
    return res.status(400).json({
      status: "error",
      message:"Phone number must use Ethiopian international format, e.g. +251912345678",
    });
  }

  try {
    const sql = `
      UPDATE customers
      SET first_name = ?, last_name = ?, phone = ?
      WHERE id = ?
    `;

    const values = [first_name.trim(), last_name.trim(), phone.trim(), id];

    const [result] = await pool.execute(sql, values);

    if (result.affectedRows === 0) {
      const [rows] = await pool.execute(
        "SELECT id FROM customers WHERE id = ?",
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Customer not found",
        });
      }
    }

    res.status(200).json({
      status: "ok",
      message: "Customer updated successfully",
      customer: {
        id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
      },
    });
  } catch (error) {
    console.error("Failed to update customer:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to update customer",
    });
  }
};


//delete customers by id
export const deleteCustomer = async (req, res) => {
  const id = Number(req.params.id);

  if (!/^[1-9]\d*$/.test(req.params.id)||
    !Number.isSafeInteger(id)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid customer ID",
    });
  }

  try {
    const [result] = await pool.execute("DELETE FROM customers WHERE id=?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "customer not found",
      });
    }

    res.status(200).json({
      status: "ok",
      message: "Customer successfully deleted",
      customerId: id,
    });
  } catch (err) {
    console.error("Failed to delete customer:", err.message);

    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        status: "error",
        message:"Cannot delete this customer because related records exist. Remove or reassign the related records first.",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Failed to delete customer",
    });
  }
};