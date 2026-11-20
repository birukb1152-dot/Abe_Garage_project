import pool from "../config/db.js";

//get service jobs

export const getServiceJobs = async (req, res) => {
  try {
    const { status, vehicle_id, search, page = "1", limit = "10" } = req.query;

    // Validate pagination parameters
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (
      typeof page !== "string" ||
      page.trim() === "" ||
      !Number.isSafeInteger(pageNumber) ||
      pageNumber <= 0
    ) {
      return res.status(400).json({
        status: "error",
        message: "Page must be a positive integer",
      });
    }

    if (
      typeof limit !== "string" ||
      limit.trim() === "" ||
      !Number.isSafeInteger(limitNumber) ||
      limitNumber <= 0 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        status: "error",
        message: "Limit must be an integer between 1 and 100",
      });
    }

    const allowedStatuses = [
      "pending",
      "in_progress",
      "completed",
      "cancelled",
    ];

    // Validate status
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Valid job status required",
      });
    }

    // Validate vehicle ID
    let vehicleId;

    if (vehicle_id !== undefined) {
      vehicleId = Number(vehicle_id);

      if (
        typeof vehicle_id !== "string" ||
        vehicle_id.trim() === "" ||
        !/^[1-9]\d*$/.test(vehicle_id) ||
        !Number.isSafeInteger(vehicleId)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Valid vehicle ID required",
        });
      }
    }

    // Build the filtering conditions
    const conditions = [];
    const params = [];

    // Mechanics can only view jobs assigned to them
    if (req.user.role === "mechanic") {
      conditions.push("sj.assigned_mechanic_id = ?");
      params.push(req.user.id);
    }

    if (status !== undefined) {
      conditions.push("sj.status = ?");
      params.push(status);
    }

    if (vehicle_id !== undefined) {
      conditions.push("sj.vehicle_id = ?");
      params.push(vehicleId);
    }

    if (search !== undefined) {
      if (typeof search !== "string" || search.trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "Search term must be a non-empty string",
        });
      }

      const searchTerm = `%${search.trim()}%`;

      conditions.push(`(
        v.plate_number LIKE ? 
        OR c.first_name LIKE ?
        OR c.last_name LIKE ?
        )`);

      params.push(searchTerm, searchTerm, searchTerm);
    }

    let whereClause = "";

    if (conditions.length > 0) {
      whereClause = ` WHERE ${conditions.join(" AND ")}`;
    }

    // Count all jobs matching the filters
    const countSql = `
      SELECT COUNT(*) AS total
      FROM service_jobs sj
      INNER JOIN vehicles v ON sj.vehicle_id = v.id
      INNER JOIN customers c ON v.customer_id = c.id
      ${whereClause}
    `;

    const [countRows] = await pool.execute(countSql, params);
    const total = Number(countRows[0].total);

    // Calculate pagination
    const offset = (pageNumber - 1) * limitNumber;
    const totalPages = Math.ceil(total / limitNumber);

    // Retrieve jobs for the requested page
    const sql = `
      SELECT
        sj.id,
        sj.vehicle_id,
        sj.job_description,
        sj.status,
        sj.start_date,
        sj.completion_date,
        sj.created_at,
        sj.assigned_mechanic_id,
        v.plate_number,
        v.make,
        v.model,
        c.id AS customer_id,
        c.first_name AS customer_first_name,
        c.last_name AS customer_last_name,
        c.phone AS customer_phone
      FROM service_jobs sj
      INNER JOIN vehicles v ON sj.vehicle_id = v.id
      INNER JOIN customers c ON v.customer_id = c.id
      ${whereClause}
      ORDER BY sj.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.execute(sql, [...params, limitNumber, offset]);

    return res.status(200).json({
      status: "ok",
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1 && total > 0,
      },
      count: rows.length,
      serviceJobs: rows,
    });
  } catch (error) {
    console.error("Failed to get service jobs", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to get service jobs",
    });
  }
};

//get one service job
export const getServiceJob = async(req,res)=>{
    try {
        const {id: rawId }= req.params;
        const id = Number(rawId);

        if(typeof rawId !== "string" ||
          rawId.trim() === "" ||
          !/^[1-9]\d*$/.test(rawId)||
          !Number.isSafeInteger(id) ){
            return res.status(400).json({
                status:"error",
                message:"Invalid service job ID"
            })
        };

         const sql = `SELECT 
        sj.id,
        sj.vehicle_id,
        sj.job_description,
        sj.status,
        sj.start_date,
        sj.completion_date,
        sj.created_at,
        sj.assigned_mechanic_id,
        v.plate_number,
        v.make,
        v.model,
        c.id AS customer_id,
        c.first_name AS customer_first_name,
        c.last_name AS customer_last_name,
        c.phone AS customer_phone
        
        FROM service_jobs sj
        INNER JOIN vehicles v ON sj.vehicle_id = v.id
        INNER JOIN customers c ON v.customer_id = c.id
        WHERE sj.id = ?
        ${req.user.role === "mechanic" ? "AND sj.assigned_mechanic_id = ?" : ""}`;
        
        const params = [id];

        if (req.user.role === "mechanic") {
          params.push(req.user.id);
        }

        const [rows] = await pool.execute(sql,params);

        if(rows.length === 0){
            return res.status(404).json({
                status:"error",
                message:"Service job not found"
            })
        };

        res.status(200).json({
            status:"ok",
            serviceJob:rows[0]
        })
    } catch (error) {
        console.error("Failed to get service job",error);

        return res.status(500).json({
            status:"error",
            message:"Failed to get service job"
        })
    }
}

//create (post) service jobs

export const createServiceJob = async (req, res) => {
  try {
    const {
      vehicle_id,
      job_description,
      status,
      start_date,
      assigned_mechanic_id,
    } = req.body;

    const vehicleId = Number(vehicle_id);

    // Validate vehicle ID
    if (
      (typeof vehicle_id !== "string" && typeof vehicle_id !== "number") ||
      (typeof vehicle_id === "string" && !/^[1-9]\d*$/.test(vehicle_id)) ||
      !Number.isSafeInteger(vehicleId) ||
      vehicleId <= 0
    ) {
      return res.status(400).json({
        status: "error",
        message: "Valid vehicle ID required",
      });
    }

    // Validate job description
    if (typeof job_description !== "string" || job_description.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Job description required",
      });
    }

    if (job_description.trim().length > 5000) {
      return res.status(400).json({
        status: "error",
        message: "Job description cannot exceed 5000 characters",
      });
    }

    // Validate start date
    if (start_date !== undefined && start_date !== null) {
      if (
        typeof start_date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(start_date)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Start date must use YYYY-MM-DD format",
        });
      }

      const date = new Date(`${start_date}T00:00:00Z`);

      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== start_date
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid start date",
        });
      }
    }

    // Validate status
    const allowedStatuses = [
      "pending",
      "in_progress",
      "completed",
      "cancelled",
    ];

    const jobStatus = status ?? "pending";

    if (!allowedStatuses.includes(jobStatus)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid job status",
      });
    }

    // Only admins can assign mechanics
    if (assigned_mechanic_id !== undefined && req.user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Only admins can assign mechanics",
      });
    }

    // Validate assigned mechanic ID
    let mechanicId = null;

    if (
      req.user.role === "admin" &&
      assigned_mechanic_id !== undefined &&
      assigned_mechanic_id !== null
    ) {
      mechanicId = Number(assigned_mechanic_id);

      if (
        (typeof assigned_mechanic_id !== "string" &&
          typeof assigned_mechanic_id !== "number") ||
        (typeof assigned_mechanic_id === "string" &&
          !/^[1-9]\d*$/.test(assigned_mechanic_id)) ||
        !Number.isSafeInteger(mechanicId) ||
        mechanicId <= 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "Valid mechanic ID required",
        });
      }
    }

    // Check whether vehicle exists
    const [vehicles] = await pool.execute(
      "SELECT id FROM vehicles WHERE id = ?",
      [vehicleId],
    );

    if (vehicles.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Vehicle not found",
      });
    }

    // Check whether assigned user is an active mechanic
    if (mechanicId !== null) {
      const [mechanics] = await pool.execute(
        `SELECT id FROM users
         WHERE id = ?
         AND role = 'mechanic'
         AND is_active = TRUE`,
        [mechanicId],
      );

      if (mechanics.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Assigned user must be an active mechanic",
        });
      }
    }

    // Create service job
    const sql = `
      INSERT INTO service_jobs (
        vehicle_id,
        job_description,
        status,
        start_date,
        completion_date,
        assigned_mechanic_id
      )
      VALUES (?, ?, ?, ?, CASE WHEN ? = 'completed' THEN CURDATE() ELSE NULL END, ?)
    `;

    const [result] = await pool.execute(sql, [
      vehicleId,
      job_description.trim(),
      jobStatus,
      start_date ?? null,
      jobStatus,
      mechanicId,
    ]);

    // Fetch created service job
    const [createdJobs] = await pool.execute(
      `SELECT
        sj.id,
        sj.vehicle_id,
        sj.job_description,
        sj.status,
        sj.start_date,
        sj.completion_date,
        sj.created_at,
        sj.assigned_mechanic_id,
        v.plate_number,
        v.make,
        v.model,
        c.id AS customer_id,
        c.first_name AS customer_first_name,
        c.last_name AS customer_last_name,
        c.phone AS customer_phone
       FROM service_jobs sj
       INNER JOIN vehicles v ON sj.vehicle_id = v.id
       INNER JOIN customers c ON v.customer_id = c.id
       WHERE sj.id = ?`,
      [result.insertId],
    );

    return res.status(201).json({
      status: "ok",
      message: "Service job created successfully",
      serviceJob: createdJobs[0],
    });
  } catch (error) {
    console.error("Failed to create service job", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to create service job",
    });
  }
};


//update (put) service job


export const updateServiceJob = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vehicle_id,
      job_description,
      status,
      start_date,
      assigned_mechanic_id,
    } = req.body;

    // Validate service job ID
    const jobId = Number(id);

    if (
      typeof id !== "string" ||
      id.trim() === "" ||
      !/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(jobId)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Valid service job ID required",
      });
    }

    // Mechanics can only update status
    if (
      req.user.role === "mechanic" &&
      (vehicle_id !== undefined ||
        job_description !== undefined ||
        start_date !== undefined ||
        assigned_mechanic_id !== undefined)
    ) {
      return res.status(403).json({
        status: "error",
        message: "Mechanics can only update service job status",
      });
    }

    // Status is required
    if (status === undefined) {
      return res.status(400).json({
        status: "error",
        message: "Status is required",
      });
    }

    // Admin must provide the required job details
    if (req.user.role !== "mechanic") {
      if (
        vehicle_id === undefined ||
        job_description === undefined ||
        start_date === undefined
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "vehicle_id, job_description, status, and start_date are required",
        });
      }
    }

    // Validate status
    const allowedStatuses = [
      "pending",
      "in_progress",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid job status",
      });
    }

    let vehicleId;
    let mechanicId;

    if (req.user.role !== "mechanic") {
      // Validate vehicle ID
      vehicleId = Number(vehicle_id);

      if (
        (typeof vehicle_id !== "string" && typeof vehicle_id !== "number") ||
        (typeof vehicle_id === "string" && !/^[1-9]\d*$/.test(vehicle_id)) ||
        !Number.isSafeInteger(vehicleId) ||
        vehicleId <= 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "Valid vehicle ID required",
        });
      }

      // Validate job description
      if (
        typeof job_description !== "string" ||
        job_description.trim() === ""
      ) {
        return res.status(400).json({
          status: "error",
          message: "Job description required",
        });
      }

      if (job_description.trim().length > 5000) {
        return res.status(400).json({
          status: "error",
          message: "Job description cannot exceed 5000 characters",
        });
      }

      // Validate start date
      if (start_date !== null) {
        if (
          typeof start_date !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(start_date)
        ) {
          return res.status(400).json({
            status: "error",
            message: "Start date must use YYYY-MM-DD format or be null",
          });
        }

        const date = new Date(`${start_date}T00:00:00Z`);

        if (
          Number.isNaN(date.getTime()) ||
          date.toISOString().slice(0, 10) !== start_date
        ) {
          return res.status(400).json({
            status: "error",
            message: "Invalid start date",
          });
        }
      }

      // Check whether vehicle exists
      const [vehicles] = await pool.execute(
        "SELECT id FROM vehicles WHERE id = ?",
        [vehicleId],
      );

      if (vehicles.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Vehicle not found",
        });
      }

      // Validate mechanic assignment if supplied
      if (assigned_mechanic_id !== undefined) {
        mechanicId = null;

        if (assigned_mechanic_id !== null) {
          mechanicId = Number(assigned_mechanic_id);

          if (
            (typeof assigned_mechanic_id !== "string" &&
              typeof assigned_mechanic_id !== "number") ||
            (typeof assigned_mechanic_id === "string" &&
              !/^[1-9]\d*$/.test(assigned_mechanic_id)) ||
            !Number.isSafeInteger(mechanicId) ||
            mechanicId <= 0
          ) {
            return res.status(400).json({
              status: "error",
              message: "Valid mechanic ID required",
            });
          }

          const [mechanics] = await pool.execute(
            `SELECT id FROM users
             WHERE id = ?
             AND role = 'mechanic'
             AND is_active = TRUE`,
            [mechanicId],
          );

          if (mechanics.length === 0) {
            return res.status(400).json({
              status: "error",
              message: "Assigned user must be an active mechanic",
            });
          }
        }
      }
    }

    // Check whether service job exists
    const [jobs] = await pool.execute(
      "SELECT id, status, assigned_mechanic_id FROM service_jobs WHERE id = ?",
      [jobId],
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Service job not found",
      });
    }

    // Mechanics can only update their assigned jobs
    if (
      req.user.role === "mechanic" &&
      Number(jobs[0].assigned_mechanic_id) !== Number(req.user.id)
    ) {
      return res.status(404).json({
        status: "error",
        message: "Service job not found",
      });
    }

    // Update service job according to role
    if (req.user.role === "mechanic") {
      await pool.execute(
        `UPDATE service_jobs
         SET completion_date = CASE
           WHEN ? <> 'completed' THEN NULL
           WHEN status <> 'completed' THEN CURDATE()
           ELSE COALESCE(completion_date, CURDATE())
         END,
         status = ?
         WHERE id = ?`,
        [status, status, jobId],
      );
    } else {
      // Build admin update query
      let sql = `
        UPDATE service_jobs
        SET completion_date = CASE
          WHEN ? <> 'completed' THEN NULL
          WHEN status <> 'completed' THEN CURDATE()
          ELSE COALESCE(completion_date, CURDATE())
        END,
        vehicle_id = ?,
        job_description = ?,
        status = ?,
        start_date = ?
      `;

      const params = [
        status,
        vehicleId,
        job_description.trim(),
        status,
        start_date,
      ];

      // Change assignment only when the field is supplied
      if (assigned_mechanic_id !== undefined) {
        sql += ", assigned_mechanic_id = ?";
        params.push(mechanicId);
      }

      sql += " WHERE id = ?";
      params.push(jobId);

      await pool.execute(sql, params);
    }

    // Fetch updated service job
    const [updatedJobs] = await pool.execute(
      `SELECT
        sj.id,
        sj.vehicle_id,
        sj.job_description,
        sj.status,
        sj.start_date,
        sj.completion_date,
        sj.created_at,
        sj.assigned_mechanic_id,
        v.plate_number,
        v.make,
        v.model,
        c.id AS customer_id,
        c.first_name AS customer_first_name,
        c.last_name AS customer_last_name,
        c.phone AS customer_phone
       FROM service_jobs sj
       INNER JOIN vehicles v ON sj.vehicle_id = v.id
       INNER JOIN customers c ON v.customer_id = c.id
       WHERE sj.id = ?`,
      [jobId],
    );

    return res.status(200).json({
      status: "ok",
      message: "Service job updated successfully",
      serviceJob: updatedJobs[0],
    });
  } catch (error) {
    console.error("Failed to update service job", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to update service job",
    });
  }
};



//delete service job
export const deleteServiceJob = async(req,res)=>{
  try {
    const {id}  = req.params;

    const jobId = Number(id);

    if(typeof id !== "string" ||
      id.trim() === "" ||
      !/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(jobId)){
      return res.status(400).json({
        status:"error",
        message:"Valid job service id required"
      })
    }

    const [jobs] = await pool.execute(`SELECT id FROM service_jobs WHERE id = ?`,[jobId]);

    if(jobs.length === 0){
      return res.status(404).json({
        status:"error",
        message:"Service job not found"
      })
    }

    await pool.execute(`DELETE FROM service_jobs WHERE id = ?`,[jobId]);

    return res.status(200).json({
      status: "ok",
      message: "Service job deleted successfully",
    });


  } catch (error) {
    if(
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.errno === 1451
    ){
      return res.status(409).json({
        status:"error",
        message:"Cannot delete this service job because it has associated parts or stock movements.",
      })
    }
    console.error("Failed to delete service job",error);

    return res.status(500).json({
      status:"error",
      message:"Failed to delete service job"
    })
  }
}