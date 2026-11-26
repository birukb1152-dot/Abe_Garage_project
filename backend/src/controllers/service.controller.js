import pool from "../config/db.js";

// Admin creates a new garage service
export const createService = async (req, res, next) => {
  try {
    const { service_name, description, price, estimated_duration } = req.body;

    if (
      typeof service_name !== "string" ||
      !service_name.trim() ||
      service_name.trim().length > 100
    ) {
      return res.status(400).json({
        status: "error",
        message: "Valid service_name is required (maximum 100 characters)",
      });
    }

    if (
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !/^\d+(\.\d{1,2})?$/.test(String(price))
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Price must be a non-negative number with up to 2 decimal places",
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Description must be a string",
      });
    }

    if (
      estimated_duration !== undefined &&
      estimated_duration !== null &&
      (!Number.isSafeInteger(estimated_duration) || estimated_duration <= 0)
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Estimated duration must be a positive whole number of minutes",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO services
       (service_name, description, price, estimated_duration)
       VALUES (?, ?, ?, ?)`,
      [
        service_name.trim(),
        description?.trim() || null,
        price,
        estimated_duration ?? null,
      ],
    );

    return res.status(201).json({
      status: "success",
      message: "Service created successfully",
      service: {
        id: result.insertId,
        service_name: service_name.trim(),
        description: description?.trim() || null,
        price,
        estimated_duration: estimated_duration ?? null,
        is_active: 1,
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "A service with this name already exists",
      });
    }

    next(error);
  }
};
 
// Get all garage services
export const getServices = async (req, res, next) => {
  try {
    const [services] = await pool.execute(
      `SELECT
        id,
        service_name,
        description,
        price,
        estimated_duration,
        is_active,
        created_at,
        updated_at
       FROM services
       ORDER BY id DESC`
    );

    return res.status(200).json({
      status: "success",
      results: services.length,
      services,
    });
  } catch (error) {
    next(error);
  }
};

 
// Get one garage service by ID
export const getServiceById = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.id);

    if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid service ID",
      });
    }

    const [services] = await pool.execute(
      `SELECT
        id,
        service_name,
        description,
        price,
        estimated_duration,
        is_active,
        created_at,
        updated_at
       FROM services
       WHERE id = ?`,
      [serviceId]
    );

    if (services.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Service not found",
      });
    }

    return res.status(200).json({
      status: "success",
      service: services[0],
    });
  } catch (error) {
    next(error);
  }
};

 
// Admin updates service information
export const updateService = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.id);
    const { service_name, description, price, estimated_duration } = req.body;

    if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid service ID",
      });
    }

    const allowedFields = [
      "service_name",
      "description",
      "price",
      "estimated_duration",
    ];

    if (
      !allowedFields.some((field) =>
        Object.prototype.hasOwnProperty.call(req.body, field)
      )
    ) {
      return res.status(400).json({
        status: "error",
        message: "Provide at least one field to update",
      });
    }

    const [existing] = await pool.execute(
      "SELECT * FROM services WHERE id = ?",
      [serviceId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Service not found",
      });
    }

    const current = existing[0];

    const updatedName =
      service_name === undefined ? current.service_name : service_name;

    const updatedDescription =
      description === undefined ? current.description : description;

    const updatedPrice =
      price === undefined ? Number(current.price) : price;

    const updatedDuration =
      estimated_duration === undefined
        ? current.estimated_duration
        : estimated_duration;

    if (
      typeof updatedName !== "string" ||
      !updatedName.trim() ||
      updatedName.trim().length > 100
    ) {
      return res.status(400).json({
        status: "error",
        message: "Valid service name is required (maximum 100 characters)",
      });
    }

    if (
      updatedDescription !== null &&
      typeof updatedDescription !== "string"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Description must be a string or null",
      });
    }

    if (
      typeof updatedPrice !== "number" ||
      !Number.isFinite(updatedPrice) ||
      updatedPrice < 0 ||
      !/^\d+(\.\d{1,2})?$/.test(String(updatedPrice))
    ) {
      return res.status(400).json({
        status: "error",
        message: "Price must be a non-negative number with up to 2 decimal places",
      });
    }

    if (
      updatedDuration !== null &&
      (!Number.isSafeInteger(updatedDuration) || updatedDuration <= 0)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Estimated duration must be a positive whole number of minutes or null",
      });
    }

    await pool.execute(
      `UPDATE services
       SET service_name = ?,
           description = ?,
           price = ?,
           estimated_duration = ?
       WHERE id = ?`,
      [
        updatedName.trim(),
        updatedDescription === null
          ? null
          : updatedDescription.trim() || null,
        updatedPrice,
        updatedDuration,
        serviceId,
      ]
    );

    const [updated] = await pool.execute(
      `SELECT
        id, service_name, description, price,
        estimated_duration, is_active, created_at, updated_at
       FROM services
       WHERE id = ?`,
      [serviceId]
    );

    return res.status(200).json({
      status: "success",
      message: "Service updated successfully",
      service: updated[0],
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "A service with this name already exists",
      });
    }

    next(error);
  }
};


// Admin activates or deactivates a garage service
export const updateServiceStatus = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.id);
    const { is_active } = req.body;

    if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid service ID",
      });
    }

    if (is_active !== 0 && is_active !== 1 &&
        is_active !== true && is_active !== false) {
      return res.status(400).json({
        status: "error",
        message: "is_active must be 1 or 0",
      });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM services WHERE id = ?",
      [serviceId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Service not found",
      });
    }

    const activeValue = is_active === true || is_active === 1 ? 1 : 0;

    await pool.execute(
      "UPDATE services SET is_active = ? WHERE id = ?",
      [activeValue, serviceId]
    );

    return res.status(200).json({
      status: "success",
      message: "Service status updated successfully",
      service: {
        id: serviceId,
        is_active: activeValue,
      },
    });
  } catch (error) {
    next(error);
  }
};
