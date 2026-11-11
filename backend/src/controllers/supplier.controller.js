import pool from "../config/db.js";

//get all suppliers
export const getSuppliers = async (req, res) => {
  try {
    const sql = `
      SELECT
        id,
        supplier_name,
        contact_person,
        phone,
        email,
        address,
        created_at
      FROM suppliers
      ORDER BY id
    `;

    const [rows] = await pool.query(sql);

    return res.status(200).json({
      status: "ok",
      count: rows.length,
      suppliers: rows,
    });
  } catch (error) {
    console.error("Get suppliers error:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

//get supplier by id
export const getSupplierById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid supplier ID",
      });
    }

    const sql = `
      SELECT
        id,
        supplier_name,
        contact_person,
        phone,
        email,
        address,
        created_at
      FROM suppliers
      WHERE id = ?
    `;

    const [rows] = await pool.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Supplier not found",
      });
    }

    return res.status(200).json({
      status: "ok",
      supplier: rows[0],
    });
  } catch (error) {
    console.error("Get supplier by ID error:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

//create supplier
export const createSupplier = async (req, res) => {
  try {
    const { supplier_name, contact_person, phone, email, address } = req.body;

    if (
      typeof supplier_name !== "string" ||
      !supplier_name.trim() ||
      supplier_name.trim().length > 150
    ) {
      return res.status(400).json({
        status: "error",
        message: "Valid supplier name is required (maximum 150 characters)",
      });
    }

    if (
      contact_person !== undefined &&
      contact_person !== null &&
      (typeof contact_person !== "string" || contact_person.length > 100)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Contact person must be a string (maximum 100 characters)",
      });
    }

    if (
      phone !== undefined &&
      phone !== null &&
      (typeof phone !== "string" || phone.length > 20)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Phone must be a string (maximum 20 characters)",
      });
    }

    if (
      email !== undefined &&
      email !== null &&
      (typeof email !== "string" || email.length > 150)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Email must be a string (maximum 150 characters)",
      });
    }

    if (
      address !== undefined &&
      address !== null &&
      typeof address !== "string"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Address must be a string",
      });
    }

    const sql = `
      INSERT INTO suppliers
      (supplier_name, contact_person, phone, email, address)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(sql, [
      supplier_name.trim(),
      contact_person?.trim() || null,
      phone?.trim() || null,
      email?.trim() || null,
      address?.trim() || null,
    ]);

    return res.status(201).json({
      status: "success",
      message: "Supplier created successfully",
      supplier: {
        id: result.insertId,
        supplier_name: supplier_name.trim(),
        contact_person: contact_person?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
      },
    });
  } catch (error) {
    console.error("Create supplier error:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

//update supplier
export const updateSupplier = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid supplier ID",
      });
    }

    const { supplier_name, contact_person, phone, email, address } = req.body;

    if (
      typeof supplier_name !== "string" ||
      !supplier_name.trim() ||
      supplier_name.trim().length > 150
    ) {
      return res.status(400).json({
        status: "error",
        message: "Valid supplier name is required (maximum 150 characters)",
      });
    }

    if (
      contact_person !== undefined &&
      contact_person !== null &&
      (typeof contact_person !== "string" || contact_person.length > 100)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Contact person must be a string (maximum 100 characters)",
      });
    }

    if (
      phone !== undefined &&
      phone !== null &&
      (typeof phone !== "string" || phone.length > 20)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Phone must be a string (maximum 20 characters)",
      });
    }

    if (
      email !== undefined &&
      email !== null &&
      (typeof email !== "string" || email.length > 150)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Email must be a string (maximum 150 characters)",
      });
    }

    if (
      address !== undefined &&
      address !== null &&
      typeof address !== "string"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Address must be a string",
      });
    }

    const sql = `
      UPDATE suppliers
      SET
        supplier_name = ?,
        contact_person = ?,
        phone = ?,
        email = ?,
        address = ?
      WHERE id = ?
    `;

    const [result] = await pool.query(sql, [
      supplier_name.trim(),
      contact_person?.trim() || null,
      phone?.trim() || null,
      email?.trim() || null,
      address?.trim() || null,
      id,
    ]);

    if (result.affectedRows === 0) {
      const [rows] = await pool.query("SELECT id FROM suppliers WHERE id = ?", [
        id,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Supplier not found",
        });
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Supplier updated successfully",
    });
  } catch (error) {
    console.error("Update supplier error:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

//delete supplier
export const deleteSupplier = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid supplier ID",
      });
    }

    const sql = "DELETE FROM suppliers WHERE id = ?";
    const [result] = await pool.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Supplier not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Delete supplier error:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};