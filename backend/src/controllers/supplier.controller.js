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

    const normalizedEmail = email?.trim() || null;

    if(normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ){
      return res.status(400).json({
        status:"error",
        message:"Please provide a valid email address",
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
      normalizedEmail,
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
        email: normalizedEmail,
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

    const { supplier_name, contact_person, phone, email, address } = req.body ?? {};

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

    const normalizedEmail = email?.trim() || null;

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a valid email address",
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

    const [existingRows] = await pool.query(
      "SELECT * FROM suppliers WHERE id = ?",
      [id]
    );

    if(existingRows.length === 0){
      return res.status(400).json({
        status:"error",
        message:"Supplier not found",
      });
    }

    const existingSupplier = existingRows[0];

    const updatedContactPerson = 
    contact_person === undefined
    ? existingSupplier.contact_person
    : contact_person?.trim() || null;

    const updatedPhone =
    phone === undefined
    ? existingSupplier.phone
    : phone?.trim() || null;

    const updatedEmail =
    email === undefined ? existingSupplier.email : normalizedEmail;

    const updatedAddress =
    address === undefined
    ? existingSupplier.address
    : address?.trim() || null;

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

    await pool.query(sql,[
      supplier_name.trim(),
      updatedContactPerson,
      updatedPhone,
      updatedEmail,
      updatedAddress,
      id,
    ]);

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

    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.errno === 1451
    ) {
      return res.status(409).json({
        status: "error",
        message:
          "Cannot delete this supplier because inventory items are linked to it.",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};